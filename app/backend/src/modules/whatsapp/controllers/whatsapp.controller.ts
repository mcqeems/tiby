import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Headers,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { WhatsappConnectService } from "../services/whatsapp-connect.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  WhatsappConnectRequestSchema,
  WhatsappStatusQuerySchema,
  WahaWebhookPayloadSchema,
  type WhatsappConnectRequest,
  type WhatsappConnectChallenge,
  type WhatsappStatusQuery,
  type WhatsappConnectionStatus,
  type WahaWebhookPayload,
  type UserRole,
} from "@tiby/ts-shared";

@Controller()
export class WhatsappController {
  constructor(private readonly whatsappConnectService: WhatsappConnectService) {}

  private extractUser(req: AuthenticatedRequest): {
    userId: string;
    role: UserRole;
    facilityId: string | null;
  } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return {
      userId: user.id,
      role: user.role,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    };
  }

  @Post("whatsapp/connect")
  @UseGuards(RolesGuard)
  @Roles(["PASIEN", "PMO", "NAKES"])
  async connect(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: WhatsappConnectRequestSchema }) body: WhatsappConnectRequest,
  ): Promise<WhatsappConnectChallenge> {
    const caller = this.extractUser(req);
    return this.whatsappConnectService.generateConnectChallenge(caller, body);
  }

  @Get("whatsapp/status")
  @UseGuards(RolesGuard)
  @Roles(["PASIEN", "PMO", "NAKES"])
  async getStatus(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: WhatsappStatusQuerySchema }) query: WhatsappStatusQuery,
  ): Promise<WhatsappConnectionStatus> {
    const caller = this.extractUser(req);
    return this.whatsappConnectService.getConnectionStatus(caller, query);
  }

  @Post("webhooks/waha")
  @AllowAnonymous()
  async handleWahaWebhook(
    @Body({ schema: WahaWebhookPayloadSchema }) body: WahaWebhookPayload,
    @Headers("x-waha-secret") wahaSecret?: string,
    @Headers("x-api-key") apiKeyHeader?: string,
  ): Promise<{ handled: boolean; verified: boolean }> {
    const expectedSecret = process.env.WAHA_WEBHOOK_SECRET;
    if (expectedSecret) {
      if (wahaSecret !== expectedSecret && apiKeyHeader !== expectedSecret) {
        throw new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Invalid WAHA webhook secret",
        });
      }
    }
    return this.whatsappConnectService.handleInboundWebhook(body);
  }
}
