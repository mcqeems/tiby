import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Like, Not, Repository } from "typeorm";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../../internal/rule-engine/entities/safety-evaluation.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { FacilityAlert } from "../../alerts/entities/facility-alert.entity.js";
import { InterventionTicket } from "../../tickets/entities/intervention-ticket.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { Facility } from "../../facilities/entities/facilities.entity.js";
import { NotificationsService } from "../../notifications/services/notifications.service.js";
import type {
  StatsResponse,
  TodayCheckInStatus,
  TreatmentPhase,
} from "@tiby/ts-shared";

export interface StatsCaller {
  id: string;
  role: string;
  facilityId?: string | null;
}

/** The same risk set the check-in flow uses (`check-in.service.ts`). */
const HIGH_RISK_STATES = ["BERISIKO", "PUTUS_FOLLOW_UP"];
/** Patients who left active care do not count in the facility totals. */
const TERMINAL_STATES = ["SELESAI", "PINDAH_FASKES"];
const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS"];
const DAY_MS = 86_400_000;

/** Same date the check-in lock uses, so stats and the lock can never disagree. */
export function statsToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Normalise a date-only column, whether the driver hands back a Date or a string. */
export function toDateString(value: unknown): string {
  if (value instanceof Date) {
    // Use local parts: a date-only value materialised at local midnight would
    // shift a day back if converted through UTC (UTC+7 zones).
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

/**
 * Days that count toward adherence: from start_date through today (or the
 * target end date, whichever is earlier). Today only counts once its dose is
 * fulfilled, so a patient is not penalised before the day is over.
 */
export function elapsedDays(
  startDate: string,
  targetEndDate: string,
  today: string,
  fulfilledToday: boolean,
): number {
  const start = Date.parse(startDate);
  const target = Date.parse(targetEndDate);
  const now = Date.parse(today);

  let days = Math.floor((Math.min(now, target) - start) / DAY_MS) + 1;
  if (days < 0) days = 0;
  if (days > 0 && now <= target && !fulfilledToday) days -= 1;
  return days;
}

export function daysRemaining(today: string, targetEndDate: string): number {
  return Math.max(0, Math.ceil((Date.parse(targetEndDate) - Date.parse(today)) / DAY_MS));
}

/** 0..1, rounded to three decimals. No elapsed days means nothing missed yet. */
export function adherenceRate(fulfilledDays: number, elapsed: number): number {
  if (elapsed <= 0) return 1;
  return Math.round(Math.min(1, fulfilledDays / elapsed) * 1000) / 1000;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(SafetyEvaluation)
    private readonly evalRepo: Repository<SafetyEvaluation>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    @InjectRepository(InterventionTicket)
    private readonly ticketRepo: Repository<InterventionTicket>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    private readonly notificationsService: NotificationsService,
  ) {}

  getStats(caller: StatsCaller): Promise<StatsResponse> {
    switch (caller.role) {
      case "PASIEN":
        return this.getPasienStats(caller.id);
      case "PMO":
        return this.getPmoStats(caller.id);
      case "NAKES":
        return this.getNakesStats(caller.facilityId ?? null);
      // ADMIN is a superuser, so it gets the platform-wide view.
      case "ADMIN":
        return this.getAdminStats();
      default:
        return this.getPasienStats(caller.id);
    }
  }

  private async getPasienStats(patientUserId: string): Promise<StatsResponse> {
    const today = statsToday();

    // The current plan is the most recently created one; older plans are history.
    const plan = await this.planRepo.findOne({
      where: { patientUserId },
      relations: { facility: true },
      order: { createdAt: "DESC", id: "DESC" },
    });

    if (!plan) {
      return {
        role: "PASIEN",
        currentStreak: 0,
        adherenceRate: 0,
        daysRemaining: 0,
        todayCheckInStatus: "BELUM_CHECK_IN",
        totalPillsTaken: 0,
        currentPhase: null,
        careTeam: { facility: null, pmo: [], nakes: [] },
      };
    }

    const rows = await this.checkInRepo.find({
      where: { treatmentPlanId: plan.id },
      select: {
        id: true,
        checkInDate: true,
        attemptNumber: true,
        pillsTakenCount: true,
        isDoseFulfilled: true,
      },
      order: { checkInDate: "ASC", attemptNumber: "ASC" },
    });

    const fulfilledDays = new Set<string>();
    // Latest attempt wins: a retry re-reports the day, it does not add pills.
    const latestByDay = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const date = toDateString(row.checkInDate);
      if (row.isDoseFulfilled) fulfilledDays.add(date);
      latestByDay.set(date, row);
    }

    const fulfilledToday = fulfilledDays.has(today);
    const totalPillsTaken = [...latestByDay.values()].reduce(
      (sum, row) => sum + (row.pillsTakenCount ?? 0),
      0,
    );
    const elapsed = elapsedDays(
      toDateString(plan.startDate),
      toDateString(plan.targetEndDate),
      today,
      fulfilledToday,
    );

    let todayCheckInStatus: TodayCheckInStatus = "BELUM_CHECK_IN";
    const todayRow = latestByDay.get(today);
    if (todayRow) {
      const evaluation = await this.evalRepo.findOneBy({ checkInId: todayRow.id });
      todayCheckInStatus =
        (evaluation?.verdict as TodayCheckInStatus | undefined) ?? "BELUM_CHECK_IN";
    }

    const [pmoAssignments, nakesRows] = await Promise.all([
      this.pmoRepo.find({
        where: { treatmentPlanId: plan.id, active: true },
        relations: { pmoUser: true },
        order: { isPrimary: "DESC", createdAt: "ASC" },
      }),
      this.userRepo.find({
        where: { role: "NAKES", facilityId: plan.facilityId },
        order: { name: "ASC" },
      }),
    ]);

    const nakes = nakesRows
      .map((nakesUser) => ({
        id: nakesUser.id,
        name: nakesUser.name,
        username: nakesUser.username ?? null,
        isPrimary: nakesUser.id === plan.registeredByNakesId,
      }))
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.name.localeCompare(b.name),
      );

    return {
      role: "PASIEN",
      currentStreak: plan.currentStreak,
      adherenceRate: adherenceRate(fulfilledDays.size, elapsed),
      daysRemaining: daysRemaining(today, toDateString(plan.targetEndDate)),
      todayCheckInStatus,
      totalPillsTaken,
      currentPhase: plan.phase as TreatmentPhase,
      careTeam: {
        facility: plan.facility
          ? {
              id: plan.facility.id,
              name: plan.facility.name,
              district: plan.facility.district ?? null,
            }
          : null,
        pmo: pmoAssignments.map((assignment) => ({
          id: assignment.pmoUser.id,
          name: assignment.pmoUser.name,
          username: assignment.pmoUser.username ?? null,
          isPrimary: assignment.isPrimary,
          relationship: assignment.relationship ?? null,
        })),
        nakes,
      },
    };
  }

  private async getPmoStats(pmoUserId: string): Promise<StatsResponse> {
    const today = statsToday();

    const assignments = await this.pmoRepo.find({
      where: { pmoUserId, active: true },
      select: { treatmentPlanId: true },
    });
    // One plan may have several PMOs; a plan still counts once.
    const planIds = [...new Set(assignments.map((a) => a.treatmentPlanId))];

    if (planIds.length === 0) {
      return {
        role: "PMO",
        totalPatients: 0,
        checkedInToday: 0,
        pendingCheckIn: 0,
        highRiskPatients: 0,
        unreadAlerts: 0,
      };
    }

    const todayRows = await this.checkInRepo.find({
      where: { treatmentPlanId: In(planIds), checkInDate: today },
      select: { treatmentPlanId: true },
    });
    const checkedInToday = new Set(todayRows.map((r) => r.treatmentPlanId)).size;

    // Independent counts run in parallel; none of them loops per row.
    const [highRiskPatients, unreadAlerts] = await Promise.all([
      this.planRepo.count({
        where: { id: In(planIds), patientState: In(HIGH_RISK_STATES) },
      }),
      this.notificationsService.unreadCount(pmoUserId),
    ]);

    return {
      role: "PMO",
      totalPatients: planIds.length,
      checkedInToday,
      pendingCheckIn: planIds.length - checkedInToday,
      highRiskPatients,
      unreadAlerts,
    };
  }

  private async getNakesStats(facilityId: string | null): Promise<StatsResponse> {
    const today = statsToday();

    // A NAKES without a facility sees nothing — never every facility.
    if (!facilityId) {
      return {
        role: "NAKES",
        totalPatients: 0,
        highRiskPatients: 0,
        openTickets: 0,
        criticalTickets: 0,
        unreadAlerts: 0,
        adherenceRate: 1,
      };
    }

    const [totalPatients, highRiskPatients, openTickets, criticalTickets, unreadAlerts] =
      await Promise.all([
        this.planRepo.count({
          where: { facilityId, patientState: Not(In(TERMINAL_STATES)) },
        }),
        this.planRepo.count({
          where: { facilityId, patientState: In(HIGH_RISK_STATES) },
        }),
        this.ticketRepo.count({
          where: { facilityId, status: In(OPEN_TICKET_STATUSES) },
        }),
        this.ticketRepo.count({
          where: {
            facilityId,
            status: In(OPEN_TICKET_STATUSES),
            priority: "CRITICAL",
          },
        }),
        this.alertRepo.count({ where: { facilityId, isRead: false } }),
      ]);

    return {
      role: "NAKES",
      totalPatients,
      highRiskPatients,
      openTickets,
      criticalTickets,
      unreadAlerts,
      adherenceRate: await this.facilityAdherence(facilityId, today),
    };
  }

  /**
   * Weighted facility adherence: Σfulfilled / Σelapsed over active plans.
   *
   * Query Builder is required here: the answer is an aggregate over a join,
   * and fetching every check-in just to sum it would move thousands of rows
   * per dashboard load. The per-plan elapsed-day maths stays in JS because it
   * depends on start/end dates and on whether today is already fulfilled.
   */
  private async facilityAdherence(facilityId: string, today: string): Promise<number> {
    const rows = await this.planRepo
      .createQueryBuilder("plan")
      .leftJoin(DailyCheckIn, "ci", "ci.treatment_plan_id = plan.id")
      .select("plan.id", "id")
      .addSelect("plan.start_date", "startDate")
      .addSelect("plan.target_end_date", "targetEndDate")
      .addSelect(
        "COUNT(DISTINCT ci.check_in_date) FILTER (WHERE ci.is_dose_fulfilled = true)",
        "fulfilledDays",
      )
      .addSelect(
        "BOOL_OR(ci.check_in_date = :today AND ci.is_dose_fulfilled = true)",
        "fulfilledToday",
      )
      .where("plan.facility_id = :facilityId", { facilityId })
      .andWhere("plan.patient_state NOT IN (:...terminalStates)", {
        terminalStates: TERMINAL_STATES,
      })
      .setParameter("today", today)
      .groupBy("plan.id")
      .getRawMany<{
        id: string;
        startDate: string;
        targetEndDate: string;
        fulfilledDays: string;
        fulfilledToday: boolean | null;
      }>();

    let fulfilledTotal = 0;
    let elapsedTotal = 0;

    for (const row of rows) {
      const elapsed = elapsedDays(
        toDateString(row.startDate),
        toDateString(row.targetEndDate),
        today,
        row.fulfilledToday === true,
      );
      if (elapsed <= 0) continue;
      fulfilledTotal += Number(row.fulfilledDays ?? 0);
      elapsedTotal += elapsed;
    }

    return adherenceRate(fulfilledTotal, elapsedTotal);
  }

  private async getAdminStats(): Promise<StatsResponse> {
    // Demo rows are ephemeral (deleted at session expiry); keep the ADMIN
    // global counts on real rows only.
    const [totalFacilities, totalNakes, totalPatients, totalActiveTickets] =
      await Promise.all([
        this.facilityRepo.count({ where: { code: Not(Like("DEMO-%")) } }),
        this.userRepo.count({
          where: { role: "NAKES", demoSessionId: IsNull() },
        }),
        this.userRepo.count({
          where: { role: "PASIEN", demoSessionId: IsNull() },
        }),
        this.ticketRepo.count({
          where: {
            status: In(OPEN_TICKET_STATUSES),
            facility: { code: Not(Like("DEMO-%")) },
          },
        }),
      ]);

    return {
      role: "ADMIN",
      totalFacilities,
      totalNakes,
      totalPatients,
      totalActiveTickets,
    };
  }
}
