import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AdminNotificationsService } from "../services/admin-notifications.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  SendSimulatedNotificationSchema,
  type NotificationTemplateList,
  type SendSimulatedNotificationDto,
  type SendSimulatedNotificationResponse,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("admin/notifications")
@UseGuards(RolesGuard)
@Roles(["ADMIN"])
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  private extractCaller(req: AuthenticatedRequest): {
    id: string;
    role: UserRole;
  } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return { id: user.id, role: user.role };
  }

  @Get("templates")
  listTemplates(): NotificationTemplateList {
    return this.adminNotificationsService.listTemplates();
  }

  @Post("send")
  async send(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: SendSimulatedNotificationSchema })
    body: SendSimulatedNotificationDto,
  ): Promise<SendSimulatedNotificationResponse> {
    const caller = this.extractCaller(req);
    return this.adminNotificationsService.send(caller, body);
  }
}
