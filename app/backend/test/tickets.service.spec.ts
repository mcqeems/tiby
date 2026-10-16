import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TicketsService } from "../src/modules/tickets/services/tickets.service.js";

describe("TicketsService Unit Tests", () => {
  let service: TicketsService;
  let mockTicketRepo: any;
  let mockUserRepo: any;
  let mockHistoryRepo: any;

  beforeEach(() => {
    mockTicketRepo = {
      findOne: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
      createQueryBuilder: vi.fn(),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    service = new TicketsService(mockTicketRepo, mockUserRepo, mockHistoryRepo);
  });

  describe("getTicketDetail", () => {
    it("throws NotFoundException if ticket does not exist", async () => {
      mockTicketRepo.findOne.mockResolvedValue(null);
      await expect(service.getTicketDetail("nonexistent-ticket")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns mapped ticket detail", async () => {
      const mockTicket = {
        id: "ticket-1",
        treatmentPlanId: "plan-1",
        facilityId: "faskes-1",
        triggerSource: "RED_FLAG",
        priority: "CRITICAL",
        status: "OPEN",
        assignedNakesId: null,
        pmoNotes: "Demam tinggi",
        resolutionReason: null,
        resolutionNotes: null,
        openedAt: new Date("2026-10-16T08:00:00Z"),
        closedAt: null,
        treatmentPlan: {
          patientUser: { name: "Budi Santoso", username: "budi" },
        },
      };
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);

      const res = await service.getTicketDetail("ticket-1");
      expect(res.id).toBe("ticket-1");
      expect(res.patientName).toBe("Budi Santoso");
      expect(res.priority).toBe("CRITICAL");
      expect(res.status).toBe("OPEN");
    });
  });

  describe("closeTicket", () => {
    it("closes ticket, marks RESOLVED_CLOSED, records resolution notes and history log", async () => {
      const mockTicket = {
        id: "ticket-1",
        treatmentPlanId: "plan-1",
        facilityId: "faskes-1",
        triggerSource: "SILENCE_H3",
        priority: "CRITICAL",
        status: "OPEN",
        assignedNakesId: null,
        resolutionReason: null,
        resolutionNotes: null,
        openedAt: new Date("2026-10-15T00:00:00Z"),
        closedAt: null,
        treatmentPlan: {
          patientState: "BERISIKO",
          currentStreak: 0,
          patientUser: { name: "Budi Santoso", username: "budi" },
        },
      };
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);

      const res = await service.closeTicket("ticket-1", "nakes-1", {
        resolutionReason: "VISITED_HOME",
        resolutionNotes: "Petugas telah mengunjungi rumah pasien dan obat diminum.",
      });

      expect(mockTicket.status).toBe("RESOLVED_CLOSED");
      expect(mockTicket.assignedNakesId).toBe("nakes-1");
      expect(mockTicket.resolutionReason).toBe("VISITED_HOME");
      expect(mockTicket.closedAt).toBeDefined();

      expect(mockHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          eventType: "TICKET_RESOLVED",
          actorUserId: "nakes-1",
          actorRole: "NAKES",
        }),
      );
      expect(res.status).toBe("RESOLVED_CLOSED");
    });
  });
});
