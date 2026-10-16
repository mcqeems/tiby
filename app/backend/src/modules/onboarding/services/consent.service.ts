import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConsentRecord } from "../entities/consent-record.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { TreatmentPlan } from "../../treatments/entities/treatment-plan.entity.js";
import { FacilityAlert } from "../../facilities/entities/facility-alert.entity.js";
import { PatientStatusHistory } from "../../treatments/entities/patient-status-history.entity.js";
import { AuditLog } from "../../audit/entities/audit-log.entity.js";
import type {
  ConsentStatus,
  GrantConsentDto,
  RevokeConsentDto,
} from "@tiby/ts-shared";

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(ConsentRecord)
    private readonly consentRepo: Repository<ConsentRecord>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async getConsentStatus(userId: string): Promise<ConsentStatus> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found" });
    }

    const records = await this.consentRepo.find({
      where: { userId },
      order: { grantedAt: "DESC" },
    });

    const activeRecords = records.filter((r) => !r.revokedAt);
    const active = activeRecords.length > 0 && !user.mustConfirmConsent;

    return {
      active,
      grantedAt: activeRecords[0]?.grantedAt ? activeRecords[0].grantedAt.toISOString() : null,
      revokedAt: records[0]?.revokedAt ? records[0].revokedAt.toISOString() : null,
      scopes: activeRecords.map((r) => r.scope),
      mustConfirmConsent: user.mustConfirmConsent,
    };
  }

  async grantConsent(
    userId: string,
    dto: GrantConsentDto,
    ipAddress?: string,
  ): Promise<ConsentStatus> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found" });
    }

    // Save individual consent records
    for (const scope of dto.scopes) {
      const record = this.consentRepo.create({
        userId,
        scope,
        consentVersion: "1.0",
        ipAddress: ipAddress ?? null,
      });
      await this.consentRepo.save(record);
    }

    // Update user consent state
    user.mustConfirmConsent = false;
    await this.userRepo.save(user);

    // If patient has pending treatment plan, transition to AKTIF
    const plan = await this.planRepo.findOneBy({ patientUserId: userId });
    if (plan && plan.patientState === "PENDING") {
      const previousState = plan.patientState;
      plan.patientState = "AKTIF";
      await this.planRepo.save(plan);

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: "STATE_TRANSITION",
          previousState,
          newState: "AKTIF",
          previousStreak: plan.currentStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: user.role,
          reasonOrSummary: "Patient confirmed initial treatment consent and schedule",
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: userId,
        actorRole: user.role,
        action: "GRANT_CONSENT",
        targetEntity: "consent_records",
        targetId: userId,
        ipAddress: ipAddress ?? null,
        metadataJson: { scopes: dto.scopes },
      }),
    );

    return this.getConsentStatus(userId);
  }

  async revokeConsent(
    userId: string,
    dto: RevokeConsentDto,
    ipAddress?: string,
  ): Promise<ConsentStatus> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "User not found" });
    }

    // Mark active consent records as revoked
    const activeRecords = await this.consentRepo.find({
      where: { userId },
    });
    const now = new Date();
    for (const r of activeRecords) {
      if (!r.revokedAt) {
        r.revokedAt = now;
        await this.consentRepo.save(r);
      }
    }

    user.mustConfirmConsent = true;
    await this.userRepo.save(user);

    // Transition treatment plan to DIPANTAU_TERBATAS
    const plan = await this.planRepo.findOneBy({ patientUserId: userId });
    if (plan) {
      const previousState = plan.patientState;
      plan.patientState = "DIPANTAU_TERBATAS";
      await this.planRepo.save(plan);

      await this.alertRepo.save(
        this.alertRepo.create({
          facilityId: plan.facilityId,
          treatmentPlanId: plan.id,
          alertType: "CONSENT_REVOKED_WARNING",
          severity: "HIGH",
          title: "Persetujuan Pasien Dicabut",
          message: dto.reason || "Pasien mencabut persetujuan berbagi data klinis.",
        }),
      );

      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: plan.id,
          eventType: "CONSENT_CHANGED",
          previousState,
          newState: "DIPANTAU_TERBATAS",
          previousStreak: plan.currentStreak,
          newStreak: plan.currentStreak,
          actorUserId: userId,
          actorRole: user.role,
          reasonOrSummary: dto.reason || "Patient revoked data consent",
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: userId,
        actorRole: user.role,
        action: "REVOKE_CONSENT",
        targetEntity: "consent_records",
        targetId: userId,
        ipAddress: ipAddress ?? null,
        metadataJson: { reason: dto.reason },
      }),
    );

    return this.getConsentStatus(userId);
  }
}
