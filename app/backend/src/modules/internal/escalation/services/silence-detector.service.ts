import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, LessThanOrEqual, Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TreatmentPlan } from "../../../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../../../check-ins/entities/daily-check-in.entity.js";
import { PatientStatusHistory } from "../../../patients/entities/patient-status-history.entity.js";
import { InterventionTicket } from "../../../tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../../../alerts/entities/facility-alert.entity.js";
import { NotificationTriggerEvent } from "../../../../common/events/notification-trigger.event.js";

const ACTIVE_STATES = ["AKTIF", "BERISIKO", "PUTUS_FOLLOW_UP"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` in the server's local calendar. */
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The calendar day that just ended where the cron runs.
 *
 * The cron fires at server-local midnight. `toISOString()` is UTC, which in
 * WIB (UTC+7) points one day too far back at that instant (2026-10-28 00:00
 * WIB is still 2026-10-27 17:00 UTC), so a one-day absence was not detected
 * until the following midnight.
 *
 * ponytail: one server timezone; group by plan.timezone if multi-TZ support
 * is ever needed.
 */
export function previousLocalDate(now: Date): string {
  return localDateString(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
}

/** Add days to a date-only string without timezone drift. */
export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function earlier(a: string, b: string): string {
  return a < b ? a : b;
}

@Injectable()
export class SilenceDetectorService implements OnApplicationBootstrap {
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

  /**
   * Catch up on a restart. The cron only runs at midnight; if the server was
   * down over a deadline, every missed day is processed here, oldest first.
   * The per-plan watermark makes this idempotent and prevents re-processing
   * days the cron already handled.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    try {
      const result = await this.runMidnightSilenceCheck();
      this.logger.log(
        `Startup silence catch-up: processed ${result.processed}, silenced ${result.silenced}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Startup silence catch-up failed: ${msg}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightCron(): Promise<void> {
    this.logger.log("Running scheduled midnight silence check...");
    await this.runMidnightSilenceCheck();
  }

  async runMidnightSilenceCheck(
    targetDateStr?: string,
  ): Promise<{ processed: number; silenced: number }> {
    const endDate = targetDateStr || previousLocalDate(new Date());
    const today = localDateString(new Date());

    const plans = await this.planRepo.find({
      where: {
        // PUTUS_FOLLOW_UP keeps counting silence and resetting the streak;
        // the escalation ladder never fires again for it.
        patientState: In(ACTIVE_STATES),
        startDate: LessThanOrEqual(endDate),
      },
      relations: {
        patientUser: true,
      },
    });

    // Per-plan window: continue from the last processed day (or just the last
    // completed day on a first run), clipped to the treatment window.
    const ranges = new Map<string, { start: string; end: string }>();
    for (const plan of plans) {
      const planStart = plan.startDate ? toDateString(plan.startDate) : "0000-01-01";
      const planEnd = plan.targetEndDate ? toDateString(plan.targetEndDate) : "9999-12-31";
      const rangeEnd = targetDateStr ? endDate : earlier(endDate, planEnd);

      let rangeStart: string;
      if (targetDateStr) {
        rangeStart = targetDateStr;
      } else if (plan.lastSilenceCheckDate) {
        rangeStart = addDays(toDateString(plan.lastSilenceCheckDate), 1);
      } else {
        rangeStart = endDate;
      }
      rangeStart = rangeStart < planStart ? planStart : rangeStart;

      if (rangeStart <= rangeEnd) {
        ranges.set(plan.id, { start: rangeStart, end: rangeEnd });
      }
    }

    if (ranges.size === 0) {
      return { processed: plans.length, silenced: 0 };
    }

    // One batched lookup for every fulfilled check-in in the union of ranges.
    const starts = [...ranges.values()].map((range) => range.start);
    const ends = [...ranges.values()].map((range) => range.end);
    const minStart = starts.reduce((a, b) => (a < b ? a : b));
    const maxEnd = ends.reduce((a, b) => (a > b ? a : b));

    const fulfilledRows = await this.checkInRepo.find({
      where: {
        treatmentPlanId: In([...ranges.keys()]),
        checkInDate: Between(minStart, maxEnd),
        isDoseFulfilled: true,
      },
      select: { treatmentPlanId: true, checkInDate: true },
    });
    const fulfilledByPlan = new Map<string, Set<string>>();
    for (const row of fulfilledRows) {
      const dates = fulfilledByPlan.get(row.treatmentPlanId) ?? new Set<string>();
      dates.add(toDateString(row.checkInDate));
      fulfilledByPlan.set(row.treatmentPlanId, dates);
    }

    let silenced = 0;

    for (const plan of plans) {
      const range = ranges.get(plan.id);
      if (!range) continue;

      const fulfilled = fulfilledByPlan.get(plan.id) ?? new Set<string>();
      let changed = false;

      for (let day = range.start; day <= range.end; day = addDays(day, 1)) {
        // Never process a day that has not finished yet.
        if (day >= today) break;

        changed = true;
        if (!targetDateStr) {
          plan.lastSilenceCheckDate = day;
        }

        if (fulfilled.has(day)) continue;

        silenced++;
        // A multi-day catch-up should not fire H+1, H+2 and H+3 in one burst;
        // only the latest processed day notifies.
        const notify = targetDateStr ? true : day === range.end;
        await this.handleMissedDay(plan, day, notify);
      }

      if (changed) {
        await this.planRepo.save(plan);
      }
    }

    return { processed: plans.length, silenced };
  }

  private async handleMissedDay(
    plan: TreatmentPlan,
    day: string,
    notify: boolean,
  ): Promise<void> {
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
        reasonOrSummary: `Midnight deadline missed for ${day}; streak reset to 0`,
      }),
    );

    const silence = plan.consecutiveSilenceDays;

    if (previousState === "PUTUS_FOLLOW_UP") {
      // Counters keep moving; a lost patient is never escalated again, and
      // silence must not downgrade them back to BERISIKO.
      return;
    }

    if (silence === 1) {
      if (notify) {
        this.eventEmitter.emit(
          "notification.trigger",
          new NotificationTriggerEvent(
            "SILENCE_H1_ESCALATION",
            plan.id,
            "PASIEN",
            plan.patientUserId,
          ),
        );
      }
    } else if (silence === 2) {
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

      if (notify) {
        this.eventEmitter.emit(
          "notification.trigger",
          new NotificationTriggerEvent(
            "SILENCE_H2_ESCALATION",
            plan.id,
            "PMO",
          ),
        );

        this.eventEmitter.emit(
          "notification.trigger",
          new NotificationTriggerEvent(
            "SILENCE_H2_ESCALATION",
            plan.id,
            "KELUARGA",
          ),
        );
      }
    } else if (silence === 3) {
      plan.patientState = "BERISIKO";
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
          newState: plan.patientState,
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
          newState: plan.patientState,
          previousStreak: 0,
          newStreak: 0,
          actorRole: "SYSTEM",
          reasonOrSummary: `H+3 critical silence reached (${plan.consecutiveSilenceDays} days)`,
        }),
      );

      if (notify) {
        this.eventEmitter.emit(
          "notification.trigger",
          new NotificationTriggerEvent(
            "SILENCE_H3_ESCALATION",
            plan.id,
            "PMO",
          ),
        );

        this.eventEmitter.emit(
          "notification.trigger",
          new NotificationTriggerEvent(
            "SILENCE_H3_ESCALATION",
            plan.id,
            "KELUARGA",
          ),
        );
      }
    } else if (silence >= 7) {
      // Prolonged silence: the ladder ends here, once.
      plan.patientState = "PUTUS_FOLLOW_UP";
      plan.riskScore += 10;

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: "STATE_TRANSITION",
          previousState,
          newState: "PUTUS_FOLLOW_UP",
          previousStreak: 0,
          newStreak: 0,
          actorRole: "SYSTEM",
          reasonOrSummary: `Prolonged silence (${silence} days): moved to PUTUS_FOLLOW_UP`,
        }),
      );
    }
  }
}
