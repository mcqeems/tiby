import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { FamilyContactsService } from "../src/modules/family-contacts/family-contacts.service.js";

describe("FamilyContactsService Unit Tests", () => {
  let service: FamilyContactsService;
  let mockFamilyRepo: any;
  let mockPlanRepo: any;
  let mockPmoRepo: any;

  beforeEach(() => {
    mockFamilyRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: "contact-1", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "contact-1", ...data })),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockPlanRepo = {
      findOne: vi.fn(),
    };

    mockPmoRepo = {
      findOne: vi.fn(),
    };

    service = new FamilyContactsService(
      mockFamilyRepo,
      mockPlanRepo,
      mockPmoRepo,
    );
  });

  describe("resolvePlan & Authorization", () => {
    it("throws NotFoundException if plan cannot be found", async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.listFamilyContacts({ id: "user-1", role: "PASIEN" }, "invalid-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if PASIEN accesses another patient's contacts", async () => {
      mockPlanRepo.findOne.mockResolvedValue({
        id: "plan-1",
        patientUserId: "patient-other",
        facilityId: "fac-1",
      });

      await expect(
        service.listFamilyContacts({ id: "patient-me", role: "PASIEN" }, "plan-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException if PMO is not assigned to the plan", async () => {
      mockPlanRepo.findOne.mockResolvedValue({
        id: "plan-1",
        patientUserId: "patient-1",
        facilityId: "fac-1",
      });
      mockPmoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.listFamilyContacts({ id: "pmo-unassigned", role: "PMO" }, "plan-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException if NAKES accesses patient outside their facility", async () => {
      mockPlanRepo.findOne.mockResolvedValue({
        id: "plan-1",
        patientUserId: "patient-1",
        facilityId: "fac-1",
      });

      await expect(
        service.listFamilyContacts(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-other" },
          "plan-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("CRUD Operations", () => {
    const validPlan = {
      id: "plan-1",
      patientUserId: "patient-1",
      facilityId: "fac-1",
    };

    it("allows assigned PMO to add a family contact", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockPmoRepo.findOne.mockResolvedValue({ id: "assign-1" });

      const res = await service.createFamilyContact(
        { id: "pmo-1", role: "PMO" },
        "patient-1",
        {
          fullName: "Ibu Rahma",
          whatsappNumber: "081234567890",
          notifyOnEscalation: true,
        },
      );

      expect(res.id).toBe("contact-1");
      expect(mockFamilyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          addedByUserId: "pmo-1",
          whatsappVerified: false,
          notifyOnEscalation: true,
        }),
      );
    });

    it("allows PASIEN to list their own family contacts", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockFamilyRepo.find.mockResolvedValue([
        {
          id: "contact-1",
          treatmentPlanId: "plan-1",
          nameEncrypted: "Ibu Rahma",
          whatsappEncrypted: "081234567890",
          whatsappVerified: true,
          notifyOnEscalation: true,
          createdAt: new Date("2026-10-18"),
        },
      ]);

      const res = await service.listFamilyContacts(
        { id: "patient-1", role: "PASIEN" },
        "patient-1",
      );

      expect(res).toHaveLength(1);
      expect(res[0].fullName).toBe("Ibu Rahma");
      expect(res[0].whatsappVerified).toBe(true);
    });

    it("forbids PMO from deleting family contacts", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockPmoRepo.findOne.mockResolvedValue({ id: "assign-1" });

      await expect(
        service.deleteFamilyContact(
          { id: "pmo-1", role: "PMO" },
          "patient-1",
          "contact-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows NAKES from same facility to delete a contact", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockFamilyRepo.findOne.mockResolvedValue({
        id: "contact-1",
        treatmentPlanId: "plan-1",
      });

      const res = await service.deleteFamilyContact(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "patient-1",
        "contact-1",
      );

      expect(res.success).toBe(true);
      expect(mockFamilyRepo.delete).toHaveBeenCalledWith({ id: "contact-1" });
    });
  });
});
