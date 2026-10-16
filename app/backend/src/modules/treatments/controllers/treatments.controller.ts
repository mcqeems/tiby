import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TreatmentsService } from "../services/treatments.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import {
  PaginationQuerySchema,
  type PaginationQuery,
  type PatientStatusHistoryList,
} from "@tiby/ts-shared";

@Controller("faskes/patients")
@UseGuards(RolesGuard)
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get(":id/history")
  @Roles(["NAKES"])
  async getPatientHistory(
    @Param("id") treatmentPlanId: string,
    @Query({ schema: PaginationQuerySchema }) query: PaginationQuery,
  ): Promise<PatientStatusHistoryList> {
    return this.treatmentsService.getPatientHistory(
      treatmentPlanId,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }
}
