import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { In } from "typeorm";
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

  describe("listPatients", () => {
    function mockQueryBuilder(plans: any[]) {
      const qb: any = {
        leftJoinAndSelect: vi.fn(() => qb),
        andWhere: vi.fn(() => qb),
        orderBy: vi.fn(() => qb),
        addOrderBy: vi.fn(() => qb),
        skip: vi.fn(() => qb),
        take: vi.fn(() => qb),
        getManyAndCount: vi.fn().mockResolvedValue([plans, plans.length]),
      };
      mockPlanRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    const basePlan = {
      id: "plan-1",
      patientUserId: "patient-1",
      patientUser: { name: "Budi", username: "budi123", whatsappVerified: true },
      patientState: "AKTIF",
      phase: "INTENSIF",
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      currentStreak: 3,
      consecutiveSilenceDays: 0,
      riskScore: 10,
      startDate: "2026-01-01",
      targetEndDate: "2026-06-30",
    };

    it("attaches the active PMO to each patient", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: "faskes-1" });
      mockQueryBuilder([basePlan]);
      mockPmoRepo.find.mockResolvedValue([
        {
          treatmentPlanId: "plan-1",
          pmoUserId: "pmo-1",
          relationship: "KELUARGA",
          isPrimary: true,
          pmoUser: { name: "Sri", username: "sri123", whatsappEncrypted: "628123" },
        },
      ]);

      const res = await service.listPatients("nakes-1", {} as any);

      expect(res.items[0].pmo).toEqual({
        userId: "pmo-1",
        fullName: "Sri",
        username: "sri123",
        whatsappNumber: "628123",
        relationship: "KELUARGA",
        isPrimary: true,
      });
      expect(mockPmoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { treatmentPlanId: In(["plan-1"]), active: true },
          relations: { pmoUser: true },
        }),
      );
    });

    it("prefers the primary assignment when a plan has several PMOs", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: "faskes-1" });
      mockQueryBuilder([basePlan]);
      mockPmoRepo.find.mockResolvedValue([
        {
          treatmentPlanId: "plan-1",
          pmoUserId: "pmo-secondary",
          relationship: "NAKES",
          isPrimary: false,
          pmoUser: { name: "Secondary", username: "sec" },
        },
        {
          treatmentPlanId: "plan-1",
          pmoUserId: "pmo-primary",
          relationship: "KELUARGA",
          isPrimary: true,
          pmoUser: { name: "Primary", username: "prim" },
        },
      ]);

      const res = await service.listPatients("nakes-1", {} as any);

      expect(res.items[0].pmo?.username).toBe("prim");
    });

    it("returns pmo: null when no active assignment exists", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: "faskes-1" });
      mockQueryBuilder([basePlan]);
      mockPmoRepo.find.mockResolvedValue([]);

      const res = await service.listPatients("nakes-1", {} as any);

      expect(res.items[0].pmo).toBeNull();
    });

    it("matches the search term against PMO name via an EXISTS subquery", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: "faskes-1" });
      const qb = mockQueryBuilder([basePlan]);
      mockPmoRepo.find.mockResolvedValue([]);

      await service.listPatients("nakes-1", { search: "sri" } as any);

      const [clause, params] = qb.andWhere.mock.calls.find((c: any[]) =>
        String(c[0]).includes("EXISTS"),
      )!;
      expect(clause).toContain("pmo_assignments");
      expect(clause).toContain("search_pmo.active = true");
      expect(params).toEqual({ search: "%sri%" });
    });
  });
});
