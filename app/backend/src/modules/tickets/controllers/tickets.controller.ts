import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { TicketsService } from "../services/tickets.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  ListTicketsQuerySchema,
  CreateTicketSchema,
  CloseTicketSchema,
  type ListTicketsQuery,
  type CreateTicketDto,
  type CloseTicketDto,
  type TicketListResponse,
  type TicketDetail,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("faskes/tickets")
@UseGuards(RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private extractCaller(req: AuthenticatedRequest): {
    id: string;
    role: UserRole;
    facilityId?: string | null;
  } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return {
      id: user.id,
      role: user.role,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    };
  }

  @Post()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async createTicket(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: CreateTicketSchema }) body: CreateTicketDto,
  ): Promise<TicketDetail> {
    const caller = this.extractCaller(req);
    return this.ticketsService.createTicket(caller, body);
  }

  @Get()
  @Roles(["NAKES"])
  async listTickets(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListTicketsQuerySchema }) query: ListTicketsQuery,
  ): Promise<TicketListResponse> {
    const caller = this.extractCaller(req);
    return this.ticketsService.listTickets(caller.id, query);
  }

  @Get(":id")
  @Roles(["NAKES"])
  async getTicketDetail(@Param("id") id: string): Promise<TicketDetail> {
    return this.ticketsService.getTicketDetail(id);
  }

  @Patch(":id/close")
  @Roles(["NAKES"])
  async closeTicket(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body({ schema: CloseTicketSchema }) body: CloseTicketDto,
  ): Promise<TicketDetail> {
    const caller = this.extractCaller(req);
    return this.ticketsService.closeTicket(id, caller.id, body);
  }
}
