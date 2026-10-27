import {
  Controller,
  Get,
  Req,
  SerializeOptions,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { StatsService } from "../services/stats.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import { StatsResponseSchema, type StatsResponse } from "@tiby/ts-shared";

@Controller("stats")
@UseGuards(RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /** One dashboard call: the response shape follows the caller's role. */
  @Get()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  @SerializeOptions({ schema: StatsResponseSchema })
  getStats(@Req() req: AuthenticatedRequest): Promise<StatsResponse> {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }

    return this.statsService.getStats({
      id: user.id,
      role: user.role,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    });
  }
}
