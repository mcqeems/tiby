import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  UnauthorizedException,
  SerializeOptions,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../../../common/types/auth-request.type.js';
import {
  CreateUserSchema,
  ChangeOwnPasswordSchema,
  ResetUserPasswordSchema,
  UpdateUserSchema,
  ListUsersQuerySchema,
  UploadProfilePictureResponseSchema,
  type CreateUserDto,
  type ChangeOwnPasswordDto,
  type ResetUserPasswordDto,
  type UpdateUserDto,
  type ListUsersQuery,
  type UploadProfilePictureResponse,
  type UserListResponse,
  type UserSummary,
  type UserRole,
} from '@tiby/ts-shared';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private extractCaller(req: AuthenticatedRequest): {
    id: string;
    role: UserRole;
    facilityId?: string | null;
  } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication session required',
      });
    }
    return {
      id: user.id,
      role: user.role,
      facilityId: user.facility_id ?? user.facilityId ?? null,
    };
  }

  @Post()
  @Roles(['ADMIN', 'NAKES'])
  async createUser(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: CreateUserSchema }) body: CreateUserDto,
  ): Promise<UserSummary> {
    const caller = this.extractCaller(req);
    return this.usersService.createUser(caller, body);
  }

  @Post('change-password')
  @Roles(['ADMIN', 'NAKES', 'PMO', 'PASIEN'])
  async changeOwnPassword(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: ChangeOwnPasswordSchema }) body: ChangeOwnPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const caller = this.extractCaller(req);
    return this.usersService.changeOwnPassword(caller.id, body);
  }

  @Get('me')
  @Roles(['ADMIN', 'NAKES', 'PMO', 'PASIEN'])
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserSummary> {
    const caller = this.extractCaller(req);
    return this.usersService.getMe(caller.id);
  }

  @Post('me/profile-picture')
  @Roles(['ADMIN', 'NAKES', 'PMO', 'PASIEN'])
  @SerializeOptions({ schema: UploadProfilePictureResponseSchema })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadProfilePicture(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadProfilePictureResponse> {
    if (!file) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: "Image file is required in 'file' form-data field",
      });
    }
    const caller = this.extractCaller(req);
    return this.usersService.uploadProfilePicture(caller.id, file);
  }

  @Get()
  @Roles(['ADMIN', 'NAKES'])
  async listUsers(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: ListUsersQuerySchema }) query: ListUsersQuery,
  ): Promise<UserListResponse> {
    const caller = this.extractCaller(req);
    return this.usersService.listUsers(caller, query);
  }

  @Patch(':id')
  @Roles(['ADMIN', 'NAKES'])
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetUserId: string,
    @Body({ schema: UpdateUserSchema }) body: UpdateUserDto,
  ): Promise<UserSummary> {
    const caller = this.extractCaller(req);
    return this.usersService.updateUser(caller, targetUserId, body);
  }

  @Post(':id/reset-password')
  @Roles(['ADMIN', 'NAKES'])
  async resetUserPassword(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetUserId: string,
    @Body({ schema: ResetUserPasswordSchema }) body: ResetUserPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const caller = this.extractCaller(req);
    return this.usersService.resetUserPassword(caller, targetUserId, body);
  }
}
