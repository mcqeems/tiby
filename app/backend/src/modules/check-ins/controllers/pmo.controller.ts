import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  SerializeOptions,
} from '@nestjs/common';
import { CheckInService } from '../services/check-in.service.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { ConsentGuard } from '../../../common/guards/consent.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../../../common/types/auth-request.type.js';
import {
  CreatePmoFollowUpSchema,
  type PmoPatientStatusList,
  type CreatePmoFollowUpDto,
  type PmoFollowUpResponse,
  PmoPatientStatusItemSchema,
} from '@tiby/ts-shared';

@Controller('pmo')
@UseGuards(RolesGuard, ConsentGuard)
export class PmoController {
  constructor(private readonly checkInService: CheckInService) {}

  @Get('patients')
  @Roles(['PMO'])
  @SerializeOptions({ schema: PmoPatientStatusItemSchema })
  async getPatients(
    @Req() req: AuthenticatedRequest,
  ): Promise<PmoPatientStatusList> {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'PMO authentication session required',
      });
    }
    return this.checkInService.getPmoPatients(user.id);
  }

  @Post('patients/:id/follow-up')
  @Roles(['PMO'])
  async createFollowUp(
    @Req() req: AuthenticatedRequest,
    @Param('id') patientId: string,
    @Body({ schema: CreatePmoFollowUpSchema }) body: CreatePmoFollowUpDto,
  ): Promise<PmoFollowUpResponse> {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'PMO authentication session required',
      });
    }
    return this.checkInService.createPmoFollowUp(user.id, patientId, body);
  }
}
