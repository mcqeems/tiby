import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  SerializeOptions,
} from "@nestjs/common";
import { PatientsService } from "../services/patients.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { ConsentGuard } from "../../../common/guards/consent.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  PaginationQuerySchema,
  ListPatientsQuerySchema,
  CreatePmoFollowUpSchema,
  PmoPatientStatusItemSchema,
  type PaginationQuery,
  type ListPatientsQuery,
  type PatientStatusHistoryList,
  type RiskSortedPatientList,
  type PmoPatientStatusList,
  type CreatePmoFollowUpDto,
  type PmoFollowUpResponse,
} from "@tiby/ts-shared";

@Controller()
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

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

  @Get("faskes/patients")
  @Roles(["NAKES"])
  async listPatients(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListPatientsQuerySchema }) query: ListPatientsQuery,
  ): Promise<RiskSortedPatientList> {
    const nakesUserId = this.extractUserId(req);
    return this.patientsService.listPatients(nakesUserId, query);
  }

  @Get("faskes/patients/:id/history")
  @Roles(["NAKES"])
  async getPatientHistory(
    @Req() req: AuthenticatedRequest,
    @Param("id") treatmentPlanId: string,
    @Query({ schema: PaginationQuerySchema }) query: PaginationQuery,
  ): Promise<PatientStatusHistoryList> {
    return this.patientsService.getPatientHistory(
      this.extractUserId(req),
      treatmentPlanId,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Get("pmo/patients")
  @Roles(["PMO"])
  @UseGuards(ConsentGuard)
  @SerializeOptions({ schema: PmoPatientStatusItemSchema })
  async getPmoPatients(
    @Req() req: AuthenticatedRequest,
  ): Promise<PmoPatientStatusList> {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "PMO authentication session required",
      });
    }
    return this.patientsService.getPmoPatients(user.id);
  }

  @Post("pmo/patients/:id/follow-up")
  @Roles(["PMO"])
  @UseGuards(ConsentGuard)
  async createPmoFollowUp(
    @Req() req: AuthenticatedRequest,
    @Param("id") patientId: string,
    @Body({ schema: CreatePmoFollowUpSchema }) body: CreatePmoFollowUpDto,
  ): Promise<PmoFollowUpResponse> {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "PMO authentication session required",
      });
    }
    return this.patientsService.createPmoFollowUp(user.id, patientId, body);
  }
}
