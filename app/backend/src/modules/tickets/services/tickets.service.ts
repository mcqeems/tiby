import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InterventionTicket } from "../entities/intervention-ticket.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { PatientStatusHistory } from "../../patients/entities/patient-status-history.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import type {
  ListTicketsQuery,
  TicketListResponse,
  TicketDetail,
  CreateTicketDto,
  CloseTicketDto,
  TicketTriggerSource,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@tiby/ts-shared";

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(InterventionTicket)
    private readonly ticketRepo: Repository<InterventionTicket>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
  ) {}

  async createTicket(
    caller: { id: string; role: UserRole; facilityId?: string | null },
    dto: CreateTicketDto,
  ): Promise<TicketDetail> {
    let plan: TreatmentPlan | null = null;

    if (caller.role === "PASIEN") {
      plan = await this.planRepo.findOne({
        where: { patientUserId: caller.id },
      });
      if (!plan) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "No active treatment plan found for patient",
        });
      }
    } else {
      const planIdOrUserId = dto.treatmentPlanId ?? dto.patientUserId;
      if (!planIdOrUserId) {
        throw new BadRequestException({
          code: "BAD_REQUEST",
          message: "treatmentPlanId or patientUserId is required",
        });
      }

      plan = await this.planRepo.findOne({
        where: { id: planIdOrUserId },
      });
      if (!plan) {
        plan = await this.planRepo.findOne({
          where: { patientUserId: planIdOrUserId },
        });
      }
      if (!plan) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "Treatment plan not found",
        });
      }

      if (caller.role === "PMO") {
        const assignment = await this.pmoRepo.findOne({
          where: { treatmentPlanId: plan.id, pmoUserId: caller.id, active: true },
        });
        if (!assignment) {
          throw new ForbiddenException({
            code: "FORBIDDEN",
            message: "PMO is not assigned to this patient",
          });
        }
      } else if (caller.role === "NAKES") {
        if (caller.facilityId && caller.facilityId !== plan.facilityId) {
          throw new ForbiddenException({
            code: "FORBIDDEN",
            message: "Cannot create ticket for patient in another facility",
          });
        }
      }
    }

    const triggerSource: TicketTriggerSource =
      caller.role === "PASIEN"
        ? "MANUAL_PATIENT"
        : caller.role === "PMO"
          ? "PMO_ESCALATION"
          : "MANUAL_REPORT";

    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        treatmentPlanId: plan.id,
        facilityId: plan.facilityId,
        triggerSource,
        priority: dto.priority ?? "HIGH",
        status: "OPEN",
        pmoNotes: `[${caller.role}]: ${dto.reason}`,
        resolutionReason: null,
        resolutionNotes: null,
      }),
    );

    await this.historyRepo.save(
      this.historyRepo.create({
        treatmentPlanId: plan.id,
        eventType: "TICKET_OPENED",
        previousState: plan.patientState,
        newState: plan.patientState,
        previousStreak: plan.currentStreak,
        newStreak: plan.currentStreak,
        actorUserId: caller.id,
        actorRole: caller.role,
        reasonOrSummary: `Ticket opened by ${caller.role}: ${dto.reason}`,
        metadataJson: { ticketId: ticket.id, priority: ticket.priority, triggerSource },
      }),
    );

    return this.getTicketDetail(ticket.id);
  }

  async listTickets(
    nakesUserId: string,
    query: ListTicketsQuery,
  ): Promise<TicketListResponse> {
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    const facilityId = nakes?.facilityId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [tickets, total] = await this.ticketRepo.findAndCount({
      where: {
        ...(facilityId ? { facilityId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
      relations: {
        treatmentPlan: {
          patientUser: true,
        },
      },
      order: { openedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items: TicketDetail[] = tickets.map((t) => ({
      id: t.id,
      treatmentPlanId: t.treatmentPlanId,
      facilityId: t.facilityId,
      patientName: t.treatmentPlan?.patientUser?.name || "Pasien",
      patientUsername: t.treatmentPlan?.patientUser?.username || "",
      triggerSource: t.triggerSource as TicketTriggerSource,
      priority: t.priority as TicketPriority,
      status: t.status as TicketStatus,
      assignedNakesId: t.assignedNakesId,
      pmoNotes: t.pmoNotes,
      resolutionReason: t.resolutionReason,
      resolutionNotes: t.resolutionNotes,
      openedAt: t.openedAt.toISOString(),
      closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getTicketDetail(ticketId: string): Promise<TicketDetail> {
    const t = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: {
        treatmentPlan: {
          patientUser: true,
        },
      },
    });

    if (!t) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Intervention ticket not found",
      });
    }

    return {
      id: t.id,
      treatmentPlanId: t.treatmentPlanId,
      facilityId: t.facilityId,
      patientName: t.treatmentPlan?.patientUser?.name || "Pasien",
      patientUsername: t.treatmentPlan?.patientUser?.username || "",
      triggerSource: t.triggerSource as TicketTriggerSource,
      priority: t.priority as TicketPriority,
      status: t.status as TicketStatus,
      assignedNakesId: t.assignedNakesId,
      pmoNotes: t.pmoNotes,
      resolutionReason: t.resolutionReason,
      resolutionNotes: t.resolutionNotes,
      openedAt: t.openedAt.toISOString(),
      closedAt: t.closedAt ? t.closedAt.toISOString() : null,
    };
  }

  async closeTicket(
    ticketId: string,
    nakesUserId: string,
    dto: CloseTicketDto,
  ): Promise<TicketDetail> {
    const t = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: { treatmentPlan: true },
    });

    if (!t) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Intervention ticket not found",
      });
    }

    t.status = "RESOLVED_CLOSED";
    t.closedAt = new Date();
    t.assignedNakesId = nakesUserId;
    t.resolutionReason = dto.resolutionReason;
    t.resolutionNotes = dto.resolutionNotes;
    await this.ticketRepo.save(t);

    if (t.treatmentPlan) {
      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId: t.treatmentPlanId,
          eventType: "TICKET_RESOLVED",
          previousState: t.treatmentPlan.patientState,
          newState: t.treatmentPlan.patientState,
          previousStreak: t.treatmentPlan.currentStreak,
          newStreak: t.treatmentPlan.currentStreak,
          actorUserId: nakesUserId,
          actorRole: "NAKES",
          reasonOrSummary: `Ticket ${t.id} manually resolved: ${dto.resolutionReason}`,
          metadataJson: { ticketId: t.id, notes: dto.resolutionNotes },
        }),
      );
    }

    return this.getTicketDetail(ticketId);
  }
}
