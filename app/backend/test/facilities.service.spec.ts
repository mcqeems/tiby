import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { FacilitiesService } from "../src/modules/facilities/services/facilities.service.js";

function makeFacility(overrides: Record<string, unknown> = {}) {
  return {
    id: "fac-1",
    code: "PUSK-001",
    name: "Puskesmas Gambir",
    district: "Jakarta Pusat",
    emergencyPhone: "0811-2233-4455",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("FacilitiesService Unit Tests", () => {
  let service: FacilitiesService;
  let mockFacilityRepo: any;

  beforeEach(() => {
    mockFacilityRepo = {
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
      findOneBy: vi.fn(),
      create: vi.fn((d) => d),
      save: vi.fn((d) =>
        Promise.resolve({
          id: "fac-1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          ...d,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new FacilitiesService(mockFacilityRepo);
  });

  describe("listFacilities", () => {
    it("returns a paginated page ordered by name", async () => {
      mockFacilityRepo.findAndCount.mockResolvedValue([[makeFacility()], 1]);

      const res = await service.listFacilities({ page: 1, limit: 12 });

      expect(mockFacilityRepo.findAndCount).toHaveBeenCalledWith({
        order: { name: "ASC", id: "ASC" },
        skip: 0,
        take: 12,
      });
      expect(res.total).toBe(1);
      expect(res.items[0]).toEqual({
        id: "fac-1",
        code: "PUSK-001",
        name: "Puskesmas Gambir",
        district: "Jakarta Pusat",
        emergencyPhone: "0811-2233-4455",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });
  });

  describe("createFacility", () => {
    it("creates a facility when the code is free", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(null);

      const res = await service.createFacility({
        code: "PUSK-NEW",
        name: "Puskesmas Baru",
        district: "Jakarta Barat",
        emergencyPhone: "0812-0000-1111",
      });

      expect(res.code).toBe("PUSK-NEW");
      expect(mockFacilityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: "PUSK-NEW" }),
      );
    });

    it("rejects a duplicate code", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility());

      await expect(
        service.createFacility({
          code: "PUSK-001",
          name: "Duplikat",
          district: "Jakarta",
          emergencyPhone: "0812",
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockFacilityRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("updateFacility", () => {
    it("lets ADMIN edit any facility", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility());

      const res = await service.updateFacility(
        { id: "admin-1", role: "ADMIN" },
        "fac-1",
        { name: "Nama Baru" },
      );

      expect(res.name).toBe("Nama Baru");
    });

    it("lets NAKES edit their own facility", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility());

      const res = await service.updateFacility(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "fac-1",
        { district: "Jakarta Selatan", emergencyPhone: "0899-1111" },
      );

      expect(res.district).toBe("Jakarta Selatan");
      expect(res.emergencyPhone).toBe("0899-1111");
    });

    it("forbids NAKES from editing another facility", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility({ id: "fac-other" }));

      await expect(
        service.updateFacility(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "fac-other",
          { name: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids a facility-less NAKES", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility());

      await expect(
        service.updateFacility(
          { id: "nakes-1", role: "NAKES", facilityId: null },
          "fac-1",
          { name: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects changing the code to one already used by another facility", async () => {
      mockFacilityRepo.findOneBy
        .mockResolvedValueOnce(makeFacility()) // target lookup
        .mockResolvedValueOnce(makeFacility({ id: "fac-2", code: "TAKEN" })); // clash

      await expect(
        service.updateFacility(
          { id: "admin-1", role: "ADMIN" },
          "fac-1",
          { code: "TAKEN" },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("allows re-saving the facility's own existing code", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValueOnce(makeFacility());

      const res = await service.updateFacility(
        { id: "admin-1", role: "ADMIN" },
        "fac-1",
        { code: "PUSK-001", name: "Sama Kode" },
      );

      expect(res.code).toBe("PUSK-001");
    });

    it("throws NotFoundException for an unknown facility", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateFacility({ id: "admin-1", role: "ADMIN" }, "ghost", {
          name: "x",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteFacility", () => {
    it("hard-deletes the facility", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(makeFacility());

      const res = await service.deleteFacility("fac-1");

      expect(res.success).toBe(true);
      expect(mockFacilityRepo.delete).toHaveBeenCalledWith({ id: "fac-1" });
    });

    it("throws NotFoundException when missing", async () => {
      mockFacilityRepo.findOneBy.mockResolvedValue(null);

      await expect(service.deleteFacility("ghost")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
