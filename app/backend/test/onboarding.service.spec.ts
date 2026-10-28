import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
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
  let mockAiClient: any;

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

    mockAiClient = { extractOnboardingCard: vi.fn() };

    service = new OnboardingService(
      mockUserRepo,
      mockPlanRepo,
      mockPmoRepo,
      mockFamilyRepo,
      mockFacilityRepo,
      mockHistoryRepo,
      mockAuditRepo,
      mockAiClient,
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
        timezone: "Asia/Jakarta",
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
        .mockResolvedValueOnce({ user: { id: "new-pmo-id", email: "pmo@tiby.internal" } } as any)
        .mockResolvedValueOnce({ user: { id: "new-patient-id", email: "p@tiby.internal" } } as any);

      const res = await service.createOnboarding("nakes-1", {
        patient: { username: "budi_new", fullName: "Budi Santoso", whatsappNumber: "0812345678" },
        pmo: { username: "sri_new", fullName: "Sri Wahyuni", whatsappNumber: "0812987654", relationship: "KELUARGA" },
        familyContact: { fullName: "Joko", whatsappNumber: "08130000", notifyOnEscalation: true },
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
      });

      expect(res.patientUsername).toBe("budi_new");
      expect(res.patientPassword).toBeDefined();
      expect(res.pmoUsername).toBe("sri_new");
      expect(res.pmoPassword).toBeDefined();
      expect(res.patientUserId).toBe("new-patient-id");
      expect(res.pmoUserId).toBe("new-pmo-id");
      expect(res.pmoCreated).toBe(true);

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

    it("links an existing PMO by id without creating an account", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" }) // nakes
        .mockResolvedValueOnce(null) // patient username check
        .mockResolvedValueOnce({
          id: "existing-pmo-id",
          username: "sri_lama",
          role: "PMO",
          facilityId: "faskes-1",
        }); // existing PMO lookup

      const createUserSpy = vi
        .spyOn(auth.api, "createUser")
        .mockReset()
        .mockResolvedValue({ user: { id: "new-patient-id" } } as any);

      const res = await service.createOnboarding("nakes-1", {
        patient: { username: "budi_new", fullName: "Budi", whatsappNumber: "0812345678" },
        pmo: { id: "existing-pmo-id", relationship: "KADER" },
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
      } as any);

      // only the patient account was created
      expect(createUserSpy).toHaveBeenCalledTimes(1);
      expect(res.pmoUserId).toBe("existing-pmo-id");
      expect(res.pmoUsername).toBe("sri_lama");
      expect(res.pmoPassword).toBeNull();
      expect(res.pmoCreated).toBe(false);

      expect(mockPmoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pmoUserId: "existing-pmo-id",
          relationship: "KADER",
          isPrimary: true,
          active: true,
        }),
      );
    });

    it("throws NotFoundException when the referenced PMO id does not exist", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" })
        .mockResolvedValueOnce(null) // patient username check
        .mockResolvedValueOnce(null); // PMO lookup misses

      await expect(
        service.createOnboarding("nakes-1", {
          patient: { username: "budi_new", fullName: "Budi", whatsappNumber: "0812345678" },
          pmo: { id: "missing-pmo", relationship: "KELUARGA" },
          regimenCode: "FDC-4",
          dailyPillQuota: 4,
          reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
          startDate: "2026-10-16",
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects a referenced user whose role is not PMO", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "u-1", role: "PASIEN", facilityId: "faskes-1" });

      await expect(
        service.createOnboarding("nakes-1", {
          patient: { username: "budi_new", fullName: "Budi", whatsappNumber: "0812345678" },
          pmo: { id: "u-1", relationship: "KELUARGA" },
          regimenCode: "FDC-4",
          dailyPillQuota: 4,
          reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
          startDate: "2026-10-16",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an existing PMO that belongs to another facility", async () => {
      mockUserRepo.findOneBy
        .mockResolvedValueOnce({ id: "nakes-1", role: "NAKES", facilityId: "faskes-1" })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "pmo-other",
          username: "sri_other",
          role: "PMO",
          facilityId: "faskes-OTHER",
        });

      await expect(
        service.createOnboarding("nakes-1", {
          patient: { username: "budi_new", fullName: "Budi", whatsappNumber: "0812345678" },
          pmo: { id: "pmo-other", relationship: "KELUARGA" },
          regimenCode: "FDC-4",
          dailyPillQuota: 4,
          reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
          startDate: "2026-10-16",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("extractOcr", () => {
    const file = {
      originalname: "tb_card.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("image-bytes"),
    } as Express.Multer.File;

    const draft = {
      patientName: "BUDI SANTOSO",
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      startDate: "2026-10-28",
      targetEndDate: null,
      confidence: 0.79,
      rawText: "PENANGGULANGAN TBC NASIONAL",
      fieldConfidence: {},
      uncertainties: [],
    };

    it("rejects a scan with no image instead of returning defaults", async () => {
      await expect(service.extractOcr(undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAiClient.extractOnboardingCard).not.toHaveBeenCalled();
    });

    it("delegates the image to the AI client and returns its draft", async () => {
      mockAiClient.extractOnboardingCard.mockResolvedValue(draft);

      await expect(service.extractOcr(file)).resolves.toEqual(draft);
      expect(mockAiClient.extractOnboardingCard).toHaveBeenCalledWith(
        file.buffer,
        "tb_card.jpg",
        "image/jpeg",
      );
    });

    it("propagates an unavailable scan instead of inventing a draft", async () => {
      mockAiClient.extractOnboardingCard.mockRejectedValue(
        new ServiceUnavailableException({
          code: "INTERNAL",
          message: "Card scan is unavailable.",
        }),
      );

      await expect(service.extractOcr(file)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
