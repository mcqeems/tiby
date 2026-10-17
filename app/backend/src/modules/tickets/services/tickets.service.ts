import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InterventionTicket } from "../entities/intervention-ticket.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { PatientStatusHistory } from "../../treatments/entities/patient-status-history.entity.js";
import type {
  ListTicketsQuery,
  TicketListResponse,
  TicketDetail,
  CloseTicketDto,
  TicketTriggerSource,
  TicketPriority,
  TicketStatus,
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
  ) {}

  async listTickets(
    nakesUserId: string,
    query: ListTicketsQuery,
  ): Promise<TicketListResponse> {
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    const facilityId = nakes?.facilityId;

    const qb = this.ticketRepo
      .createQueryBuilder("ticket")
      .leftJoinAndSelect("ticket.treatmentPlan", "plan")
      .leftJoinAndSelect("plan.patientUser", "patient");

    if (facilityId) {
      qb.andWhere("ticket.facilityId = :facilityId", { facilityId });
    }

    if (query.status) {
      qb.andWhere("ticket.status = :status", { status: query.status });
    }

    if (query.priority) {
      qb.andWhere("ticket.priority = :priority", { priority: query.priority });
    }

    qb.orderBy("ticket.openedAt", "DESC");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [tickets, total] = await qb.getManyAndCount();

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
