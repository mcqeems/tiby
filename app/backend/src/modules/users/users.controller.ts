import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import {
  CreateUserSchema,
  ChangeOwnPasswordSchema,
  ResetUserPasswordSchema,
  type CreateUserDto,
  type ChangeOwnPasswordDto,
  type ResetUserPasswordDto,
  type UserSummary,
} from "@tiby/ts-shared";

@Controller("users")
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private extractCaller(req: any): { id: string; role: string; facilityId?: string | null } {
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

  @Post()
  @Roles(["ADMIN", "NAKES"])
  async createUser(
    @Req() req: any,
    @Body({ schema: CreateUserSchema }) body: CreateUserDto,
  ): Promise<UserSummary> {
    const caller = this.extractCaller(req);
    return this.usersService.createUser(caller, body);
  }

  @Post("change-password")
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async changeOwnPassword(
    @Req() req: any,
    @Body({ schema: ChangeOwnPasswordSchema }) body: ChangeOwnPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const caller = this.extractCaller(req);
    return this.usersService.changeOwnPassword(caller.id, body);
  }

  @Get("me")
  @Roles(["ADMIN", "NAKES", "PMO", "PASIEN"])
  async getMe(@Req() req: any): Promise<UserSummary> {
    const caller = this.extractCaller(req);
    return this.usersService.getMe(caller.id);
  }

  @Get()
  @Roles(["ADMIN", "NAKES"])
  async listUsers(@Req() req: any): Promise<UserSummary[]> {
    const caller = this.extractCaller(req);
    return this.usersService.listUsers(caller);
  }

  @Post(":id/reset-password")
  @Roles(["ADMIN", "NAKES"])
  async resetUserPassword(
    @Req() req: any,
    @Param("id") targetUserId: string,
    @Body({ schema: ResetUserPasswordSchema }) body: ResetUserPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const caller = this.extractCaller(req);
    return this.usersService.resetUserPassword(caller, targetUserId, body);
  }
}
