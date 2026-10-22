import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { PushService } from "../services/push.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  PushSubscriptionPayloadSchema,
  PushUnsubscribeSchema,
  SendPushNotificationSchema,
  type PushSubscriptionPayload,
  type PushUnsubscribeDto,
  type PushSubscriptionStatus,
  type VapidPublicKeyResponse,
  type SendPushNotificationDto,
  type SendPushNotificationResponse,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("push")
@UseGuards(RolesGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

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

  @Get("vapid-public-key")
  @AllowAnonymous()
  getVapidPublicKey(): VapidPublicKeyResponse {
    return this.pushService.getVapidPublicKey();
  }

  @Post("subscribe")
  @Roles(["PASIEN", "PMO", "NAKES"])
  async subscribe(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: PushSubscriptionPayloadSchema }) body: PushSubscriptionPayload,
    @Headers("user-agent") userAgent?: string,
  ): Promise<PushSubscriptionStatus> {
    const userId = this.extractUserId(req);
    return this.pushService.subscribe(userId, body, userAgent);
  }

  @Post("unsubscribe")
  @Roles(["PASIEN", "PMO", "NAKES"])
  async unsubscribe(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: PushUnsubscribeSchema }) body: PushUnsubscribeDto,
  ): Promise<{ unsubscribed: boolean }> {
    const userId = this.extractUserId(req);
    return this.pushService.unsubscribe(userId, body);
  }

  @Post("send")
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async sendPushNotification(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: SendPushNotificationSchema }) body: SendPushNotificationDto,
  ): Promise<SendPushNotificationResponse> {
    const caller = this.extractCaller(req);
    return this.pushService.sendManualNotification(caller, body);
  }
}
