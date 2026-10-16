import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ConsentService } from "../src/modules/onboarding/services/consent.service.js";

describe("ConsentService Unit Tests", () => {
  let service: ConsentService;

  let mockConsentRepo: any;
  let mockUserRepo: any;
  let mockPlanRepo: any;
  let mockAlertRepo: any;
  let mockHistoryRepo: any;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockConsentRepo = {
      find: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPlanRepo = {
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAlertRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAuditRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    service = new ConsentService(
      mockConsentRepo,
      mockUserRepo,
      mockPlanRepo,
      mockAlertRepo,
      mockHistoryRepo,
      mockAuditRepo,
    );
  });

  describe("getConsentStatus", () => {
    it("throws NotFoundException if user does not exist", async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);
      await expect(service.getConsentStatus("nonexistent")).rejects.toThrow(NotFoundException);
    });

    it("returns active: false when user mustConfirmConsent is true", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "user-1", mustConfirmConsent: true });
      mockConsentRepo.find.mockResolvedValue([]);

      const res = await service.getConsentStatus("user-1");
      expect(res.active).toBe(false);
      expect(res.mustConfirmConsent).toBe(true);
      expect(res.scopes).toEqual([]);
    });

    it("returns active: true when active consent records exist and mustConfirmConsent is false", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "user-1", mustConfirmConsent: false });
      mockConsentRepo.find.mockResolvedValue([
        { scope: "PATIENT_DATA_SHARE", grantedAt: new Date("2026-10-16"), revokedAt: null },
      ]);

      const res = await service.getConsentStatus("user-1");
      expect(res.active).toBe(true);
      expect(res.mustConfirmConsent).toBe(false);
      expect(res.scopes).toContain("PATIENT_DATA_SHARE");
    });
  });

  describe("grantConsent", () => {
    it("persists consent records, sets mustConfirmConsent=false, and transitions PENDING plan to AKTIF", async () => {
      const user = { id: "user-1", role: "PASIEN", mustConfirmConsent: true };
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockConsentRepo.find.mockResolvedValue([
        { scope: "PATIENT_DATA_SHARE", grantedAt: new Date(), revokedAt: null },
      ]);

      const plan = {
        id: "plan-1",
        patientUserId: "user-1",
        patientState: "PENDING",
        currentStreak: 0,
      };
      mockPlanRepo.findOneBy.mockResolvedValue(plan);

      const res = await service.grantConsent("user-1", {
        scopes: ["PATIENT_DATA_SHARE", "STT_AUDIO_PROCESSING"],
        scheduleConfirmed: true,
      });

      expect(user.mustConfirmConsent).toBe(false);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);

      // Verify TreatmentPlan state transitioned to AKTIF
      expect(plan.patientState).toBe("AKTIF");
      expect(mockPlanRepo.save).toHaveBeenCalledWith(plan);

      // Verify Status History and Audit Log written
      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          newState: "AKTIF",
          eventType: "STATE_TRANSITION",
        }),
      );
      expect(mockAuditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "GRANT_CONSENT",
          actorUserId: "user-1",
        }),
      );
      expect(res.mustConfirmConsent).toBe(false);
    });
  });

  describe("revokeConsent", () => {
    it("marks records revoked, sets mustConfirmConsent=true, transitions plan to DIPANTAU_TERBATAS, creates warning alert", async () => {
      const user = { id: "user-1", role: "PASIEN", mustConfirmConsent: false };
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const activeRecord = { id: "rec-1", userId: "user-1", scope: "PATIENT_DATA_SHARE", revokedAt: null };
      mockConsentRepo.find.mockResolvedValue([activeRecord]);

      const plan = {
        id: "plan-1",
        facilityId: "faskes-1",
        patientUserId: "user-1",
        patientState: "AKTIF",
        currentStreak: 5,
      };
      mockPlanRepo.findOneBy.mockResolvedValue(plan);

      await service.revokeConsent("user-1", { reason: "Tidak ingin berbagi data" });

      expect(activeRecord.revokedAt).toBeDefined();
      expect(user.mustConfirmConsent).toBe(true);
      expect(plan.patientState).toBe("DIPANTAU_TERBATAS");

      // Verify alert created
      expect(mockAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "faskes-1",
          treatmentPlanId: "plan-1",
          alertType: "CONSENT_REVOKED_WARNING",
          severity: "HIGH",
        }),
      );

      // Verify status history
      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          previousState: "AKTIF",
          newState: "DIPANTAU_TERBATAS",
          eventType: "CONSENT_CHANGED",
        }),
      );

      // Verify audit log
      expect(mockAuditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "REVOKE_CONSENT",
          actorUserId: "user-1",
        }),
      );
    });
  });
});
