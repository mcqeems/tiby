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
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyCheckIn } from '../entities/daily-check-in.entity.js';
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

  async checkIsLockedToday(
    treatmentPlanId: string,
    checkInDate: string,
  ): Promise<void> {
    const locked = await this.checkInRepo.findOne({
      where: {
        treatmentPlanId,
        checkInDate,
        isDoseFulfilled: true,
      },
    });

    if (locked) {
      throw new ConflictException({
        code: 'CHECK_IN_ALREADY_LOCKED',
        message: 'Check-in for today is already completed and locked.',
      });
    }
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

  async extractAudioPreview(
    userId: string,
    role: string,
    file: Express.Multer.File,
    treatmentPlanId?: string,
  ): Promise<AiAudioTranscriptResponse> {
    const today = new Date().toISOString().slice(0, 10);
    const plan = await this.resolvePlan(userId, role, treatmentPlanId);
    await this.checkIsLockedToday(plan.id, today);

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
    const today = new Date().toISOString().slice(0, 10);
    const plan = await this.resolvePlan(userId, role, dto.treatmentPlanId);
    await this.checkIsLockedToday(plan.id, today);

    return this.aiClientService.extractFromText(dto.editedTranscript);
  }

  async submitCheckIn(
    userId: string,
    role: string,
    dto: SubmitCheckInDto,
  ): Promise<CheckInVerdictResponse> {
    const today = new Date().toISOString().slice(0, 10);
    const plan = await this.resolvePlan(userId, role, dto.treatmentPlanId);
    await this.checkIsLockedToday(plan.id, today);

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

    const existingAttempts = await this.checkInRepo.countBy({
      treatmentPlanId: plan.id,
      checkInDate: today,
    });
    const attemptNumber = existingAttempts + 1;

    const checkIn = await this.checkInRepo.save(
      this.checkInRepo.create({
        treatmentPlanId: plan.id,
        checkInDate: today,
        attemptNumber,
        reportedByUserId: userId,
        reportedByRole: role,
        inputMode: dto.inputMode,
        rawTranscriptEncrypted: rawTranscript,
        sttConfidence: confidence,
        medicationStatus,
        pillsTakenCount,
        isDoseFulfilled: verdictResult.isDoseFulfilled,
        extractedFactsJson: {
          symptoms,
          intentToStop,
          matchedRules: verdictResult.matchedRuleCodes,
        },
      }),
    );

    await this.evalRepo.save(
      this.evalRepo.create({
        checkInId: checkIn.id,
        verdict: verdictResult.verdict,
        isValidCompletion: verdictResult.isDoseFulfilled,
        matchedRuleCodes: verdictResult.matchedRuleCodes,
        failSafeTriggered: verdictResult.failSafeTriggered,
        failSafeReason: verdictResult.failSafeReason,
        responseMessageId: `msg_${checkIn.id}`,
      }),
    );

    // Business Logic updates
    if (verdictResult.isDoseFulfilled) {
      const isRedFlag = verdictResult.verdict === 'SEGERA_KE_FASKES';
      const wasSilentOrAtRisk =
        plan.consecutiveSilenceDays > 0 ||
        ['BERISIKO', 'PUTUS_FOLLOW_UP'].includes(plan.patientState);

      if (wasSilentOrAtRisk && !isRedFlag) {
        const previousState = plan.patientState;
        plan.patientState = 'AKTIF';
        plan.consecutiveSilenceDays = 0;
        plan.currentStreak = 1; // Locked decision DEC-05: resets to 1

        // Auto-close open SILENCE_H3 tickets
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
          t.resolutionNotes =
            'Pasien kembali melakukan check-in dosis penuh secara mandiri.';
          await this.ticketRepo.save(t);

          await this.historyRepo.save(
            this.historyRepo.create({
              treatmentPlanId: plan.id,
              eventType: 'TICKET_AUTO_CLOSED',
              previousState,
              newState: 'AKTIF',
              previousStreak: 0,
              newStreak: 1,
              actorUserId: userId,
              actorRole: role,
              reasonOrSummary: `Ticket ${t.id} auto-closed by recovered check-in`,
            }),
          );
        }

        // Emit FacilityAlert warning
        await this.alertRepo.save(
          this.alertRepo.create({
            facilityId: plan.facilityId,
            treatmentPlanId: plan.id,
            alertType: 'SILENCE_RECOVERED_WARNING',
            severity: 'WARNING',
            title: 'Pasien Pulih dari Putus Kontak',
            message:
              'Pasien yang sebelumnya tidak melapor telah berhasil check-in dosis penuh hari ini.',
          }),
        );

        await this.historyRepo.save(
          this.historyRepo.create({
            treatmentPlanId: plan.id,
            eventType: 'STATE_TRANSITION',
            previousState,
            newState: 'AKTIF',
            previousStreak: 0,
            newStreak: 1,
            actorUserId: userId,
            actorRole: role,
            reasonOrSummary: 'Patient recovered adherence after silence period',
          }),
        );
      } else {
        plan.currentStreak += 1;
        plan.consecutiveSilenceDays = 0;
      }

      await this.planRepo.save(plan);

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: 'CHECK_IN_LOCKED',
          previousStreak: plan.currentStreak - 1,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: `Check-in locked for date ${today}`,
          metadataJson: {
            checkInId: checkIn.id,
            verdict: verdictResult.verdict,
          },
        }),
      );
    } else {
      // Incomplete dose attempt
      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: 'CHECK_IN_INCOMPLETE_RETRY',
          previousStreak: plan.currentStreak,
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

    // Critical Red Flag Handling
    if (verdictResult.verdict === 'SEGERA_KE_FASKES') {
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
          previousState: plan.patientState,
          newState: 'BERISIKO',
          previousStreak: plan.currentStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: role,
          reasonOrSummary: `Critical ticket opened (${triggerSource})`,
          metadataJson: { ticketId: ticket.id },
        }),
      );

      this.eventEmitter.emit(
        'notification.trigger',
        new NotificationTriggerEvent(
          intentToStop ? 'INTENT_TO_STOP_ALERT' : 'RED_FLAG_ALERT',
          plan.id,
          'PMO',
          undefined,
          undefined,
          verdictResult.responseMessage,
        ),
      );

      // Family contacts get the same escalation over WhatsApp (no login).
      this.eventEmitter.emit(
        'notification.trigger',
        new NotificationTriggerEvent(
          intentToStop ? 'INTENT_TO_STOP_ALERT' : 'RED_FLAG_ALERT',
          plan.id,
          'KELUARGA',
        ),
      );
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
