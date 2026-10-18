import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { FamilyContactsService } from "../services/family-contacts.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  FamilyContactInputSchema,
  type FamilyContactInput,
  type FamilyContactItem,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("patients/:id/family-contacts")
@UseGuards(RolesGuard)
export class FamilyContactsController {
  constructor(private readonly familyContactsService: FamilyContactsService) {}

  private extractCaller(req: AuthenticatedRequest): {
    id: string;
    role: UserRole;
    facilityId?: string | null;
  } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return {
      id: user.id,
      role: user.role,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    };
  }

  @Get()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async listFamilyContacts(
    @Req() req: AuthenticatedRequest,
    @Param("id") patientId: string,
  ): Promise<FamilyContactItem[]> {
    const caller = this.extractCaller(req);
    return this.familyContactsService.listFamilyContacts(caller, patientId);
  }

  @Post()
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async createFamilyContact(
    @Req() req: AuthenticatedRequest,
    @Param("id") patientId: string,
    @Body({ schema: FamilyContactInputSchema }) body: FamilyContactInput,
  ): Promise<FamilyContactItem> {
    const caller = this.extractCaller(req);
    return this.familyContactsService.createFamilyContact(caller, patientId, body);
  }

  @Delete(":contactId")
  @Roles(["ADMIN", "NAKES", "PASIEN"])
  async deleteFamilyContact(
    @Req() req: AuthenticatedRequest,
    @Param("id") patientId: string,
    @Param("contactId") contactId: string,
  ): Promise<{ success: boolean; message: string }> {
    const caller = this.extractCaller(req);
    return this.familyContactsService.deleteFamilyContact(caller, patientId, contactId);
  }
}
