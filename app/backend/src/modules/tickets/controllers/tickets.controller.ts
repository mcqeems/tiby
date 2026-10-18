import {
  Controller,
  Get,
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
  CloseTicketSchema,
  type ListTicketsQuery,
  type CloseTicketDto,
  type TicketListResponse,
  type TicketDetail,
} from "@tiby/ts-shared";

@Controller("faskes/tickets")
@UseGuards(RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId = req.session?.user?.id ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Nakes authentication session required",
      });
    }
    return userId;
  }

  @Get()
  @Roles(["NAKES"])
  async listTickets(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListTicketsQuerySchema }) query: ListTicketsQuery,
  ): Promise<TicketListResponse> {
    const nakesUserId = this.extractUserId(req);
    return this.ticketsService.listTickets(nakesUserId, query);
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
    const nakesUserId = this.extractUserId(req);
    return this.ticketsService.closeTicket(id, nakesUserId, body);
  }
}
