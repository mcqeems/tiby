import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash, randomBytes } from "node:crypto";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../../family-contacts/entities/family-contact.entity.js";
import { Facility } from "../../facilities/entities/facilities.entity.js";
import { PatientStatusHistory } from "../../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../../internal/audit/entities/audit-log.entity.js";
import { auth } from "../../../auth/auth.config.js";
import { AiClientService } from "../../internal/ai-client/ai-client.service.js";
import type {
  CreateOnboardingDto,
  OnboardingCredentials,
  OcrOnboardingDraft,
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
    private readonly aiClient: AiClientService,
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
      let facility = await this.facilityRepo.findOne({
        where: {},
        order: { createdAt: "ASC" },
      });
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

    const patientPassword = generatePassword();

    // Resolve the PMO: either an existing account referenced by id, or a new one.
    let pmoUserId: string;
    let pmoUsername: string;
    let pmoPassword: string | null = null;
    let pmoCreated = false;

    if ("id" in dto.pmo) {
      const existingPmo = await this.userRepo.findOneBy({ id: dto.pmo.id });
      if (!existingPmo) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "PMO user not found",
        });
      }
      if (existingPmo.role !== "PMO") {
        throw new BadRequestException({
          code: "BAD_REQUEST",
          message: "Selected user is not a PMO",
        });
      }
      if (existingPmo.facilityId && existingPmo.facilityId !== facilityId) {
        throw new BadRequestException({
          code: "BAD_REQUEST",
          message: "Selected PMO belongs to a different facility",
        });
      }

      pmoUserId = existingPmo.id;
      pmoUsername = existingPmo.username ?? "";
    } else {
      const existingPmo = await this.userRepo.findOneBy({ username: dto.pmo.username });
      if (existingPmo) {
        throw new BadRequestException({
          code: "BAD_REQUEST",
          message: `Username '${dto.pmo.username}' is already taken`,
        });
      }

      pmoPassword = generatePassword();

      // Create PMO Account via Better Auth
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

      pmoUserId = pmoAuth.user.id;
      pmoUsername = dto.pmo.username;
      pmoCreated = true;
    }

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
        pmoUserId,
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
          pmoUserId,
          pmoMode: pmoCreated ? "new" : "existing",
          regimenCode: dto.regimenCode,
        },
      }),
    );

    return {
      treatmentPlanId: plan.id,
      patientUsername: dto.patient.username,
      patientPassword,
      pmoUsername,
      pmoPassword,
      patientUserId: patientAuth.user.id,
      pmoUserId,
      pmoCreated,
    };
  }

  /**
   * Bridge to the AI service's treatment-card OCR.
   *
   * The draft is unconfirmed input for the form, never a saved treatment plan:
   * the Nakes reviews every field and then posts `/api/faskes/onboarding`
   * themselves. A failed scan is reported, not papered over with defaults.
   */
  async extractOcr(file?: Express.Multer.File): Promise<OcrOnboardingDraft> {
    if (!file) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "cardImage is required.",
      });
    }

    return this.aiClient.extractOnboardingCard(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

}
