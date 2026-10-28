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
import { NotificationsService } from "../services/notifications.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  ListNotificationsQuerySchema,
  type ListNotificationsQuery,
  type UserNotificationList,
  type UserNotification,
} from "@tiby/ts-shared";

@Controller("notifications")
@UseGuards(RolesGuard)
@Roles(["PASIEN", "PMO"])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return user.id;
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListNotificationsQuerySchema })
    query: ListNotificationsQuery,
  ): Promise<UserNotificationList> {
    return this.notificationsService.list(this.extractUserId(req), query);
  }

  @Patch(":id/read")
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<UserNotification> {
    return this.notificationsService.markRead(this.extractUserId(req), id);
  }
}
