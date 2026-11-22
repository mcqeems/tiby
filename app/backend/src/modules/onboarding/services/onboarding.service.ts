import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from "@nestjs/common";
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

/**
 * How long the OCR call may take before we give up.
 *
 * The previous 5000ms ceiling was below the real OCR time on a small CPU-only
 * host, so a slow-but-successful read was aborted and replaced with fake data.
 * The AI service is already 2.4x faster than it was; this ceiling leaves room
 * for a cold page cache on the deployed box without hanging a request forever.
 */
const DEFAULT_OCR_TIMEOUT_MS = 20_000;

function resolveOcrTimeoutMs(): number {
  const raw = process.env.OCR_TIMEOUT_MS;
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OCR_TIMEOUT_MS;
  }
  return parsed;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly ocrTimeoutMs = resolveOcrTimeoutMs();

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

  async extractOcr(file?: Express.Multer.File): Promise<OcrOnboardingDraft> {
    const today = new Date().toISOString().slice(0, 10);
    const targetEndDate = calculateTargetEndDate(today, 180);

    if (!file) {
      // No image at all: this is the manual-entry starting point, not OCR.
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

    // A card image was uploaded, so the caller expects the card's own values.
    // Returning a canned FDC-4 template here would be indistinguishable from a
    // successful read at confidence 0.85, and a Nakes could save it as fact.
    // Refuse instead: an error the caller can show is safe, fake data is not.
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const timeoutMs = this.ocrTimeoutMs;

    let res: Response;
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
      formData.append("cardImage", blob, file.originalname);

      res = await fetch(`${aiServiceUrl}/ocr/extract`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: unknown) {
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `OCR request failed (${timedOut ? `timeout ${timeoutMs}ms` : reason}).`,
      );
      if (timedOut) {
        throw new GatewayTimeoutException({
          code: "AI_TIMEOUT",
          message:
            "Pembacaan kartu memakan waktu terlalu lama. Coba lagi atau masukkan data secara manual.",
        });
      }
      throw new ServiceUnavailableException({
        code: "AI_UNAVAILABLE",
        message:
          "Layanan pembaca kartu sedang tidak tersedia. Masukkan data secara manual.",
      });
    }

    if (!res.ok) {
      // The AI service is up but could not read the image (422), rejected the
      // upload (413/415), or failed (5xx). Pass that along rather than
      // substituting values the card never contained.
      this.logger.warn(`OCR upstream returned ${res.status}.`);
      if (res.status === 413 || res.status === 415 || res.status === 422) {
        throw new BadRequestException({
          code: "OCR_UNREADABLE",
          message:
            "Foto kartu tidak bisa dibaca. Pastikan gambar jelas dan tidak terlalu besar.",
        });
      }
      throw new ServiceUnavailableException({
        code: "AI_UNAVAILABLE",
        message:
          "Layanan pembaca kartu sedang tidak tersedia. Masukkan data secara manual.",
      });
    }

    return (await res.json()) as OcrOnboardingDraft;
  }

}
