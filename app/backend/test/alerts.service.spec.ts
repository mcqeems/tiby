import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { AlertsService } from "../src/modules/alerts/services/alerts.service.js";

describe("AlertsService Unit Tests", () => {
  let service: AlertsService;
  let mockAlertRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockAlertRepo = {
      findOne: vi.fn(),
      findAndCount: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
    };

    service = new AlertsService(mockAlertRepo, mockUserRepo);
  });

  describe("listAlerts", () => {
    it("scopes to the nakes facility and applies filters via the repository API", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: "faskes-1" });
      mockAlertRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listAlerts("nakes-1", {
        unreadOnly: true,
        severity: "HIGH",
        page: 2,
        limit: 10,
      } as any);

      expect(mockAlertRepo.findAndCount).toHaveBeenCalledWith({
        where: [{ facilityId: "faskes-1", isRead: false, severity: "HIGH" }],
        relations: { treatmentPlan: { patientUser: true } },
        order: { createdAt: "DESC", id: "DESC" },
        skip: 10,
        take: 10,
      });
    });

    it("returns an empty page when the nakes has no facility", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "nakes-1", facilityId: null });

      const res = await service.listAlerts("nakes-1", {} as any);

      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(mockAlertRepo.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe("markAlertRead", () => {
    it("throws NotFoundException if alert not found", async () => {
      mockAlertRepo.findOne.mockResolvedValue(null);
      await expect(service.markAlertRead("nonexistent", "nakes-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("marks alert as read with timestamp and readByNakesId", async () => {
      const mockAlert = {
        id: "alert-1",
        facilityId: "faskes-1",
        treatmentPlanId: "plan-1",
        alertType: "CONSENT_REVOKED_WARNING",
        severity: "HIGH",
        title: "Persetujuan Dicabut",
        message: "Pasien mencabut data persetujuan",
        isRead: false,
        readAt: null,
        readByNakesId: null,
        createdAt: new Date("2026-10-16T08:00:00Z"),
        treatmentPlan: {
          patientUser: { name: "Budi Santoso" },
        },
      };
      mockAlertRepo.findOne.mockResolvedValue(mockAlert);

      const res = await service.markAlertRead("alert-1", "nakes-1");
      expect(res.isRead).toBe(true);
      expect(mockAlert.isRead).toBe(true);
      expect(mockAlert.readByNakesId).toBe("nakes-1");
      expect(mockAlert.readAt).toBeDefined();
      expect(mockAlertRepo.save).toHaveBeenCalledWith(mockAlert);
    });
  });
  describe("listAlerts filtering", () => {
    it("searches the joined patient name and keeps the facility scope", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: "nakes-1",
        facilityId: "faskes-1",
      });
      mockAlertRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listAlerts("nakes-1", { search: "sri" } as any);

      const where = mockAlertRepo.findAndCount.mock.calls[0][0].where;
      expect(where).toHaveLength(2);
      expect(where[0].facilityId).toBe("faskes-1");
      expect(where[0].treatmentPlan.patientUser.name.value).toBe("%sri%");
      expect(where[1].treatmentPlan.patientUser.username.value).toBe("%sri%");
    });
  });
});
