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
import { PushService } from "./push.service.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../common/types/auth-request.type.js";
import {
  PushSubscriptionPayloadSchema,
  PushUnsubscribeSchema,
  type PushSubscriptionPayload,
  type PushUnsubscribeDto,
  type PushSubscriptionStatus,
  type VapidPublicKeyResponse,
} from "@tiby/ts-shared";

@Controller("push")
@UseGuards(RolesGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId = req.session?.user?.id ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return userId;
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
}
