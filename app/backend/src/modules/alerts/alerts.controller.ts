import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AlertsService } from "./alerts.service.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../common/types/auth-request.type.js";
import {
  ListAlertsQuerySchema,
  type ListAlertsQuery,
  type FacilityAlertList,
  type FacilityAlertDto,
} from "@tiby/ts-shared";

@Controller("faskes/alerts")
@UseGuards(RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

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
  async listAlerts(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListAlertsQuerySchema }) query: ListAlertsQuery,
  ): Promise<FacilityAlertList> {
    const nakesUserId = this.extractUserId(req);
    return this.alertsService.listAlerts(nakesUserId, query);
  }

  @Patch(":id/read")
  @Roles(["NAKES"])
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<FacilityAlertDto> {
    const nakesUserId = this.extractUserId(req);
    return this.alertsService.markAlertRead(id, nakesUserId);
  }
}
