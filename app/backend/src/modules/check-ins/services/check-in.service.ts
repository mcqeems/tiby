import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyCheckIn } from '../entities/daily-check-in.entity.js';
import { MissedCheckInReport } from '../entities/missed-check-in-report.entity.js';
import { SafetyEvaluation } from '../../internal/rule-engine/entities/safety-evaluation.entity.js';
import { TreatmentPlan } from '../../patients/entities/treatment-plan.entity.js';
import { PmoAssignment } from '../../patients/entities/pmo-assignment.entity.js';
import { InterventionTicket } from '../../tickets/entities/intervention-ticket.entity.js';
import { FacilityAlert } from '../../alerts/entities/facility-alert.entity.js';
import { PatientStatusHistory } from '../../patients/entities/patient-status-history.entity.js';
import { AuditLog } from '../../internal/audit/entities/audit-log.entity.js';
import { AiClientService } from '../../internal/ai-client/ai-client.service.js';
import { RuleEngineService } from '../../internal/rule-engine/rule-engine.service.js';
import { NotificationTriggerEvent } from '../../../common/events/notification-trigger.event.js';
import {
  addDays,
  computeStreakStats,
  computeTargetEndDate,
} from '../../internal/escalation/streak-reconcile.js';
import { toDateString } from '../../stats/services/stats.service.js';
import type {
  AiAudioExtractionResponse,
  AiAudioTranscriptResponse,
  CheckInVerdictResponse,
  SubmitCheckInDto,
  TextExtractRequest,
  MedicationStatus,
  SafetyVerdict,
  ListCheckInsQuery,
  CheckInList,
  CheckInListItem,
  CreateMissedCheckInReportDto,
  MissedCheckInReportItem,
  MissedCheckInSummaryResponse,
  MissedReportStatus,
} from '@tiby/ts-shared';

@Injectable()
export class CheckInService {
  constructor(
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(SafetyEvaluation)
    private readonly evalRepo: Repository<SafetyEvaluation>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(InterventionTicket)
    private readonly ticketRepo: Repository<InterventionTicket>,
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(MissedCheckInReport)
    private readonly missedReportRepo: Repository<MissedCheckInReport>,
    private readonly aiClientService: AiClientService,
    private readonly ruleEngine: RuleEngineService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async resolvePlan(
    userId: string,
    role: string,
    treatmentPlanId?: string,
  ): Promise<TreatmentPlan> {
    if (role === 'PASIEN') {
      const plan = await this.planRepo.findOne({
        where: { patientUserId: userId },
        relations: { patientUser: true },
      });
      if (!plan) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'No active treatment plan found for patient',
        });
      }
      return plan;
    }

    if (role === 'PMO') {
      if (!treatmentPlanId) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'treatmentPlanId is required when PMO submits check-in',
        });
      }
      const assignment = await this.pmoRepo.findOne({
        where: { pmoUserId: userId, treatmentPlanId, active: true },
      });
      if (!assignment) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'PMO is not assigned to this treatment plan',
        });
      }
      const plan = await this.planRepo.findOne({
        where: { id: treatmentPlanId },
        relations: { patientUser: true },
      });
      if (!plan) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Treatment plan not found',
        });
      }
      return plan;
    }

    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: `Invalid role ${role} for check-in`,
    });
  }

  private findLastFulfilledBefore(
    treatmentPlanId: string,
    beforeDate: string,
  ): Promise<DailyCheckIn | null> {
    return this.checkInRepo.findOne({
      where: {
        treatmentPlanId,
        isDoseFulfilled: true,
        checkInDate: LessThan(beforeDate),
      },
      order: { checkInDate: 'DESC' },
    });
  }

  async checkIsLockedToday(
    treatmentPlanId: string,
    checkInDate: string,
  ): Promise<{
    checkIn: DailyCheckIn;
    evaluation: SafetyEvaluation | null;
  } | null> {
    const existing = await this.checkInRepo.findOne({
      where: {
        treatmentPlanId,
        checkInDate,
      },
      order: { attemptNumber: 'DESC', submittedAt: 'DESC', id: 'DESC' },
    });

    if (!existing) {
      return null;
    }

    const evaluation = await this.evalRepo.findOneBy({
      checkInId: existing.id,
    });

    // Only VERDICT TERKENDALI locks today's check-in; legacy/seeded rows without
    // an evaluation fall back to isDoseFulfilled.
    const isLocked = evaluation
      ? evaluation.verdict === 'TERKENDALI'
      : existing.isDoseFulfilled;

    if (isLocked) {
      throw new ConflictException({
        code: 'CHECK_IN_ALREADY_LOCKED',
        message: 'Check-in for today is already completed and locked.',
      });
    }

    return { checkIn: existing, evaluation: evaluation ?? null };
  }

  /**
   * Role-scoped read of daily check-ins.
   * PASIEN -> own plans, PMO -> assigned plans, NAKES -> plans in their
   * facility, ADMIN -> every facility.
   */
  async listCheckIns(
    caller: { id: string; role: string; facilityId?: string | null },
    query: ListCheckInsQuery,
  ): Promise<CheckInList> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Validate params before the empty-scope short-circuit: a forbidden
    // filter must 403 regardless of whether the caller has visible plans.
    if (query.facilityId && caller.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only ADMIN may filter by facility',
      });
    }

    const planIds = await this.resolveVisiblePlanIds(caller);

    // `In([])` is a footgun; short-circuit instead.
    if (planIds && planIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    if (query.treatmentPlanId) {
      if (planIds && !planIds.includes(query.treatmentPlanId)) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Treatment plan not found',
        });
      }
    }

    const where: FindOptionsWhere<DailyCheckIn> = {};
    if (planIds) where.treatmentPlanId = In(planIds);
    if (query.treatmentPlanId) where.treatmentPlanId = query.treatmentPlanId;
    if (query.medicationStatus) where.medicationStatus = query.medicationStatus;
    if (query.isDoseFulfilled !== undefined) {
      where.isDoseFulfilled = query.isDoseFulfilled;
    }
    if (query.from && query.to) {
      where.checkInDate = Between(query.from, query.to);
    } else if (query.from) {
      where.checkInDate = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.checkInDate = LessThanOrEqual(query.to);
    }
    if (query.facilityId) {
      where.treatmentPlan = { facilityId: query.facilityId };
    }

    const [records, total] = await this.checkInRepo.findAndCount({
      where,
      relations: { treatmentPlan: { patientUser: true, facility: true } },
      order: { checkInDate: 'DESC', submittedAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // One batched lookup, never one query per row.
    const evalRows = records.length
      ? await this.evalRepo.find({
          where: { checkInId: In(records.map((r) => r.id)) },
        })
      : [];
    const verdictByCheckIn = new Map(
      evalRows.map((e) => [e.checkInId, e.verdict as SafetyVerdict]),
    );

    const items: CheckInListItem[] = records.map((r) => ({
      id: r.id,
      treatmentPlanId: r.treatmentPlanId,
      patientUserId: r.treatmentPlan.patientUserId,
      patientName: r.treatmentPlan.patientUser?.name || 'Pasien',
      facilityId: r.treatmentPlan.facilityId,
      facilityName: r.treatmentPlan.facility?.name || '',
      checkInDate: r.checkInDate,
      attemptNumber: r.attemptNumber,
      reportedByRole: r.reportedByRole,
      inputMode: r.inputMode,
      medicationStatus: r.medicationStatus as MedicationStatus,
      pillsTakenCount: r.pillsTakenCount,
      isDoseFulfilled: r.isDoseFulfilled,
      sttConfidence: r.sttConfidence,
      submittedAt: r.submittedAt.toISOString(),
      verdict: verdictByCheckIn.get(r.id) ?? null,
    }));

    return { items, total, page, limit };
  }

  /**
   * `null` means "no plan restriction" (ADMIN). An empty array means the
   * caller legitimately has no visible plans.
   */
  private async resolveVisiblePlanIds(caller: {
    id: string;
    role: string;
    facilityId?: string | null;
  }): Promise<string[] | null> {
    if (caller.role === 'ADMIN') return null;

    if (caller.role === 'PASIEN') {
      const plans = await this.planRepo.find({
        where: { patientUserId: caller.id },
        select: { id: true },
      });
      return plans.map((p) => p.id);
    }

    if (caller.role === 'PMO') {
      const assignments = await this.pmoRepo.find({
        where: { pmoUserId: caller.id, active: true },
        select: { treatmentPlanId: true },
      });
      return assignments.map((a) => a.treatmentPlanId);
    }

    if (caller.role === 'NAKES') {
      // Guard the missing facility first: `null === null` must not match all.
      if (!caller.facilityId) return [];
      const plans = await this.planRepo.find({
        where: { facilityId: caller.facilityId },
        select: { id: true },
      });
      return plans.map((p) => p.id);
    }

    return [];
  }

  private toMissedReportDto(r: MissedCheckInReport): MissedCheckInReportItem {
    return {
      id: r.id,
      treatmentPlanId: r.treatmentPlanId,
      reportedDate: toDateString(r.reportedDate),
      status: r.status as MissedReportStatus,
      patientNote: r.patientNote ?? null,
      verifiedCheckInId: r.verifiedCheckInId ?? null,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private resolveTargetDate(
    plan: TreatmentPlan,
    role: string,
    requestedDate?: string,
  ): { today: string; targetDate: string; isRetroactive: boolean } {
    const today = new Date().toISOString().slice(0, 10);
    const targetDate = requestedDate || today;

    if (targetDate > today) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Cannot submit check-in for a future date',
      });
    }

    if (targetDate < today) {
      if (role !== 'PMO') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Hanya PMO yang dapat memverifikasi check-in tanggal terlewat.',
        });
      }
      if (plan.startDate && targetDate < toDateString(plan.startDate)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Tanggal check-in berada di luar periode pengobatan.',
        });
      }
    }

    return { today, targetDate, isRetroactive: targetDate < today };
  }

  async getMissedReportSummary(
    userId: string,
    role: string,
    treatmentPlanId?: string,
  ): Promise<MissedCheckInSummaryResponse> {
    const plan = await this.resolvePlan(userId, role, treatmentPlanId);
    const today = new Date().toISOString().slice(0, 10);
    const startDate = toDateString(plan.startDate);
    const yesterday = addDays(today, -1);

    const eligibleDates: string[] = [];
    if (startDate <= yesterday) {
      const fulfilledRows = await this.checkInRepo.find({
        where: {
          treatmentPlanId: plan.id,
          isDoseFulfilled: true,
          checkInDate: Between(startDate, yesterday),
        },
        select: { checkInDate: true },
      });
      const fulfilledSet = new Set(
        fulfilledRows.map((r) => toDateString(r.checkInDate)),
      );
      let cursor = yesterday;
      let guard = 0;
      while (cursor >= startDate && guard < 3650) {
        if (!fulfilledSet.has(cursor)) {
          eligibleDates.push(cursor);
        }
        cursor = addDays(cursor, -1);
        guard += 1;
      }
    }

    const reports = await this.missedReportRepo.find({
      where: { treatmentPlanId: plan.id },
      order: { reportedDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      startDate,
      currentStreak: plan.currentStreak,
      eligibleDates,
      reports: reports.map((r) => this.toMissedReportDto(r)),
    };
  }

  async createMissedReport(
    userId: string,
    role: string,
    dto: CreateMissedCheckInReportDto,
  ): Promise<MissedCheckInReportItem> {
    if (role !== 'PASIEN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Hanya pasien yang dapat mengajukan laporan lupa check-in.',
      });
    }

    const plan = await this.planRepo.findOne({
      where: { patientUserId: userId },
      relations: { patientUser: true },
    });
    if (!plan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'No active treatment plan found for patient',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const startDate = toDateString(plan.startDate);
    if (dto.reportedDate < startDate || dto.reportedDate >= today) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Tanggal terlewat harus antara awal pengobatan hingga kemarin.',
      });
    }

    const existingFulfilled = await this.checkInRepo.findOne({
      where: {
        treatmentPlanId: plan.id,
        checkInDate: dto.reportedDate,
        isDoseFulfilled: true,
      },
    });
    if (existingFulfilled) {
      throw new ConflictException({
        code: 'ALREADY_FULFILLED',
        message: 'Tanggal tersebut sudah memiliki catatan minum obat lengkap.',
      });
    }

    const existingPending = await this.missedReportRepo.findOne({
      where: {
        treatmentPlanId: plan.id,
        reportedDate: dto.reportedDate,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      throw new ConflictException({
        code: 'MISSED_REPORT_ALREADY_PENDING',
        message: 'Laporan untuk tanggal ini sudah dikirim dan menunggu verifikasi PMO.',
      });
    }

    const activePmos = await this.pmoRepo.find({
      where: { treatmentPlanId: plan.id, active: true },
    });
    if (activePmos.length === 0) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_PMO',
        message: 'Belum ada PMO aktif yang dapat memverifikasi laporan.',
      });
    }

    const cleanedNote = dto.patientNote?.trim() || null;
    const report = await this.missedReportRepo.save(
      this.missedReportRepo.create({
        treatmentPlanId: plan.id,
        reportedDate: dto.reportedDate,
        reportedByUserId: userId,
        patientNote: cleanedNote,
        status: 'PENDING',
      }),
    );

    const patientName = plan.patientUser?.name || 'Pasien';

    await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: 'MISSED_CHECKIN_REPORTED',
        previousState: plan.patientState,
        newState: plan.patientState,
        previousStreak: plan.currentStreak,
        newStreak: plan.currentStreak,
        actorUserId: userId,
        actorRole: role,
        reasonOrSummary: `Pasien melaporkan sudah minum obat pada ${dto.reportedDate} namun lupa check-in`,
        metadataJson: {
          missedReportId: report.id,
          reportedDate: dto.reportedDate,
        },
      }),
    );

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: userId,
        actorRole: role,
        action: 'CREATE_MISSED_CHECKIN_REPORT',
        targetEntity: 'missed_check_in_reports',
        targetId: report.id,
        metadataJson: {
          reportedDate: dto.reportedDate,
        },
      }),
    );

    const pmoMessage = cleanedNote
      ? `${patientName} melaporkan sudah minum obat pada ${dto.reportedDate} namun lupa check-in ("${cleanedNote}"). Verifikasi lewat Wakili Check-in.`
      : `${patientName} melaporkan sudah minum obat pada ${dto.reportedDate} namun lupa check-in. Verifikasi lewat Wakili Check-in.`;

    this.eventEmitter.emit(
      'notification.trigger',
      new NotificationTriggerEvent(
        'MISSED_CHECKIN_REPORT',
        plan.id,
        'PMO',
        undefined,
        undefined,
        pmoMessage,
        {
          missedReportId: report.id,
          reportedDate: dto.reportedDate,
          treatmentPlanId: plan.id,
          patientName,
        },
      ),
    );

    return this.toMissedReportDto(report);
  }

  private async recoverFromSilence(
    plan: TreatmentPlan,
    previousState: string,
    previousStreak: number,
    newStreak: number,
    userId: string,
    role: string,
    recoverySummary: string,
    alertMessage: string,
    ticketResolutionNotes: string,
  ): Promise<void> {
    plan.patientState = 'AKTIF';

    const openSilenceTickets = await this.ticketRepo.find({
      where: {
        treatmentPlanId: plan.id,
        triggerSource: 'SILENCE_H3',
        status: In(['OPEN', 'IN_PROGRESS']),
      },
    });

    for (const t of openSilenceTickets) {
      t.status = 'AUTO_CLOSED_BY_CHECKIN';
      t.closedAt = new Date();
      t.resolutionReason = 'PATIENT_CHECKED_IN_RECOVERED';
      t.resolutionNotes = ticketResolutionNotes;
      await this.ticketRepo.save(t);

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: 'TICKET_AUTO_CLOSED',
          previousState,
          newState: 'AKTIF',
          previousStreak,
          newStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: `Ticket ${t.id} auto-closed by recovered check-in`,
        }),
      );
    }

    await this.alertRepo.save(
      this.alertRepo.create({
        facilityId: plan.facilityId,
        treatmentPlanId: plan.id,
        alertType: 'SILENCE_RECOVERED_WARNING',
        severity: 'WARNING',
        title: 'Pasien Pulih dari Putus Kontak',
        message: alertMessage,
      }),
    );

    await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: 'STATE_TRANSITION',
        previousState,
        newState: 'AKTIF',
        previousStreak,
        newStreak,
        actorUserId: userId,
        actorRole: role,
        reasonOrSummary: recoverySummary,
      }),
    );
  }

  async extractAudioPreview(
    userId: string,
    role: string,
    file: Express.Multer.File,
    treatmentPlanId?: string,
    checkInDate?: string,
  ): Promise<AiAudioTranscriptResponse> {
    const plan = await this.resolvePlan(userId, role, treatmentPlanId);
    const { targetDate } = this.resolveTargetDate(plan, role, checkInDate);
    await this.checkIsLockedToday(plan.id, targetDate);

    return this.aiClientService.transcribeFromAudio(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  async extractTextPreview(
    userId: string,
    role: string,
    dto: TextExtractRequest,
  ): Promise<AiAudioExtractionResponse> {
    const plan = await this.resolvePlan(userId, role, dto.treatmentPlanId);
    const { targetDate } = this.resolveTargetDate(plan, role, dto.checkInDate);
    await this.checkIsLockedToday(plan.id, targetDate);

    return this.aiClientService.extractFromText(dto.editedTranscript);
  }

  async submitCheckIn(
    userId: string,
    role: string,
    dto: SubmitCheckInDto,
  ): Promise<CheckInVerdictResponse> {
    const plan = await this.resolvePlan(userId, role, dto.treatmentPlanId);
    const requestedMissedReport = dto.missedReportId
      ? await this.missedReportRepo.findOne({
          where: { id: dto.missedReportId, treatmentPlanId: plan.id },
        })
      : null;

    if (dto.missedReportId && !requestedMissedReport) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Missed check-in report not found',
      });
    }
    if (
      requestedMissedReport &&
      dto.checkInDate &&
      toDateString(requestedMissedReport.reportedDate) !== dto.checkInDate
    ) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'checkInDate does not match missedReportId',
      });
    }
    if (requestedMissedReport && requestedMissedReport.status !== 'PENDING') {
      throw new ConflictException({
        code: 'MISSED_REPORT_ALREADY_PROCESSED',
        message: 'Laporan lupa check-in ini sudah diproses sebelumnya.',
      });
    }

    const effectiveRequestedDate =
      dto.checkInDate ??
      (requestedMissedReport
        ? toDateString(requestedMissedReport.reportedDate)
        : undefined);
    const { today, targetDate, isRetroactive } = this.resolveTargetDate(
      plan,
      role,
      effectiveRequestedDate,
    );
    const todaySnapshot = await this.checkIsLockedToday(plan.id, targetDate);

    let medicationStatus: MedicationStatus = 'SUDAH_MINUM';
    let pillsTakenCount: number | null = plan.dailyPillQuota;
    let symptoms: string[] = [];
    let intentToStop = false;
    let confidence = 0.95;
    let rawTranscript: string | null = null;

    if (dto.inputMode === 'VOICE_STT') {
      if (!dto.confirmedFacts?.transcript) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'confirmedFacts.transcript required for VOICE_STT mode',
        });
      }
      rawTranscript = dto.confirmedFacts.transcript;
      // Facts are extracted from the confirmed transcript unless the client
      // already sent them; extraction always happens in the AI service.
      if (dto.confirmedFacts.medicationStatus) {
        medicationStatus = dto.confirmedFacts.medicationStatus;
        pillsTakenCount = dto.confirmedFacts.pillsTakenCount ?? null;
        symptoms = dto.confirmedFacts.symptoms ?? [];
        intentToStop = Boolean(dto.confirmedFacts.intentToStop);
        confidence = dto.confirmedFacts.confidence ?? 0.95;
      } else {
        const extraction = await this.aiClientService.extractFromText(
          dto.confirmedFacts.transcript,
        );
        medicationStatus = extraction.medicationTaken;
        pillsTakenCount = extraction.pillsTakenCount;
        symptoms = extraction.symptoms ?? [];
        intentToStop = extraction.intentToStopOrRefuse;
        confidence = extraction.extractionConfidence;
      }
    } else {
      if (!dto.fallbackButtons) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'fallbackButtons required for FALLBACK_BUTTONS mode',
        });
      }
      medicationStatus = dto.fallbackButtons.medicationStatus;
      pillsTakenCount = dto.fallbackButtons.pillsTakenCount;
      symptoms = dto.fallbackButtons.selectedComplaints ?? [];
      intentToStop = false;
      confidence = 1.0;
      rawTranscript = null;
    }

    const verdictResult = this.ruleEngine.evaluate({
      medicationStatus,
      pillsTakenCount,
      dailyPillQuota: plan.dailyPillQuota,
      symptoms,
      intentToStopOrRefuse: intentToStop,
      extractionConfidence: confidence,
    });

    const existingCheckIn = todaySnapshot?.checkIn ?? null;
    const existingEval = todaySnapshot?.evaluation ?? null;
    const wasFulfilledToday = Boolean(existingCheckIn?.isDoseFulfilled);
    const wasRedFlagToday = existingEval?.verdict === 'SEGERA_KE_FASKES';
    const isRedFlag = verdictResult.verdict === 'SEGERA_KE_FASKES';
    const isTerkendali = verdictResult.verdict === 'TERKENDALI';
    const attemptNumber = existingCheckIn ? existingCheckIn.attemptNumber + 1 : 1;

    const extractedFactsJson = {
      symptoms,
      intentToStop,
      matchedRules: verdictResult.matchedRuleCodes,
    };

    const checkIn = existingCheckIn
      ? await this.checkInRepo.save(
          Object.assign(existingCheckIn, {
            attemptNumber,
            reportedByUserId: userId,
            reportedByRole: role,
            inputMode: dto.inputMode,
            rawTranscriptEncrypted: rawTranscript,
            sttConfidence: confidence,
            medicationStatus,
            pillsTakenCount,
            isDoseFulfilled: verdictResult.isDoseFulfilled,
            extractedFactsJson,
            submittedAt: new Date(),
          }),
        )
      : await this.checkInRepo.save(
          this.checkInRepo.create({
            treatmentPlanId: plan.id,
            checkInDate: targetDate,
            attemptNumber,
            reportedByUserId: userId,
            reportedByRole: role,
            inputMode: dto.inputMode,
            rawTranscriptEncrypted: rawTranscript,
            sttConfidence: confidence,
            medicationStatus,
            pillsTakenCount,
            isDoseFulfilled: verdictResult.isDoseFulfilled,
            extractedFactsJson,
          }),
        );

    const evaluationFields = {
      verdict: verdictResult.verdict,
      isValidCompletion: verdictResult.isDoseFulfilled,
      matchedRuleCodes: verdictResult.matchedRuleCodes,
      failSafeTriggered: verdictResult.failSafeTriggered,
      failSafeReason: verdictResult.failSafeReason,
      responseMessageId: `msg_${checkIn.id}`,
      ttsAudioUrl: null,
    };

    await this.evalRepo.save(
      existingEval
        ? Object.assign(existingEval, {
            ...evaluationFields,
            evaluatedAt: new Date(),
          })
        : this.evalRepo.create({
            checkInId: checkIn.id,
            ...evaluationFields,
          }),
    );

    const yesterday = addDays(today, -1);

    // Business Logic updates
    if (isRetroactive) {
      const previousStreak = plan.currentStreak;
      const fulfilledRows = await this.checkInRepo.find({
        where: { treatmentPlanId: plan.id, isDoseFulfilled: true },
        select: { checkInDate: true },
      });
      const fulfilledSet = new Set(
        fulfilledRows.map((r) => toDateString(r.checkInDate)),
      );
      if (verdictResult.isDoseFulfilled) {
        fulfilledSet.add(targetDate);
      } else {
        fulfilledSet.delete(targetDate);
      }

      const fulfilledDates = [...fulfilledSet];
      const planStart = plan.startDate ? toDateString(plan.startDate) : targetDate;
      const effectiveStart = fulfilledDates.reduce(
        (min, d) => (d < min ? d : min),
        planStart,
      );
      const windowEnd =
        plan.targetEndDate && toDateString(plan.targetEndDate) > today
          ? toDateString(plan.targetEndDate)
          : today;

      const stats = computeStreakStats({
        startDate: effectiveStart,
        targetEndDate: windowEnd,
        fulfilledDates,
        today,
      });

      plan.currentStreak = stats.currentStreak;
      plan.consecutiveSilenceDays = stats.consecutiveSilenceDays;
      plan.targetEndDate = computeTargetEndDate(
        stats.latestFulfilled,
        stats.currentStreak,
        today,
      );

      if (
        verdictResult.isDoseFulfilled &&
        stats.consecutiveSilenceDays === 0 &&
        ['BERISIKO', 'PUTUS_FOLLOW_UP'].includes(plan.patientState) &&
        !isRedFlag &&
        !wasRedFlagToday
      ) {
        const openCritical = await this.ticketRepo.find({
          where: {
            treatmentPlanId: plan.id,
            triggerSource: In(['RED_FLAG', 'INTENT_TO_STOP']),
            status: In(['OPEN', 'IN_PROGRESS']),
          },
        });
        if (openCritical.length === 0) {
          await this.recoverFromSilence(
            plan,
            plan.patientState,
            previousStreak,
            plan.currentStreak,
            userId,
            role,
            `PMO verified missed check-in for ${targetDate}; streak restored to ${plan.currentStreak}`,
            `PMO memverifikasi check-in tanggal ${targetDate}. Kepatuhan pasien kembali aktif.`,
            `PMO memverifikasi check-in tanggal ${targetDate} sehingga periode sunyi pulih.`,
          );
        }
      }

      await this.planRepo.save(plan);

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: isTerkendali ? 'CHECK_IN_LOCKED' : 'CHECK_IN_INCOMPLETE_RETRY',
          previousStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: `PMO verified check-in for missed date ${targetDate} (${verdictResult.verdict})`,
          metadataJson: {
            checkInId: checkIn.id,
            checkInDate: targetDate,
            verdict: verdictResult.verdict,
          },
        }),
      );
    } else if (verdictResult.isDoseFulfilled) {
      const previousStreak = plan.currentStreak;

      if (!wasFulfilledToday) {
        const wasSilentOrAtRisk =
          plan.consecutiveSilenceDays > 0 ||
          (['BERISIKO', 'PUTUS_FOLLOW_UP'].includes(plan.patientState) &&
            !wasRedFlagToday);

        // The midnight cron is the only thing that normally notices a missed
        // day. If the server was down, the plan can still look "healthy", so
        // check the actual last dose date here and start a new streak at 1.
        const lastFulfilled = await this.findLastFulfilledBefore(plan.id, today);
        const missedDay =
          Boolean(lastFulfilled) && lastFulfilled!.checkInDate < yesterday;

        if (wasSilentOrAtRisk && !isRedFlag) {
          const previousState = plan.patientState;
          plan.consecutiveSilenceDays = 0;
          plan.currentStreak = 1; // Locked decision DEC-05: resets to 1
          await this.recoverFromSilence(
            plan,
            previousState,
            0,
            1,
            userId,
            role,
            'Patient recovered adherence after silence period',
            'Pasien yang sebelumnya tidak melapor telah berhasil check-in dosis penuh hari ini.',
            'Pasien kembali melakukan check-in dosis penuh secara mandiri.',
          );
        } else {
          plan.currentStreak = missedDay ? 1 : plan.currentStreak + 1;
          plan.consecutiveSilenceDays = 0;
        }

        plan.targetEndDate = computeTargetEndDate(
          plan.currentStreak > 0 ? today : null,
          plan.currentStreak,
          today,
        );
        await this.planRepo.save(plan);
      }

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: isTerkendali ? 'CHECK_IN_LOCKED' : 'CHECK_IN_INCOMPLETE_RETRY',
          previousStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: isTerkendali
            ? `Check-in locked for date ${today}`
            : `Check-in attempt #${attemptNumber} recorded (${verdictResult.verdict}; may replace today)`,
          metadataJson: {
            checkInId: checkIn.id,
            verdict: verdictResult.verdict,
          },
        }),
      );
    } else {
      const previousStreak = plan.currentStreak;
      if (wasFulfilledToday) {
        const lastFulfilled = await this.findLastFulfilledBefore(plan.id, today);
        const fulfilledYesterday =
          Boolean(lastFulfilled) && lastFulfilled!.checkInDate >= yesterday;
        plan.currentStreak = fulfilledYesterday
          ? Math.max(0, plan.currentStreak - 1)
          : 0;
        plan.targetEndDate = computeTargetEndDate(
          plan.currentStreak > 0 && lastFulfilled
            ? toDateString(lastFulfilled.checkInDate)
            : null,
          plan.currentStreak,
          today,
        );
        await this.planRepo.save(plan);
      }

      // Incomplete dose attempt
      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: 'CHECK_IN_INCOMPLETE_RETRY',
          previousStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: `Incomplete check-in attempt #${attemptNumber} recorded`,
          metadataJson: {
            checkInId: checkIn.id,
            verdict: verdictResult.verdict,
          },
        }),
      );

      // Emit DOSE_RETRY_WARNING facility alert
      await this.alertRepo.save(
        this.alertRepo.create({
          facilityId: plan.facilityId,
          treatmentPlanId: plan.id,
          alertType: 'DOSE_RETRY_WARNING',
          severity: 'INFO',
          title: 'Percobaan Ulang Dosis Belum Lengkap',
          message: `Pasien ${plan.patientUser?.name || 'Pasien'} mencatat dosis belum lengkap (percobaan #${attemptNumber}). Pasien telah diingatkan untuk mencoba lagi sebelum tengah malam.`,
        }),
      );

      this.eventEmitter.emit(
        'notification.trigger',
        new NotificationTriggerEvent(
          'DOSE_INCOMPLETE_NUDGE',
          plan.id,
          'PASIEN',
          plan.patientUserId,
          undefined,
          verdictResult.responseMessage,
        ),
      );
    }

    if (role === 'PMO' && (requestedMissedReport || isRetroactive)) {
      const reportToResolve =
        requestedMissedReport ??
        (await this.missedReportRepo.findOne({
          where: {
            treatmentPlanId: plan.id,
            reportedDate: targetDate,
            status: 'PENDING',
          },
        }));

      if (reportToResolve && reportToResolve.status === 'PENDING') {
        reportToResolve.status = verdictResult.isDoseFulfilled
          ? 'VERIFIED'
          : 'REJECTED';
        reportToResolve.verifiedByUserId = userId;
        reportToResolve.verifiedCheckInId = checkIn.id;
        reportToResolve.verifiedAt = new Date();
        await this.missedReportRepo.save(reportToResolve);

        await this.historyRepo.save(
          this.historyRepo.create({
            treatmentPlanId: plan.id,
            eventType: 'MISSED_CHECKIN_VERIFIED',
            previousState: plan.patientState,
            newState: plan.patientState,
            previousStreak: plan.currentStreak,
            newStreak: plan.currentStreak,
            actorUserId: userId,
            actorRole: role,
            reasonOrSummary: verdictResult.isDoseFulfilled
              ? `PMO memverifikasi laporan lupa check-in untuk ${targetDate}`
              : `PMO menolak laporan lupa check-in untuk ${targetDate} (dosis belum terpenuhi)`,
            metadataJson: {
              missedReportId: reportToResolve.id,
              checkInId: checkIn.id,
              reportedDate: targetDate,
              status: reportToResolve.status,
            },
          }),
        );

        if (verdictResult.isDoseFulfilled) {
          this.eventEmitter.emit(
            'notification.trigger',
            new NotificationTriggerEvent(
              'MISSED_CHECKIN_VERIFIED',
              plan.id,
              'PASIEN',
              plan.patientUserId,
              undefined,
              `PMO memverifikasi minum obat tanggal ${targetDate}. Streak Anda sekarang ${plan.currentStreak} hari.`,
              {
                missedReportId: reportToResolve.id,
                reportedDate: targetDate,
                currentStreak: plan.currentStreak,
              },
            ),
          );
        }
      }
    }

    // Critical Red Flag Handling: escalate once per day; keep CRITICAL tickets OPEN for Nakes verification.
    if (isRedFlag) {
      const openCriticalTickets = await this.ticketRepo.find({
        where: {
          treatmentPlanId: plan.id,
          triggerSource: In(['RED_FLAG', 'INTENT_TO_STOP']),
          status: In(['OPEN', 'IN_PROGRESS']),
        },
      });
      const hasTodayTicket = openCriticalTickets.some((t) => {
        const opened =
          t.openedAt instanceof Date
            ? t.openedAt.toISOString().slice(0, 10)
            : t.openedAt
              ? String(t.openedAt).slice(0, 10)
              : '';
        return opened === today;
      });

      if (!wasRedFlagToday && !hasTodayTicket) {
        const previousState = plan.patientState;
        plan.patientState = 'BERISIKO';
        plan.riskScore += 25;
        plan.consecutiveSilenceDays = 0;
        await this.planRepo.save(plan);

        const triggerSource = intentToStop ? 'INTENT_TO_STOP' : 'RED_FLAG';
        const ticket = await this.ticketRepo.save(
          this.ticketRepo.create({
            treatmentPlanId: plan.id,
            facilityId: plan.facilityId,
            triggerSource,
            priority: 'CRITICAL',
            status: 'OPEN',
            pmoNotes: `Check-in flag reported by ${role}: ${symptoms.join(', ')}`,
          }),
        );

        await this.historyRepo.save(
          this.historyRepo.create({
            treatmentPlanId: plan.id,
            eventType: 'TICKET_OPENED',
            previousState,
            newState: 'BERISIKO',
            previousStreak: plan.currentStreak,
            newStreak: plan.currentStreak,
            actorUserId: userId,
            actorRole: role,
            reasonOrSummary: `Critical ticket opened (${triggerSource})`,
            metadataJson: { ticketId: ticket.id },
          }),
        );

        const patientName = plan.patientUser?.name || 'Pasien';
        const redFlagCircumstance = intentToStop
          ? 'INTENT_TO_STOP_ALERT'
          : 'RED_FLAG_ALERT';
        const companionMessage = intentToStop
          ? `Pasien ${patientName} membutuhkan dukungan untuk melanjutkan jadwal minum obat. Mohon hubungi dan koordinasikan dengan faskes terdekat.`
          : `Pasien ${patientName} melaporkan kondisi yang memerlukan perhatian medis. Tim faskes telah diberitahu; mohon segera bantu pendampingan.`;

        await this.alertRepo.save(
          this.alertRepo.create({
            facilityId: plan.facilityId,
            treatmentPlanId: plan.id,
            alertType: intentToStop
              ? 'INTENT_TO_STOP_WARNING'
              : 'RED_FLAG_WARNING',
            severity: 'HIGH',
            title: intentToStop
              ? 'Dukungan Kepatuhan Diperlukan'
              : 'Perhatian Medis Diperlukan',
            message: intentToStop
              ? `Pasien ${patientName} membutuhkan dukungan untuk melanjutkan pengobatan. Tiket tindak lanjut telah dibuka.`
              : `Pasien ${patientName} melaporkan kondisi yang memerlukan perhatian medis segera. Tiket tindak lanjut telah dibuka.`,
          }),
        );

        for (const recipientRole of ['PMO', 'KELUARGA', 'NAKES'] as const) {
          this.eventEmitter.emit(
            'notification.trigger',
            new NotificationTriggerEvent(
              redFlagCircumstance,
              plan.id,
              recipientRole,
              undefined,
              undefined,
              companionMessage,
            ),
          );
        }
      }
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: userId,
        actorRole: role,
        action: 'SUBMIT_CHECK_IN',
        targetEntity: 'daily_check_ins',
        targetId: checkIn.id,
        metadataJson: {
          isDoseFulfilled: verdictResult.isDoseFulfilled,
          verdict: verdictResult.verdict,
          replaced: Boolean(existingCheckIn),
          attemptNumber,
        },
      }),
    );

    return {
      checkInId: checkIn.id,
      verdict: verdictResult.verdict,
      isDoseFulfilled: verdictResult.isDoseFulfilled,
      redoRequiredToday: verdictResult.redoRequiredToday,
      currentStreak: plan.currentStreak,
      message: verdictResult.responseMessage,
      matchedRules: verdictResult.matchedRuleCodes,
      submittedAt: checkIn.submittedAt.toISOString(),
    };
  }
}
