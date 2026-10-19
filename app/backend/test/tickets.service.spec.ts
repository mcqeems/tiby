import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { TicketsService } from "../src/modules/tickets/services/tickets.service.js";

describe("TicketsService Unit Tests", () => {
  let service: TicketsService;
  let mockTicketRepo: any;
  let mockUserRepo: any;
  let mockHistoryRepo: any;
  let mockPlanRepo: any;
  let mockPmoRepo: any;

  beforeEach(() => {
    mockTicketRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: "ticket-new", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "ticket-new", ...data })),
      createQueryBuilder: vi.fn(),
    };
    mockUserRepo = {
      findOneBy: vi.fn(),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPlanRepo = {
      findOne: vi.fn(),
    };
    mockPmoRepo = {
      findOne: vi.fn(),
    };

    service = new TicketsService(
      mockTicketRepo,
      mockUserRepo,
      mockHistoryRepo,
      mockPlanRepo,
      mockPmoRepo,
    );
  });

  describe("createTicket (Manual Ticket Creation)", () => {
    const validPlan = {
      id: "plan-1",
      patientUserId: "patient-1",
      facilityId: "fac-1",
      patientState: "AKTIF",
      currentStreak: 5,
    };

    it("allows PASIEN to create a manual ticket for their active plan", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      vi.spyOn(service, "getTicketDetail").mockResolvedValue({
        id: "ticket-new",
        treatmentPlanId: "plan-1",
        facilityId: "fac-1",
        patientName: "Budi",
        patientUsername: "budi",
        triggerSource: "MANUAL_PATIENT",
        priority: "HIGH",
        status: "OPEN",
        assignedNakesId: null,
        pmoNotes: "[PASIEN]: Mual dan pusing",
        resolutionReason: null,
        resolutionNotes: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
      });

      const res = await service.createTicket(
        { id: "patient-1", role: "PASIEN" },
        { reason: "Mual dan pusing" },
      );

      expect(res.triggerSource).toBe("MANUAL_PATIENT");
      expect(mockTicketRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          triggerSource: "MANUAL_PATIENT",
          priority: "HIGH",
          status: "OPEN",
        }),
      );
    });

    it("allows assigned PMO to create a ticket", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockPmoRepo.findOne.mockResolvedValue({ id: "assign-1" });
      vi.spyOn(service, "getTicketDetail").mockResolvedValue({
        id: "ticket-new",
        treatmentPlanId: "plan-1",
        facilityId: "fac-1",
        patientName: "Budi",
        patientUsername: "budi",
        triggerSource: "PMO_ESCALATION",
        priority: "CRITICAL",
        status: "OPEN",
        assignedNakesId: null,
        pmoNotes: "[PMO]: Pasien demam tinggi",
        resolutionReason: null,
        resolutionNotes: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
      });

      const res = await service.createTicket(
        { id: "pmo-1", role: "PMO" },
        { treatmentPlanId: "plan-1", priority: "CRITICAL", reason: "Pasien demam tinggi" },
      );

      expect(res.triggerSource).toBe("PMO_ESCALATION");
      expect(mockTicketRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          treatmentPlanId: "plan-1",
          triggerSource: "PMO_ESCALATION",
          priority: "CRITICAL",
        }),
      );
    });

    it("forbids unassigned PMO from creating a ticket", async () => {
      mockPlanRepo.findOne.mockResolvedValue(validPlan);
      mockPmoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTicket(
          { id: "pmo-unassigned", role: "PMO" },
          { treatmentPlanId: "plan-1", reason: "Pasien mengeluh" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("requires treatmentPlanId or patientUserId when NAKES creates ticket", async () => {
      await expect(
        service.createTicket(
          { id: "nakes-1", role: "NAKES", facilityId: "fac-1" },
          { reason: "Missing plan id" },
        ),
      ).rejects.toThrow(BadRequestException);
    });
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
        resolutionReason: "KUNJUNGAN_RUMAH",
        resolutionNotes: "Petugas telah mengunjungi rumah pasien dan obat diminum.",
      });

      expect(mockTicket.status).toBe("RESOLVED_CLOSED");
      expect(mockTicket.assignedNakesId).toBe("nakes-1");
      expect(mockTicket.resolutionReason).toBe("KUNJUNGAN_RUMAH");
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
