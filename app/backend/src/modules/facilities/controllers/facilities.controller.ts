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
import { FacilitiesService, type FacilityCaller } from "../services/facilities.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  CreateFacilitySchema,
  UpdateFacilitySchema,
  PaginationQuerySchema,
  type CreateFacilityDto,
  type UpdateFacilityDto,
  type FacilityItem,
  type FacilityListResponse,
  type PaginationQuery,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("facilities")
@UseGuards(RolesGuard)
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  private extractCaller(req: AuthenticatedRequest): FacilityCaller {
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

  @Get()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async listFacilities(
    @Query({ schema: PaginationQuerySchema }) query: PaginationQuery,
  ): Promise<FacilityListResponse> {
    return this.facilitiesService.listFacilities(query);
  }

  @Get(":id")
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async getFacility(@Param("id") id: string): Promise<FacilityItem> {
    return this.facilitiesService.getFacility(id);
  }

  @Post()
  @Roles(["ADMIN"])
  async createFacility(
    @Body({ schema: CreateFacilitySchema }) body: CreateFacilityDto,
  ): Promise<FacilityItem> {
    return this.facilitiesService.createFacility(body);
  }

  @Patch(":id")
  @Roles(["ADMIN", "NAKES"])
  async updateFacility(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body({ schema: UpdateFacilitySchema }) body: UpdateFacilityDto,
  ): Promise<FacilityItem> {
    return this.facilitiesService.updateFacility(
      this.extractCaller(req),
      id,
      body,
    );
  }

  @Delete(":id")
  @Roles(["ADMIN"])
  async deleteFacility(
    @Param("id") id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.facilitiesService.deleteFacility(id);
  }
}
