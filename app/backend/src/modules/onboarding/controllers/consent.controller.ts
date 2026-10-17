import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Ip,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { ConsentService } from "../services/consent.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  GrantConsentSchema,
  RevokeConsentSchema,
  type GrantConsentDto,
  type RevokeConsentDto,
  type ConsentStatus,
} from "@tiby/ts-shared";

@Controller("consent")
@UseGuards(RolesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

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

  @Get()
  @Roles(["PASIEN", "PMO"])
  async getStatus(@Req() req: AuthenticatedRequest): Promise<ConsentStatus> {
    const userId = this.extractUserId(req);
    return this.consentService.getConsentStatus(userId);
  }

  @Post()
  @Roles(["PASIEN", "PMO"])
  async grantConsent(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: GrantConsentSchema }) body: GrantConsentDto,
    @Ip() ip: string,
  ): Promise<ConsentStatus> {
    const userId = this.extractUserId(req);
    return this.consentService.grantConsent(userId, body, ip);
  }

  @Delete()
  @Roles(["PASIEN"])
  async revokeConsent(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: RevokeConsentSchema }) body: RevokeConsentDto,
    @Ip() ip: string,
  ): Promise<ConsentStatus> {
    const userId = this.extractUserId(req);
    return this.consentService.revokeConsent(userId, body, ip);
  }
}
