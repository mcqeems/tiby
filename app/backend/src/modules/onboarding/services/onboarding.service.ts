import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash, randomBytes } from "node:crypto";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../../family-contacts/entities/family-contact.entity.js";
import { Facility } from "../../facilities/entities/facility.entity.js";
import { PatientStatusHistory } from "../../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../../audit/entities/audit-log.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { PushSubscription } from "../../push/entities/push-subscription.entity.js";
import { auth } from "../../../auth/auth.config.js";
import type {
  CreateOnboardingDto,
  OnboardingCredentials,
  OcrOnboardingDraft,
  ListPatientsQuery,
  RiskSortedPatientList,
  RiskSortedPatientItem,
  PatientState,
  TreatmentPhase,
} from "@tiby/ts-shared";

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return createHash("sha256").update(digits).digest("hex");
}

function generatePassword(): string {
  return randomBytes(4).toString("hex") + "A1!";
}

function calculateTargetEndDate(startDateStr: string, days = 180): string {
  const date = new Date(startDateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(FamilyContact)
    private readonly familyRepo: Repository<FamilyContact>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(PushSubscription)
    private readonly pushRepo: Repository<PushSubscription>,
  ) {}

  async createOnboarding(
    nakesUserId: string,
    dto: CreateOnboardingDto,
  ): Promise<OnboardingCredentials> {
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    if (!nakes) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Nakes user not found" });
    }

    // Resolve facility (use Nakes facility or fallback to first facility)
    let facilityId = nakes.facilityId;
    if (!facilityId) {
      let facility = await this.facilityRepo.findOne({ where: {} });
      if (!facility) {
        facility = await this.facilityRepo.save(
          this.facilityRepo.create({
            code: "PUSK-DEFAULT",
            name: "Puskesmas Kecamatan",
            district: "Wilayah Faskes",
            emergencyPhone: "0811-000-000",
          }),
        );
      }
      facilityId = facility.id;
      nakes.facilityId = facilityId;
      await this.userRepo.save(nakes);
    }

    // Check if usernames already exist
    const existingPatient = await this.userRepo.findOneBy({ username: dto.patient.username });
    if (existingPatient) {
      throw new BadRequestException({
        code: "BAD_REQUEST",
        message: `Username '${dto.patient.username}' is already taken`,
      });
    }

    const existingPmo = await this.userRepo.findOneBy({ username: dto.pmo.username });
    if (existingPmo) {
      throw new BadRequestException({
        code: "BAD_REQUEST",
        message: `Username '${dto.pmo.username}' is already taken`,
      });
    }

    const patientPassword = generatePassword();
    const pmoPassword = generatePassword();

    // 1. Create Patient Account via Better Auth
    const patientAuth = await auth.api.createUser({
      body: {
        name: dto.patient.fullName,
        email: `${dto.patient.username}@users.tiby.internal`,
        password: patientPassword,
        role: "PASIEN",
        data: {
          username: dto.patient.username,
          displayUsername: dto.patient.username,
          facility_id: facilityId,
          full_name_encrypted: dto.patient.fullName,
          whatsapp_encrypted: dto.patient.whatsappNumber,
          whatsapp_hash: hashPhone(dto.patient.whatsappNumber),
          whatsapp_verified: false,
          must_confirm_consent: true,
        },
      },
    });

    // 2. Create PMO Account via Better Auth
    const pmoAuth = await auth.api.createUser({
      body: {
        name: dto.pmo.fullName,
        email: `${dto.pmo.username}@users.tiby.internal`,
        password: pmoPassword,
        role: "PMO",
        data: {
          username: dto.pmo.username,
          displayUsername: dto.pmo.username,
          facility_id: facilityId,
          full_name_encrypted: dto.pmo.fullName,
          whatsapp_encrypted: dto.pmo.whatsappNumber,
          whatsapp_hash: hashPhone(dto.pmo.whatsappNumber),
          whatsapp_verified: false,
          must_confirm_consent: true,
        },
      },
    });

    const targetEndDate = calculateTargetEndDate(dto.startDate, 180);

    // 3. Create TreatmentPlan
    const plan = await this.planRepo.save(
      this.planRepo.create({
        patientUserId: patientAuth.user.id,
        facilityId,
        registeredByNakesId: nakesUserId,
        phase: "INTENSIF",
        patientState: "PENDING",
        regimenCode: dto.regimenCode,
        dailyPillQuota: dto.dailyPillQuota,
        reminderTimeLocal: dto.reminderTimeLocal,
        timezone: dto.timezone || "Asia/Jakarta",
        startDate: dto.startDate,
        targetEndDate,
        currentStreak: 0,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );

    // 4. Create PMO Assignment
    await this.pmoRepo.save(
      this.pmoRepo.create({
        treatmentPlanId: plan.id,
        pmoUserId: pmoAuth.user.id,
        relationship: dto.pmo.relationship,
        isPrimary: true,
        active: true,
      }),
    );

    // 5. Create Family Contact if provided
    if (dto.familyContact) {
      await this.familyRepo.save(
        this.familyRepo.create({
          treatmentPlanId: plan.id,
          addedByUserId: nakesUserId,
          nameEncrypted: dto.familyContact.fullName,
          whatsappEncrypted: dto.familyContact.whatsappNumber,
          whatsappHash: hashPhone(dto.familyContact.whatsappNumber),
          whatsappVerified: false,
          notifyOnEscalation: dto.familyContact.notifyOnEscalation,
        }),
      );
    }

    // 6. Log Initial Status History
    await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: "STATE_TRANSITION",
        previousState: null,
        newState: "PENDING",
        previousStreak: 0,
        newStreak: 0,
        actorUserId: nakesUserId,
        actorRole: "NAKES",
        reasonOrSummary: "Patient registered at facility and awaiting initial consent",
      }),
    );

    // 7. UU PDP Audit Log
    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: nakesUserId,
        actorRole: "NAKES",
        action: "ONBOARD_PATIENT",
        targetEntity: "treatment_plans",
        targetId: plan.id,
        metadataJson: {
          patientUserId: patientAuth.user.id,
          pmoUserId: pmoAuth.user.id,
          regimenCode: dto.regimenCode,
        },
      }),
    );

    return {
      treatmentPlanId: plan.id,
      patientUsername: dto.patient.username,
      patientPassword,
      pmoUsername: dto.pmo.username,
      pmoPassword,
      patientUserId: patientAuth.user.id,
      pmoUserId: pmoAuth.user.id,
    };
  }

  async extractOcr(file?: Express.Multer.File): Promise<OcrOnboardingDraft> {
    const today = new Date().toISOString().slice(0, 10);
    const targetEndDate = calculateTargetEndDate(today, 180);

    if (!file) {
      return {
        patientName: null,
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        startDate: today,
        targetEndDate,
        confidence: 0.8,
        rawText: "Template draft without image",
      };
    }

    // Call FastAPI AI service or fallback
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
      formData.append("cardImage", blob, file.originalname);

      const res = await fetch(`${aiServiceUrl}/ocr/extract`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        return (await res.json()) as OcrOnboardingDraft;
      }
    } catch {
      // Graceful fallback when FastAPI is offline in test or local dev
    }

    return {
      patientName: null,
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      startDate: today,
      targetEndDate,
      confidence: 0.85,
      rawText: `Scanned file: ${file.originalname}`,
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
}
