import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TreatmentPlan } from '../entities/treatment-plan.entity.js';
import { PatientStatusHistory } from '../entities/patient-status-history.entity.js';
import { PmoAssignment } from '../entities/pmo-assignment.entity.js';
import { DailyCheckIn } from '../../check-ins/entities/daily-check-in.entity.js';
import { SafetyEvaluation } from '../../internal/rule-engine/entities/safety-evaluation.entity.js';
import { PushSubscription } from '../../push/entities/push-subscription.entity.js';
import { AuthUser } from '../../../auth/entities/auth-user.entity.js';
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
} from '@tiby/ts-shared';

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
    nakesUserId: string,
    treatmentPlanId: string,
    page = 1,
    limit = 50,
    eventType?: string,
  ): Promise<PatientStatusHistoryList> {
    // A NAKES may only read plans in their own facility. 404 (not 403) so the
    // endpoint never reveals whether a plan exists elsewhere.
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    const plan = await this.planRepo.findOneBy({ id: treatmentPlanId });
    if (!nakes?.facilityId || !plan || plan.facilityId !== nakes.facilityId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Treatment plan not found',
      });
    }

    const [records, total] = await this.historyRepo.findAndCount({
      where: { treatmentPlanId, ...(eventType ? { eventType } : {}) },
      // `id` is the tie-break: offset pagination is only stable with a total order.
      order: { createdAt: 'DESC', id: 'DESC' },
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // A NAKES without a facility must not page through every facility.
    if (!facilityId) {
      return { items: [], total: 0, page, limit };
    }

    // Query Builder is required here: the PMO-name search below is an EXISTS
    // correlated subquery, which the Repository API cannot express.
    const qb = this.planRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.patientUser', 'patient')
      .andWhere('plan.facilityId = :facilityId', { facilityId });

    if (query.treatmentPlanId) {
      qb.andWhere('plan.id = :treatmentPlanId', {
        treatmentPlanId: query.treatmentPlanId,
      });
    }

    if (query.state) {
      qb.andWhere('plan.patientState = :state', { state: query.state });
    }

    if (query.phase) {
      qb.andWhere('plan.phase = :phase', { phase: query.phase });
    }

    if (query.search) {
      qb.andWhere(
        `(patient.name ILIKE :search
          OR patient.username ILIKE :search
          OR EXISTS (
            SELECT 1 FROM pmo_assignments search_pmo
            JOIN users search_pmo_user ON search_pmo_user.id = search_pmo.pmo_user_id
            WHERE search_pmo.treatment_plan_id = plan.id
              AND search_pmo.active = true
              AND (search_pmo_user.name ILIKE :search OR search_pmo_user.username ILIKE :search)
          ))`,
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.orderBy('plan.riskScore', 'DESC')
      .addOrderBy('plan.consecutiveSilenceDays', 'DESC')
      .addOrderBy('plan.createdAt', 'DESC')
      .addOrderBy('plan.id', 'DESC');

    qb.skip((page - 1) * limit).take(limit);

    const [plans, total] = await qb.getManyAndCount();

    const planIds = plans.map((p) => p.id);
    const assignments = planIds.length
      ? await this.pmoRepo.find({
          where: { treatmentPlanId: In(planIds), active: true },
          relations: { pmoUser: true },
        })
      : [];

    const pmoByPlan = new Map<string, PmoAssignment>();
    for (const a of assignments) {
      const current = pmoByPlan.get(a.treatmentPlanId);
      if (!current || (a.isPrimary && !current.isPrimary)) {
        pmoByPlan.set(a.treatmentPlanId, a);
      }
    }

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
          order: { checkInDate: 'DESC' },
        });

        const pushCount = await this.pushRepo.countBy({
          userId: p.patientUserId,
        });

        const pmo = pmoByPlan.get(p.id);

        return {
          id: p.id,
          patientUserId: p.patientUserId,
          patientName: p.patientUser?.name || 'Pasien',
          username: p.patientUser?.username || '',
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
          pmo: pmo
            ? {
                userId: pmo.pmoUserId,
                fullName: pmo.pmoUser?.name || "PMO",
                username: pmo.pmoUser?.username || "",
                whatsappNumber: pmo.pmoUser?.whatsappEncrypted ?? null,
                relationship: pmo.relationship,
                isPrimary: pmo.isPrimary,
              }
            : null,
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
    // Two lookups, not `where: [{...}, {...}]`: `id` is a uuid column while
    // patientOrPlanId may be a non-uuid patient id, which Postgres rejects.
    const plan =
      (await this.planRepo.findOneBy({ patientUserId: patientOrPlanId })) ??
      (await this.planRepo.findOneBy({ id: patientOrPlanId }));
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
