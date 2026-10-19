import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyCheckIn } from '../entities/daily-check-in.entity.js';
import { SafetyEvaluation } from '../../rule-engine/entities/safety-evaluation.entity.js';
import { TreatmentPlan } from '../../treatments/entities/treatment-plan.entity.js';
import { PmoAssignment } from '../../treatments/entities/pmo-assignment.entity.js';
import { InterventionTicket } from '../../tickets/entities/intervention-ticket.entity.js';
import { FacilityAlert } from '../../facilities/entities/facility-alert.entity.js';
import { PatientStatusHistory } from '../../treatments/entities/patient-status-history.entity.js';
import { AuditLog } from '../../audit/entities/audit-log.entity.js';
import { AiClientService } from '../../ai-client/ai-client.service.js';
import { RuleEngineService } from '../../rule-engine/rule-engine.service.js';
import { NotificationTriggerEvent } from '../../../common/events/notification-trigger.event.js';
import type {
  AiAudioExtractionResponse,
  CheckInVerdictResponse,
  SubmitCheckInDto,
  TextExtractRequest,
  MedicationStatus,
  PmoPatientStatusList,
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
  SafetyVerdict,
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

  async extractAudioPreview(
    userId: string,
    role: string,
    file: Express.Multer.File,
    treatmentPlanId?: string,
  ): Promise<AiAudioExtractionResponse> {
    const today = new Date().toISOString().slice(0, 10);
    const plan = await this.resolvePlan(userId, role, treatmentPlanId);
    await this.checkIsLockedToday(plan.id, today);

    return this.aiClientService.extractFromAudio(
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
      if (!dto.confirmedFacts) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'confirmedFacts required for VOICE_STT mode',
        });
      }
      medicationStatus = dto.confirmedFacts.medicationStatus;
      pillsTakenCount = dto.confirmedFacts.pillsTakenCount;
      symptoms = dto.confirmedFacts.symptoms ?? [];
      intentToStop = Boolean(dto.confirmedFacts.intentToStop);
      confidence = dto.confirmedFacts.confidence ?? 0.95;
      rawTranscript = dto.confirmedFacts.transcript ?? null;
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

  async getPmoPatients(pmoUserId: string): Promise<PmoPatientStatusList> {
    const assignments = await this.pmoRepo.find({
      where: { pmoUserId, active: true },
      relations: {
        treatmentPlan: {
          patientUser: true,
        },
      },
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    const patients = await Promise.all(
      assignments.map(async (a) => {
        const plan = a.treatmentPlan;
        const lockedCheckIn = await this.checkInRepo.findOne({
          where: {
            treatmentPlanId: plan.id,
            checkInDate: todayStr,
            isDoseFulfilled: true,
          },
        });

        const latestCheckIn = await this.checkInRepo.findOne({
          where: { treatmentPlanId: plan.id, checkInDate: todayStr },
          order: { attemptNumber: 'DESC' },
        });

        let todayVerdict: SafetyVerdict | null = null;
        if (lockedCheckIn) {
          const ev = await this.evalRepo.findOneBy({
            checkInId: lockedCheckIn.id,
          });
          todayVerdict = (ev?.verdict as SafetyVerdict) ?? 'TERKENDALI';
        } else if (latestCheckIn) {
          const ev = await this.evalRepo.findOneBy({
            checkInId: latestCheckIn.id,
          });
          todayVerdict = (ev?.verdict as SafetyVerdict) ?? 'PERLU_PERHATIAN';
        }

        return {
          treatmentPlanId: plan.id,
          patientName: plan.patientUser?.name || 'Pasien',
          isLockedToday: Boolean(lockedCheckIn),
          todayVerdict,
          currentStreak: plan.currentStreak,
          phase: plan.phase,
          consecutiveSilenceDays: plan.consecutiveSilenceDays,
        };
      }),
    );

    return patients;
  }

  async createPmoFollowUp(
    pmoUserId: string,
    patientOrPlanId: string,
    dto: CreatePmoFollowUpDto,
  ): Promise<PmoFollowUpResponse> {
    let plan = await this.planRepo.findOne({
      where: { patientUserId: patientOrPlanId },
    });
    if (!plan) {
      plan = await this.planRepo.findOne({
        where: { id: patientOrPlanId },
      });
    }
    if (!plan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Treatment plan not found for patient',
      });
    }

    const assignment = await this.pmoRepo.findOne({
      where: { treatmentPlanId: plan.id, pmoUserId, active: true },
    });
    if (!assignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'PMO is not assigned to this patient',
      });
    }

    const history = await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: 'PMO_OUTREACH',
        previousState: plan.patientState,
        newState: plan.patientState,
        previousStreak: plan.currentStreak,
        newStreak: plan.currentStreak,
        actorUserId: pmoUserId,
        actorRole: 'PMO',
        reasonOrSummary: dto.notes,
        metadataJson: { actionTaken: dto.actionTaken },
      }),
    );

    return {
      success: true,
      followUpId: history.id,
      notes: dto.notes,
    };
  }
}
