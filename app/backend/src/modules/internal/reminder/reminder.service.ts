import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { In, MoreThanOrEqual, Repository } from "typeorm";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { NotificationLog } from "../../whatsapp/entities/notification-log.entity.js";
import { NotificationTriggerEvent } from "../../../common/events/notification-trigger.event.js";

const ACTIVE_STATES = ["AKTIF", "BERISIKO", "DIPANTAU_TERBATAS"];

type ReminderPlan = Pick<
  TreatmentPlan,
  "id" | "patientUserId" | "timezone" | "reminderTimeLocal" | "startDate" | "targetEndDate"
>;

function formatInZone(timeZone: string, now: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(now);
}

/** Calendar date (YYYY-MM-DD) as seen in the plan's own timezone. */
export function localDate(timeZone: string, now: Date): string {
  return formatInZone(timeZone, now, "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Clock (HH:mm, 24h) as seen in the plan's own timezone. */
export function localClock(timeZone: string, now: Date): string {
  return formatInZone(timeZone, now, "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/**
 * A plan is due when its local clock matches `reminder_time_local` and the
 * plan is inside its treatment window. An unknown timezone is skipped, never
 * treated as UTC.
 */
export function isReminderDue(plan: ReminderPlan, now: Date): boolean {
  try {
    const today = localDate(plan.timezone, now);
    if (today < plan.startDate || today > plan.targetEndDate) return false;
    return localClock(plan.timezone, now) === plan.reminderTimeLocal.slice(0, 5);
  } catch {
    return false;
  }
}

/**
 * Emits one DAILY_REMINDER per plan per local day.
 *
 * Idempotent twice over: an in-memory guard stops two overlapping minute runs
 * in one process, and the NotificationLog check stops duplicates after a
 * restart or a second instance.
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly sentToday = new Map<string, string>();

  constructor(
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledReminders(): Promise<void> {
    // The test suite calls dispatchDueReminders() directly; a live cron would
    // send real WhatsApp messages for seeded plans mid-run.
    if (process.env.NODE_ENV === "test") return;
    await this.dispatchDueReminders();
  }

  async dispatchDueReminders(): Promise<void> {
    const now = new Date();
    const plans = await this.planRepo.find({
      where: { patientState: In(ACTIVE_STATES) },
      select: {
        id: true,
        patientUserId: true,
        timezone: true,
        reminderTimeLocal: true,
        startDate: true,
        targetEndDate: true,
      },
    });

    const due = plans.filter((plan) => isReminderDue(plan, now));
    if (due.length === 0) return;

    const localTodayByPlan = new Map<string, string>();
    for (const plan of due) {
      localTodayByPlan.set(plan.id, localDate(plan.timezone, now));
    }
    const uniqueLocalDates = [...new Set(localTodayByPlan.values())];
    const earliestLocalDate = [...uniqueLocalDates].sort()[0];
    const logWindowStart = new Date(
      Date.parse(`${earliestLocalDate}T00:00:00.000Z`) - 14 * 3_600_000,
    );
    const ids = due.map((plan) => plan.id);

    const [fulfilled, alreadyLogged] = await Promise.all([
      this.checkInRepo.find({
        where: {
          treatmentPlanId: In(ids),
          checkInDate: In(uniqueLocalDates),
          isDoseFulfilled: true,
        },
        select: { treatmentPlanId: true, checkInDate: true },
      }),
      this.logRepo.find({
        where: {
          treatmentPlanId: In(ids),
          triggerCircumstance: "DAILY_REMINDER",
          sentAt: MoreThanOrEqual(logWindowStart),
        },
        select: { treatmentPlanId: true, sentAt: true },
      }),
    ]);

    const done = new Set(
      fulfilled
        .filter((row) => {
          const planToday = localTodayByPlan.get(row.treatmentPlanId);
          return !row.checkInDate || String(row.checkInDate).slice(0, 10) === planToday;
        })
        .map((row) => row.treatmentPlanId),
    );
    const logged = new Set(
      alreadyLogged
        .filter((row) => {
          const planToday = localTodayByPlan.get(row.treatmentPlanId);
          const plan = due.find((p) => p.id === row.treatmentPlanId);
          if (!row.sentAt || !plan || !planToday) return true;
          return localDate(plan.timezone, row.sentAt) === planToday;
        })
        .map((row) => row.treatmentPlanId),
    );

    for (const plan of due) {
      const planToday = localTodayByPlan.get(plan.id)!;
      if (done.has(plan.id) || logged.has(plan.id)) continue;
      if (this.sentToday.get(plan.id) === planToday) continue;

      this.sentToday.set(plan.id, planToday);
      this.eventEmitter.emit(
        "notification.trigger",
        new NotificationTriggerEvent(
          "DAILY_REMINDER",
          plan.id,
          "PASIEN",
          plan.patientUserId,
        ),
      );
    }

    // The map only needs current-day entries.
    if (this.sentToday.size > 1000) {
      const activeDates = new Set(uniqueLocalDates);
      for (const [planId, date] of this.sentToday) {
        if (!activeDates.has(date)) this.sentToday.delete(planId);
      }
    }
    this.logger.debug(`DAILY_REMINDER due for ${due.length} plan(s)`);
  }
}
