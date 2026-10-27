import {
  Body,
  Controller,
  Post,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";
import { GuidanceService } from "../services/guidance.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import {
  GuidanceRequestSchema,
  GuidanceResponseSchema,
  type GuidanceRequest,
  type GuidanceResponse,
} from "@tiby/ts-shared";

@Controller("guidance")
@UseGuards(RolesGuard)
export class GuidanceController {
  constructor(private readonly guidanceService: GuidanceService) {}

  @Post()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  @SerializeOptions({ schema: GuidanceResponseSchema })
  ask(@Body({ schema: GuidanceRequestSchema }) body: GuidanceRequest): Promise<GuidanceResponse> {
    return this.guidanceService.ask(body);
  }
}
