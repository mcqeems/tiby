import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { EducationService } from "../services/education.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import {
  EducationQuerySchema,
  type EducationQuery,
  type EducationCardList,
} from "@tiby/ts-shared";

@Controller("education")
@UseGuards(RolesGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get("daily")
  @Roles(["PASIEN", "PMO"])
  getDailyCards(
    @Query({ schema: EducationQuerySchema }) query: EducationQuery,
  ): EducationCardList {
    return this.educationService.getDailyCards(query);
  }
}
