import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { AuthUser } from '../../auth/entities/auth-user.entity.js';
import { Facility } from '../facilities/entities/facility.entity.js';
import { AuditLog } from '../audit/entities/audit-log.entity.js';
import { auth } from '../../auth/auth.config.js';
import type {
  CreateUserDto,
  ChangeOwnPasswordDto,
  ResetUserPasswordDto,
  UserSummary,
} from '@tiby/ts-shared';

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return createHash('sha256').update(digits).digest('hex');
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
      username: dto.username,
      name: dto.fullName,
      role: dto.role,
      facilityId: targetFacilityId,
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

    if (caller.role === 'ADMIN') {
      // ADMIN can reset any account's password
    } else if (caller.role === 'NAKES') {
      // Faskes can reset its own password, or PASIEN/PMO in their own facility
      if (targetUser.id === caller.id) {
        // self reset
      } else if (
        (targetUser.role === 'PASIEN' || targetUser.role === 'PMO') &&
        targetUser.facilityId === caller.facilityId
      ) {
        // authorized
      } else {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message:
            'Faskes can only reset passwords for pasien and pmo in their own facility',
        });
      }
    } else {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: "You are not authorized to reset other users' passwords",
      });
    }

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

  async listUsers(caller: {
    id: string;
    role: string;
    facilityId?: string | null;
  }): Promise<UserSummary[]> {
    const qb = this.userRepo.createQueryBuilder('u');

    if (caller.role === 'NAKES' && caller.facilityId) {
      qb.where('u.facilityId = :facilityId', { facilityId: caller.facilityId });
    }

    qb.orderBy('u.id', 'ASC');
    const users = await qb.getMany();

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      facilityId: u.facilityId,
    }));
  }

  async getMe(userId: string): Promise<UserSummary> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      facilityId: user.facilityId,
    };
  }
}
