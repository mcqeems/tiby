import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EducationService } from "../src/modules/education/services/education.service.js";

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    facilityId: "fac-1",
    title: "Judul",
    summary: "Ringkasan",
    contentMarkdown: "### Isi",
    category: "ADHERENCE",
    phase: "INTENSIF",
    sortOrder: 0,
    createdByUserId: "nakes-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("EducationService Unit Tests", () => {
  let service: EducationService;
  let mockCardRepo: any;

  beforeEach(() => {
    mockCardRepo = {
      find: vi.fn().mockResolvedValue([]),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
      findOneBy: vi.fn(),
      countBy: vi.fn().mockResolvedValue(0),
      create: vi.fn((d) => d),
      save: vi.fn((d) =>
        Promise.resolve({
          id: "card-new",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
          ...d,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new EducationService(mockCardRepo);
  });

  describe("onModuleInit", () => {
    it("seeds the global defaults when none exist", async () => {
      mockCardRepo.countBy.mockResolvedValue(0);

      await service.onModuleInit();

      expect(mockCardRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ facilityId: null, category: "ADHERENCE" }),
        ]),
      );
      expect((mockCardRepo.save.mock.calls[0][0] as unknown[]).length).toBe(3);
    });

    it("does not reseed when global cards already exist", async () => {
      mockCardRepo.countBy.mockResolvedValue(3);

      await service.onModuleInit();

      expect(mockCardRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("getDailyCards", () => {
    it("scopes a patient to global cards plus their own facility", async () => {
      await service.getDailyCards({}, "fac-1");

      expect(mockCardRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ facilityId: expect.anything() }, { facilityId: "fac-1" }],
          order: { sortOrder: "ASC", createdAt: "ASC" },
        }),
      );
    });

    it("shows only global cards when the caller has no facility", async () => {
      await service.getDailyCards({}, null);

      expect(mockCardRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ facilityId: expect.anything() }],
        }),
      );
    });

    it("applies the phase filter to every scope branch", async () => {
      await service.getDailyCards({ phase: "LANJUTAN" }, "fac-1");

      const arg = mockCardRepo.find.mock.calls[0][0];
      expect(arg.where).toEqual([
        { facilityId: expect.anything(), phase: "LANJUTAN" },
        { facilityId: "fac-1", phase: "LANJUTAN" },
      ]);
    });
  });

  describe("listCards", () => {
    it("gives ADMIN every card with no facility scoping", async () => {
      await service.listCards({ id: "admin", role: "ADMIN" }, {});

      expect(mockCardRepo.findAndCount).toHaveBeenCalledWith({
        order: {
          facilityId: "ASC",
          sortOrder: "ASC",
          createdAt: "ASC",
          id: "ASC",
        },
        skip: 0,
        take: 20,
      });
    });

    it("scopes NAKES to global plus their own facility", async () => {
      await service.listCards(
        { id: "nakes", role: "NAKES", facilityId: "fac-1" },
        {},
      );

      expect(mockCardRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ facilityId: expect.anything() }, { facilityId: "fac-1" }],
        }),
      );
    });

    it("applies offset pagination and returns the envelope", async () => {
      mockCardRepo.findAndCount.mockResolvedValue([[makeCard()], 21]);

      const res = await service.listCards(
        { id: "nakes", role: "NAKES", facilityId: "fac-1" },
        { page: 3, limit: 10 },
      );

      expect(mockCardRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(res).toMatchObject({ total: 21, page: 3, limit: 10 });
      expect(res.items).toHaveLength(1);
    });
  });

  describe("createCard", () => {
    it("forces a NAKES card into their own facility", async () => {
      await service.createCard(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        {
          title: "Baru",
          summary: "Ringkas",
          contentMarkdown: "Isi",
          category: "GENERAL",
          phase: "INTENSIF",
          sortOrder: 0,
        } as any,
      );

      expect(mockCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId: "fac-1", createdByUserId: "nakes-1" }),
      );
    });

    it("lets ADMIN create a global card", async () => {
      await service.createCard(
        { id: "admin-1", role: "ADMIN" },
        {
          title: "Global",
          summary: "Ringkas",
          contentMarkdown: "Isi",
          category: "GENERAL",
          phase: "INTENSIF",
          sortOrder: 0,
        } as any,
      );

      expect(mockCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId: null }),
      );
    });

    it("forbids NAKES from creating a card for another facility", async () => {
      await expect(
        service.createCard(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          {
            title: "X",
            summary: "Y",
            contentMarkdown: "Z",
            category: "GENERAL",
            phase: "INTENSIF",
            sortOrder: 0,
            facilityId: "fac-other",
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids a NAKES without a facility", async () => {
      await expect(
        service.createCard(
          { id: "nakes-1", role: "NAKES", facilityId: null },
          {
            title: "X",
            summary: "Y",
            contentMarkdown: "Z",
            category: "GENERAL",
            phase: "INTENSIF",
            sortOrder: 0,
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids PASIEN and PMO", async () => {
      await expect(
        service.createCard(
          { id: "p", role: "PASIEN" },
          {
            title: "X",
            summary: "Y",
            contentMarkdown: "Z",
            category: "GENERAL",
            phase: "INTENSIF",
            sortOrder: 0,
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateCard", () => {
    it("allows NAKES to edit their own facility's card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard());

      const res = await service.updateCard(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "card-1",
        { title: "Diperbarui" },
      );

      expect(res.title).toBe("Diperbarui");
    });

    it("forbids NAKES from editing a global card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard({ facilityId: null }));

      await expect(
        service.updateCard(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "card-1",
          { title: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids NAKES from editing another facility's card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard({ facilityId: "fac-other" }));

      await expect(
        service.updateCard(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "card-1",
          { title: "Nope" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to edit a global card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard({ facilityId: null }));

      const res = await service.updateCard(
        { id: "admin-1", role: "ADMIN" },
        "card-1",
        { title: "Global Baru" },
      );

      expect(res.title).toBe("Global Baru");
    });

    it("throws NotFoundException for an unknown card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateCard({ id: "admin", role: "ADMIN" }, "ghost", { title: "x" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteCard", () => {
    it("hard-deletes a facility card for its own NAKES", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard());

      const res = await service.deleteCard(
        { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
        "card-1",
      );

      expect(res.success).toBe(true);
      expect(mockCardRepo.delete).toHaveBeenCalledWith({ id: "card-1" });
    });

    it("forbids NAKES from deleting a global card", async () => {
      mockCardRepo.findOneBy.mockResolvedValue(makeCard({ facilityId: null }));

      await expect(
        service.deleteCard(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          "card-1",
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCardRepo.delete).not.toHaveBeenCalled();
    });
  });
});
