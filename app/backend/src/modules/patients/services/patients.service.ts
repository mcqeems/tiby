import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TreatmentPlan } from "../entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "../entities/patient-status-history.entity.js";
import { PmoAssignment } from "../entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../../internal/rule-engine/entities/safety-evaluation.entity.js";
import { PushSubscription } from "../../push/entities/push-subscription.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import type {
  PatientStatusHistoryList,
  PatientStatusHistoryItem,
  PatientStatusEventType,
  ListPatientsQuery,
  RiskSortedPatientList,
  RiskSortedPatientItem,
  PatientState,
  TreatmentPhase,
  PmoPatientStatusList,
  CreatePmoFollowUpDto,
  PmoFollowUpResponse,
  SafetyVerdict,
} from "@tiby/ts-shared";

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(SafetyEvaluation)
    private readonly evalRepo: Repository<SafetyEvaluation>,
    @InjectRepository(PushSubscription)
    private readonly pushRepo: Repository<PushSubscription>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
  ) {}

  async getPatientHistory(
    treatmentPlanId: string,
    page = 1,
    limit = 50,
  ): Promise<PatientStatusHistoryList> {
    const [records, total] = await this.historyRepo.findAndCount({
      where: { treatmentPlanId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items: PatientStatusHistoryItem[] = records.map((r) => ({
      id: r.id,
      treatmentPlanId: r.treatmentPlanId,
      eventType: r.eventType as PatientStatusEventType,
      previousState: r.previousState,
      newState: r.newState,
      previousStreak: r.previousStreak,
      newStreak: r.newStreak,
      actorRole: r.actorRole,
      reasonOrSummary: r.reasonOrSummary,
      metadata: r.metadataJson,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async listPatients(
    nakesUserId: string,
    query: ListPatientsQuery,
  ): Promise<RiskSortedPatientList> {
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    const facilityId = nakes?.facilityId;

    const qb = this.planRepo
      .createQueryBuilder("plan")
      .leftJoinAndSelect("plan.patientUser", "patient")
      .where("1=1");

    if (facilityId) {
      qb.andWhere("plan.facilityId = :facilityId", { facilityId });
    }

    if (query.state) {
      qb.andWhere("plan.patientState = :state", { state: query.state });
    }

    if (query.phase) {
      qb.andWhere("plan.phase = :phase", { phase: query.phase });
    }

    if (query.search) {
      qb.andWhere("(patient.name ILIKE :search OR patient.username ILIKE :search)", {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy("plan.riskScore", "DESC")
      .addOrderBy("plan.consecutiveSilenceDays", "DESC")
      .addOrderBy("plan.createdAt", "DESC");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [plans, total] = await qb.getManyAndCount();

    const todayStr = new Date().toISOString().slice(0, 10);

    const items: RiskSortedPatientItem[] = await Promise.all(
      plans.map(async (p) => {
        const todayLockedCheckIn = await this.checkInRepo.findOne({
          where: {
            treatmentPlanId: p.id,
            checkInDate: todayStr,
            isDoseFulfilled: true,
          },
        });

        const lastCheckIn = await this.checkInRepo.findOne({
          where: { treatmentPlanId: p.id, isDoseFulfilled: true },
          order: { checkInDate: "DESC" },
        });

        const pushCount = await this.pushRepo.countBy({ userId: p.patientUserId });

        return {
          id: p.id,
          patientUserId: p.patientUserId,
          patientName: p.patientUser?.name || "Pasien",
          username: p.patientUser?.username || "",
          patientState: p.patientState as PatientState,
          phase: p.phase as TreatmentPhase,
          regimenCode: p.regimenCode,
          dailyPillQuota: p.dailyPillQuota,
          currentStreak: p.currentStreak,
          consecutiveSilenceDays: p.consecutiveSilenceDays,
          riskScore: p.riskScore,
          lastCheckInDate: lastCheckIn?.checkInDate || null,
          todayCheckInLocked: Boolean(todayLockedCheckIn),
          startDate: p.startDate,
          targetEndDate: p.targetEndDate,
          whatsappVerified: Boolean(p.patientUser?.whatsappVerified),
          pushSubscribed: pushCount > 0,
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
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
          order: { attemptNumber: "DESC" },
        });

        let todayVerdict: SafetyVerdict | null = null;
        if (lockedCheckIn) {
          const ev = await this.evalRepo.findOneBy({
            checkInId: lockedCheckIn.id,
          });
          todayVerdict = (ev?.verdict as SafetyVerdict) ?? "TERKENDALI";
        } else if (latestCheckIn) {
          const ev = await this.evalRepo.findOneBy({
            checkInId: latestCheckIn.id,
          });
          todayVerdict = (ev?.verdict as SafetyVerdict) ?? "PERLU_PERHATIAN";
        }

        return {
          treatmentPlanId: plan.id,
          patientName: plan.patientUser?.name || "Pasien",
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
        code: "NOT_FOUND",
        message: "Treatment plan not found for patient",
      });
    }

    const assignment = await this.pmoRepo.findOne({
      where: { treatmentPlanId: plan.id, pmoUserId, active: true },
    });
    if (!assignment) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "PMO is not assigned to this patient",
      });
    }

    const history = await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: "PMO_OUTREACH",
        previousState: plan.patientState,
        newState: plan.patientState,
        previousStreak: plan.currentStreak,
        newStreak: plan.currentStreak,
        actorUserId: pmoUserId,
        actorRole: "PMO",
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
