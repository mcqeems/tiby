import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { PatientsService } from "../src/modules/patients/services/patients.service.js";

describe("PatientsService Unit Tests", () => {
  let service: PatientsService;

  let mockPlanRepo: any;
  let mockHistoryRepo: any;
  let mockPmoRepo: any;
  let mockCheckInRepo: any;
  let mockEvalRepo: any;
  let mockPushRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockPlanRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    mockHistoryRepo = {
      findAndCount: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve({ id: "history-1", ...data })),
    };
    mockPmoRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
    };
    mockCheckInRepo = {
      findOne: vi.fn(),
    };
    mockEvalRepo = {
      findOneBy: vi.fn(),
    };
    mockPushRepo = {
      countBy: vi.fn().mockResolvedValue(0),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
    };

    service = new PatientsService(
      mockPlanRepo,
      mockHistoryRepo,
      mockPmoRepo,
      mockCheckInRepo,
      mockEvalRepo,
      mockPushRepo,
      mockUserRepo,
    );
  });

  describe("createPmoFollowUp", () => {
    it("logs PMO outreach notes", async () => {
      mockPlanRepo.findOne.mockResolvedValue({
        id: "plan-1",
        patientUserId: "patient-1",
        patientState: "AKTIF",
        currentStreak: 5,
      });

      mockPmoRepo.findOne.mockResolvedValue({
        id: "pmo-assign-1",
        treatmentPlanId: "plan-1",
        pmoUserId: "pmo-1",
        active: true,
      });

      const res = await service.createPmoFollowUp("pmo-1", "patient-1", {
        actionTaken: "KUNJUNGAN_RUMAH",
        notes: "Pasien minum obat dengan baik",
      });

      expect(res.success).toBe(true);
      expect(res.notes).toBe("Pasien minum obat dengan baik");
      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          eventType: "PMO_OUTREACH",
          actorUserId: "pmo-1",
          actorRole: "PMO",
          reasonOrSummary: "Pasien minum obat dengan baik",
        }),
      );
    });

    it("throws NotFoundException when the treatment plan does not exist", async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPmoFollowUp("pmo-1", "missing", {
          actionTaken: "KUNJUNGAN_RUMAH",
          notes: "x",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when the PMO is not assigned to the patient", async () => {
      mockPlanRepo.findOne.mockResolvedValue({ id: "plan-1", patientUserId: "patient-1" });
      mockPmoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPmoFollowUp("pmo-1", "patient-1", {
          actionTaken: "KUNJUNGAN_RUMAH",
          notes: "x",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
