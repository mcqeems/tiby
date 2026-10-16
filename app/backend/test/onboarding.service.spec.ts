import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { OnboardingService } from "../src/modules/onboarding/services/onboarding.service.js";
import { auth } from "../src/auth/auth.config.js";

describe("OnboardingService Unit Tests", () => {
  let service: OnboardingService;

  let mockUserRepo: any;
  let mockPlanRepo: any;
  let mockPmoRepo: any;
  let mockFamilyRepo: any;
  let mockFacilityRepo: any;
  let mockHistoryRepo: any;
  let mockAuditRepo: any;
  let mockCheckInRepo: any;
  let mockPushRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPlanRepo = {
      create: vi.fn((data) => ({ id: "plan-generated-uuid", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "plan-generated-uuid", ...data })),
      createQueryBuilder: vi.fn(),
    };
    mockPmoRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockFamilyRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockFacilityRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: "facility-default-uuid", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "facility-default-uuid", ...data })),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAuditRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockCheckInRepo = {
      findOne: vi.fn(),
    };
    mockPushRepo = {
      countBy: vi.fn().mockResolvedValue(0),
    };

    service = new OnboardingService(
      mockUserRepo,
      mockPlanRepo,
      mockPmoRepo,
      mockFamilyRepo,
      mockFacilityRepo,
      mockHistoryRepo,
      mockAuditRepo,
      mockCheckInRepo,
      mockPushRepo,
    );
  });

  describe("createOnboarding", () => {
    it("throws NotFoundException if Nakes user is not found", async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.createOnboarding("nonexistent-nakes", {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException if patient username is already taken", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" })
        .mockResolvedValueOnce({ id: "existing-patient", username: "budi123" });

      await expect(
        service.createOnboarding("nakes-1", {
          patient: { username: "budi123", fullName: "Budi", whatsappNumber: "0812" },
          pmo: { username: "sri123", fullName: "Sri", whatsappNumber: "0813", relationship: "KELUARGA" },
          regimenCode: "FDC-4",
          dailyPillQuota: 4,
          reminderTimeLocal: "08:00",
          startDate: "2026-10-16",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates Patient and PMO, sets 180-day targetEndDate, saves treatment plan and pmo assignment", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" }) // nakes
        .mockResolvedValueOnce(null) // patient username check
        .mockResolvedValueOnce(null); // pmo username check

      vi.spyOn(auth.api, "createUser")
        .mockResolvedValueOnce({ user: { id: "new-patient-id", email: "p@tiby.internal" } } as any)
        .mockResolvedValueOnce({ user: { id: "new-pmo-id", email: "pmo@tiby.internal" } } as any);

      const res = await service.createOnboarding("nakes-1", {
        patient: { username: "budi_new", fullName: "Budi Santoso", whatsappNumber: "0812345678" },
        pmo: { username: "sri_new", fullName: "Sri Wahyuni", whatsappNumber: "0812987654", relationship: "KELUARGA" },
        familyContact: { fullName: "Joko", whatsappNumber: "08130000", notifyOnEscalation: true },
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        startDate: "2026-10-16",
      });

      expect(res.patientUsername).toBe("budi_new");
      expect(res.patientPassword).toBeDefined();
      expect(res.pmoUsername).toBe("sri_new");
      expect(res.pmoPassword).toBeDefined();
      expect(res.patientUserId).toBe("new-patient-id");
      expect(res.pmoUserId).toBe("new-pmo-id");

      // Verify TreatmentPlan creation: 180 days calculation from 2026-10-16 -> 2027-04-14
      expect(mockPlanRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          patientUserId: "new-patient-id",
          facilityId: "faskes-1",
          registeredByNakesId: "nakes-1",
          phase: "INTENSIF",
          patientState: "PENDING",
          startDate: "2026-10-16",
          targetEndDate: "2027-04-14",
          currentStreak: 0,
        }),
      );

      // Verify PMO Assignment saved
      expect(mockPmoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pmoUserId: "new-pmo-id",
          relationship: "KELUARGA",
          isPrimary: true,
          active: true,
        }),
      );

      // Verify Family Contact saved
      expect(mockFamilyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          addedByUserId: "nakes-1",
          notifyOnEscalation: true,
        }),
      );
    });
  });

  describe("extractOcr", () => {
    it("returns default draft when no file is uploaded", async () => {
      const draft = await service.extractOcr(undefined);
      expect(draft.regimenCode).toBe("FDC-4");
      expect(draft.dailyPillQuota).toBe(4);
      expect(draft.confidence).toBe(0.8);
      expect(draft.patientName).toBeNull();
    });

    it("returns scanned fallback draft when file is provided and AI service is unreachable", async () => {
      const mockFile = {
        originalname: "tb_card.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("image-bytes"),
      } as Express.Multer.File;

      const draft = await service.extractOcr(mockFile);
      expect(draft.regimenCode).toBe("FDC-4");
      expect(draft.dailyPillQuota).toBe(4);
      expect(draft.rawText).toContain("tb_card.jpg");
    });
  });
});
