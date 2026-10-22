import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TreatmentPlan } from "../../../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../../../check-ins/entities/daily-check-in.entity.js";
import { PatientStatusHistory } from "../../../patients/entities/patient-status-history.entity.js";
import { InterventionTicket } from "../../../tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../../../alerts/entities/facility-alert.entity.js";
import { NotificationTriggerEvent } from "../../../../common/events/notification-trigger.event.js";

@Injectable()
export class SilenceDetectorService {
  private readonly logger = new Logger(SilenceDetectorService.name);

  constructor(
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(InterventionTicket)
    private readonly ticketRepo: Repository<InterventionTicket>,
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightCron(): Promise<void> {
    this.logger.log("Running scheduled midnight silence check...");
    await this.runMidnightSilenceCheck();
  }

  async runMidnightSilenceCheck(targetDateStr?: string): Promise<{ processed: number; silenced: number }> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateToCheck = targetDateStr || yesterday.toISOString().slice(0, 10);

    const activePlans = await this.planRepo.find({
      where: {
        patientState: In(["AKTIF", "BERISIKO"]),
      },
      relations: {
        patientUser: true,
      },
    });

    let silenced = 0;

    // Batch the fulfilled-check-in lookup: one query for all active plans
    // instead of one per plan inside the loop.
    const planIds = activePlans.map((p) => p.id);
    const fulfilledCheckIns = planIds.length
      ? await this.checkInRepo.find({
          where: {
            treatmentPlanId: In(planIds),
            checkInDate: dateToCheck,
            isDoseFulfilled: true,
          },
          select: { treatmentPlanId: true },
        })
      : [];
    const fulfilledPlanIds = new Set(
      fulfilledCheckIns.map((c) => c.treatmentPlanId),
    );

    for (const plan of activePlans) {
      if (!fulfilledPlanIds.has(plan.id)) {
        silenced++;
        const previousStreak = plan.currentStreak;
        const previousState = plan.patientState;

        // Reset streak to 0 and increment silence days
        plan.currentStreak = 0;
        plan.consecutiveSilenceDays += 1;

        if (previousStreak > 0) {
          await this.alertRepo.save(
            this.alertRepo.create({
              facilityId: plan.facilityId,
              treatmentPlanId: plan.id,
              alertType: "STREAK_RESET_WARNING",
              severity: "WARNING",
              title: "Streak Minum Obat Terputus",
              message: `Pasien ${plan.patientUser?.name || 'Pasien'} tidak mencatat check-in sebelum batas tengah malam. Streak ${previousStreak} hari terputus dan kembali ke 0.`,
            }),
          );
        }

        await this.historyRepo.save(
          this.historyRepo.create({
            treatmentPlanId: plan.id,
            eventType: "STREAK_RESET",
            previousState,
            newState: plan.patientState,
            previousStreak,
            newStreak: 0,
            actorRole: "SYSTEM",
            reasonOrSummary: `Midnight deadline missed for ${dateToCheck}; streak reset to 0`,
          }),
        );

        // Escalation Ladder
        if (plan.consecutiveSilenceDays === 1) {
          this.eventEmitter.emit(
            "notification.trigger",
            new NotificationTriggerEvent(
              "SILENCE_H1_ESCALATION",
              plan.id,
              "PASIEN",
              plan.patientUserId,
            ),
          );
        } else if (plan.consecutiveSilenceDays === 2) {
          plan.patientState = "BERISIKO";
          plan.riskScore += 15;

          await this.historyRepo.save(
            this.historyRepo.create({
              treatmentPlanId: plan.id,
              eventType: "STATE_TRANSITION",
              previousState,
              newState: "BERISIKO",
              previousStreak: 0,
              newStreak: 0,
              actorRole: "SYSTEM",
              reasonOrSummary: "Patient transitioned to BERISIKO due to H+2 silence",
            }),
          );

          this.eventEmitter.emit(
            "notification.trigger",
            new NotificationTriggerEvent(
              "SILENCE_H2_ESCALATION",
              plan.id,
              "PMO",
            ),
          );
        } else if (plan.consecutiveSilenceDays >= 3) {
          const prolonged = plan.consecutiveSilenceDays >= 7;
          const newState = prolonged ? "PUTUS_FOLLOW_UP" : "BERISIKO";
          plan.patientState = newState;
          plan.riskScore += 25;

          // Open SILENCE_H3 critical intervention ticket
          const ticket = await this.ticketRepo.save(
            this.ticketRepo.create({
              treatmentPlanId: plan.id,
              facilityId: plan.facilityId,
              triggerSource: "SILENCE_H3",
              priority: "CRITICAL",
              status: "OPEN",
              pmoNotes: `Pasien tidak check-in selama ${plan.consecutiveSilenceDays} hari berturut-turut.`,
            }),
          );

          await this.historyRepo.save(
            this.historyRepo.create({
              treatmentPlanId: plan.id,
              eventType: "TICKET_OPENED",
              previousState,
              newState,
              previousStreak: 0,
              newStreak: 0,
              actorRole: "SYSTEM",
              reasonOrSummary: `SILENCE_H3 ticket opened after ${plan.consecutiveSilenceDays} silent days`,
              metadataJson: { ticketId: ticket.id },
            }),
          );

          // Open FacilityAlert warning
          await this.alertRepo.save(
            this.alertRepo.create({
              facilityId: plan.facilityId,
              treatmentPlanId: plan.id,
              alertType: "SILENCE_H3_WARNING",
              severity: "HIGH",
              title: "Pasien Putus Kontak H+3",
              message: `Pasien belum melapor selama ${plan.consecutiveSilenceDays} hari berturut-turut. Segera lakukan tindak lanjut lapangan.`,
            }),
          );

          await this.historyRepo.save(
            this.historyRepo.create({
              treatmentPlanId: plan.id,
              eventType: "STATE_TRANSITION",
              previousState,
              newState,
              previousStreak: 0,
              newStreak: 0,
              actorRole: "SYSTEM",
              reasonOrSummary: `H+3 critical silence reached (${plan.consecutiveSilenceDays} days)`,
            }),
          );

          this.eventEmitter.emit(
            "notification.trigger",
            new NotificationTriggerEvent(
              "SILENCE_H3_ESCALATION",
              plan.id,
              "PMO",
            ),
          );
        }

        await this.planRepo.save(plan);
      }
    }

    return { processed: activePlans.length, silenced };
  }
}
