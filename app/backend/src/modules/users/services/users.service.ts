import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { AuthUser } from '../../../auth/entities/auth-user.entity.js';
import { Facility } from '../../facilities/entities/facilities.entity.js';
import { AuditLog } from '../../internal/audit/entities/audit-log.entity.js';
import { auth } from '../../../auth/auth.config.js';
import type {
  CreateUserDto,
  ChangeOwnPasswordDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  ListUsersQuery,
  UserListResponse,
  UserSummary,
} from '@tiby/ts-shared';

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return createHash('sha256').update(digits).digest('hex');
}

const MANAGEABLE_ROLES = ['PASIEN', 'PMO'] as const;

/**
 * Shared authorization rule for editing / resetting another user's account.
 * ADMIN: any user. NAKES: PASIEN and PMO within their own facility only.
 */
function assertCanManage(
  caller: { id: string; role: string; facilityId?: string | null },
  target: { role: string; facilityId: string | null },
): void {
  if (caller.role === 'ADMIN') return;

  if (caller.role === 'NAKES') {
    // A caller without a facility must not match facility-less targets.
    if (!caller.facilityId || target.facilityId !== caller.facilityId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Faskes can only manage users within their own facility',
      });
    }
    if (
      !MANAGEABLE_ROLES.includes(
        target.role as (typeof MANAGEABLE_ROLES)[number],
      )
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Faskes can only manage pasien and pmo accounts',
      });
    }
    return;
  }

  throw new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'Insufficient permissions to manage other users',
  });
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async createUser(
    caller: { id: string; role: string; facilityId?: string | null },
    dto: CreateUserDto,
  ): Promise<UserSummary> {
    let targetFacilityId: string | null = null;
    let targetFacilityName: string | null = null;

    if (caller.role === 'ADMIN') {
      if (dto.facilityId) {
        const facility = await this.facilityRepo.findOneBy({
          id: dto.facilityId,
        });
        if (!facility) {
          throw new NotFoundException({
            code: 'NOT_FOUND',
            message: 'Facility not found',
          });
        }
        targetFacilityId = dto.facilityId;
        targetFacilityName = facility.name;
      }
    } else if (caller.role === 'NAKES') {
      if (dto.role !== 'PASIEN' && dto.role !== 'PMO') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Faskes can only create pasien and pmo accounts',
        });
      }
      targetFacilityId = caller.facilityId ?? null;
      if (
        dto.facilityId &&
        caller.facilityId &&
        dto.facilityId !== caller.facilityId
      ) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cannot create accounts for a different facility',
        });
      }
      if (targetFacilityId) {
        const facility = await this.facilityRepo.findOneBy({
          id: targetFacilityId,
        });
        targetFacilityName = facility?.name ?? null;
      }
    } else {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to create accounts',
      });
    }

    const existing = await this.userRepo.findOneBy({ username: dto.username });
    if (existing) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Username '${dto.username}' is already taken`,
      });
    }

    const created = await auth.api.createUser({
      body: {
        name: dto.fullName,
        email: dto.email ?? `${dto.username.toLowerCase()}@users.tiby.internal`,
        password: dto.password,
        role: dto.role,
        data: {
          username: dto.username,
          displayUsername: dto.username,
          role: dto.role,
          facility_id: targetFacilityId,
          full_name_encrypted: dto.fullName,
          whatsapp_encrypted: dto.whatsappNumber ?? null,
          whatsapp_hash: dto.whatsappNumber
            ? hashPhone(dto.whatsappNumber)
            : null,
          whatsapp_verified: false,
          must_confirm_consent: dto.role === 'PASIEN',
        },
      },
    });

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: caller.id,
        actorRole: caller.role,
        action: 'USER_CREATE',
        targetEntity: 'users',
        targetId: created.user.id,
        metadataJson: {
          createdRole: dto.role,
          username: dto.username,
          facilityId: targetFacilityId,
        },
      }),
    );

    return {
      id: created.user.id,
      email: dto.email,
      username: dto.username,
      name: dto.fullName,
      role: dto.role,
      whatsappNumber: dto.whatsappNumber,
      facilityId: targetFacilityId,
      facility: targetFacilityName,
    };
  }

  async changeOwnPassword(
    callerUserId: string,
    dto: ChangeOwnPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOneBy({ id: callerUserId });
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const ctx = await auth.$context;
    const account =
      await ctx.internalAdapter.findCredentialAccount(callerUserId);
    if (!account || !account.password) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Account does not have credentials set',
      });
    }

    const valid = await ctx.password.verify({
      hash: account.password,
      password: dto.currentPassword,
    });
    if (!valid) {
      throw new BadRequestException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password does not match',
      });
    }

    const newHash = await ctx.password.hash(dto.newPassword);
    await ctx.internalAdapter.updatePassword(callerUserId, newHash);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: callerUserId,
        actorRole: user.role,
        action: 'PASSWORD_CHANGE_SELF',
        targetEntity: 'users',
        targetId: callerUserId,
        metadataJson: { success: true },
      }),
    );

    return { success: true, message: 'Password successfully changed' };
  }

  async resetUserPassword(
    caller: { id: string; role: string; facilityId?: string | null },
    targetUserId: string,
    dto: ResetUserPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const targetUser = await this.userRepo.findOneBy({ id: targetUserId });
    if (!targetUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Target user not found',
      });
    }

    assertCanManage(caller, targetUser);

    const ctx = await auth.$context;
    const newHash = await ctx.password.hash(dto.newPassword);
    await ctx.internalAdapter.updatePassword(targetUserId, newHash);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: caller.id,
        actorRole: caller.role,
        action: 'PASSWORD_RESET_HIERARCHICAL',
        targetEntity: 'users',
        targetId: targetUserId,
        metadataJson: {
          targetRole: targetUser.role,
          targetUsername: targetUser.username,
        },
      }),
    );

    return {
      success: true,
      message: `Password for user '${targetUser.username}' successfully reset`,
    };
  }

  async updateUser(
    caller: { id: string; role: string; facilityId?: string | null },
    targetUserId: string,
    dto: UpdateUserDto,
  ): Promise<UserSummary> {
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: { facility: true },
    });
    if (!targetUser) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Target user not found',
      });
    }

    assertCanManage(caller, targetUser);

    // NAKES must not escalate roles or move users across facilities.
    if (caller.role === 'NAKES') {
      if (
        dto.role &&
        !MANAGEABLE_ROLES.includes(
          dto.role as (typeof MANAGEABLE_ROLES)[number],
        )
      ) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Faskes can only assign pasien and pmo roles',
        });
      }
      if (
        dto.facilityId !== undefined &&
        dto.facilityId !== caller.facilityId
      ) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cannot move users to another facility',
        });
      }
    }

    // Validate a requested facility exists (ADMIN may reassign).
    if (dto.facilityId) {
      const facility = await this.facilityRepo.findOneBy({
        id: dto.facilityId,
      });
      if (!facility) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Facility not found',
        });
      }
    }

    if (dto.email && dto.email !== targetUser.email) {
      const emailTaken = await this.userRepo.findOneBy({ email: dto.email });
      if (emailTaken) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Email '${dto.email}' is already in use`,
        });
      }
    }

    // Write through Better Auth's adapter, the same layer createUser uses, so
    // PII columns keep one storage format (the TypeORM transformer would
    // otherwise re-encrypt every column on save).
    const ctx = await auth.$context;
    const data: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      data.name = dto.fullName;
      data.full_name_encrypted = dto.fullName;
    }
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.whatsappNumber !== undefined) {
      data.whatsapp_encrypted = dto.whatsappNumber;
      data.whatsapp_hash = dto.whatsappNumber
        ? hashPhone(dto.whatsappNumber)
        : null;
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.facilityId !== undefined) data.facility_id = dto.facilityId;

    await ctx.internalAdapter.updateUser(targetUserId, data);

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: caller.id,
        actorRole: caller.role,
        action: 'USER_UPDATE',
        targetEntity: 'users',
        targetId: targetUserId,
        metadataJson: {
          targetRole: targetUser.role,
          targetUsername: targetUser.username,
          changedFields: Object.keys(dto),
        },
      }),
    );

    return this.getMe(targetUserId);
  }

  async listUsers(caller: {
    id: string;
    role: string;
    facilityId?: string | null;
  }, query: ListUsersQuery): Promise<UserListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // A NAKES without a facility must not page through every facility.
    if (caller.role === 'NAKES' && !caller.facilityId) {
      return { items: [], total: 0, page, limit };
    }

    const [users, total] = await this.userRepo.findAndCount({
      where: {
        ...(caller.role === 'NAKES' ? { facilityId: caller.facilityId! } : {}),
        ...(query.role?.length ? { role: In(query.role) } : {}),
      },
      relations: { facility: true },
      // `id` is unique, so page boundaries stay stable across queries.
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        facilityId: user.facilityId,
        facility: user.facility?.name ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getMe(userId: string): Promise<UserSummary> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { facility: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      whatsappNumber: user.whatsappEncrypted!,
      facilityId: user.facilityId,
      facility: user.facility?.name ?? null,
    };
  }
}
