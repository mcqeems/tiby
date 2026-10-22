import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { EducationService, type EducationCaller } from "../services/education.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  EducationQuerySchema,
  CreateEducationCardSchema,
  UpdateEducationCardSchema,
  type EducationQuery,
  type EducationCardList,
  type EducationCardManaged,
  type CreateEducationCardDto,
  type UpdateEducationCardDto,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("education")
@UseGuards(RolesGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  private extractCaller(req: AuthenticatedRequest): EducationCaller {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return {
      id: user.id,
      role: user.role as UserRole,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    };
  }

  @Get("daily")
  @Roles(["PASIEN", "PMO"])
  async getDailyCards(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: EducationQuerySchema }) query: EducationQuery,
  ): Promise<EducationCardList> {
    const caller = this.extractCaller(req);
    return this.educationService.getDailyCards(query, caller.facilityId);
  }

  @Get()
  @Roles(["ADMIN", "NAKES"])
  async listCards(
    @Req() req: AuthenticatedRequest,
  ): Promise<EducationCardManaged[]> {
    return this.educationService.listCards(this.extractCaller(req));
  }

  @Post()
  @Roles(["ADMIN", "NAKES"])
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: CreateEducationCardSchema }) body: CreateEducationCardDto,
  ): Promise<EducationCardManaged> {
    return this.educationService.createCard(this.extractCaller(req), body);
  }

  @Patch(":id")
  @Roles(["ADMIN", "NAKES"])
  async updateCard(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body({ schema: UpdateEducationCardSchema }) body: UpdateEducationCardDto,
  ): Promise<EducationCardManaged> {
    return this.educationService.updateCard(this.extractCaller(req), id, body);
  }

  @Delete(":id")
  @Roles(["ADMIN", "NAKES"])
  async deleteCard(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.educationService.deleteCard(this.extractCaller(req), id);
  }
}
