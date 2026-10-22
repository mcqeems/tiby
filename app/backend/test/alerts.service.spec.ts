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
      save: vi.fn((data) => Promise.resolve(data)),
      createQueryBuilder: vi.fn(),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
    };

    service = new AlertsService(mockAlertRepo, mockUserRepo);
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
});
