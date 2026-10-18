import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { WhatsappVerification } from '../entities/whatsapp-verification.entity.js';
import { AuthUser } from '../../../auth/entities/auth-user.entity.js';
import { FamilyContact } from '../../treatments/entities/family-contact.entity.js';
import { TreatmentPlan } from '../../treatments/entities/treatment-plan.entity.js';
import { PatientStatusHistory } from '../../treatments/entities/patient-status-history.entity.js';
import { AuditLog } from '../../audit/entities/audit-log.entity.js';
import { WahaClientService } from './waha-client.service.js';
import type {
  WhatsappConnectRequest,
  WhatsappConnectChallenge,
  WhatsappStatusQuery,
  WhatsappConnectionStatus,
  WahaWebhookPayload,
} from '@tiby/ts-shared';

function normalizeIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return createHash('sha256').update(digits).digest('hex');
}

function generate6CharCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

@Injectable()
export class WhatsappConnectService {
  private readonly logger = new Logger(WhatsappConnectService.name);

  constructor(
    @InjectRepository(WhatsappVerification)
    private readonly verifyRepo: Repository<WhatsappVerification>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(FamilyContact)
    private readonly familyRepo: Repository<FamilyContact>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly wahaClient: WahaClientService,
  ) {}

  async generateConnectChallenge(
    userId: string,
    userRole: string,
    dto: WhatsappConnectRequest,
  ): Promise<WhatsappConnectChallenge> {
    const normalizedDigits = normalizeIndonesianPhone(dto.phoneNumber);
    const expectedChatId = `${normalizedDigits}@c.us`;
    const phoneHash = hashPhone(dto.phoneNumber);

    if (dto.familyContactId) {
      const family = await this.familyRepo.findOneBy({
        id: dto.familyContactId,
      });
      if (!family) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Family contact not found',
        });
      }
    } else {
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
    }

    const verificationCode = generate6CharCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Invalidate prior pending challenges for this user/contact
    if (dto.familyContactId) {
      await this.verifyRepo.update(
        { familyContactId: dto.familyContactId, status: 'PENDING' },
        { status: 'REPLACED' },
      );
    } else {
      await this.verifyRepo.update(
        { userId, status: 'PENDING' },
        { status: 'REPLACED' },
      );
    }

    const verification = this.verifyRepo.create({
      userId: dto.familyContactId ? null : userId,
      familyContactId: dto.familyContactId ?? null,
      targetRole: dto.familyContactId ? 'FAMILY' : userRole,
      phoneEncrypted: dto.phoneNumber,
      phoneHash,
      expectedChatId,
      verificationCode,
      status: 'PENDING',
      expiresAt,
    });

    await this.verifyRepo.save(verification);

    const botPhoneNumber = process.env.WAHA_BOT_PHONE_NUMBER || '';
    const cleanBotPhone = botPhoneNumber.replace(/\D/g, '');
    const wahaDeepLink = cleanBotPhone
      ? `https://wa.me/${cleanBotPhone}?text=${verificationCode}`
      : `https://wa.me/?text=${verificationCode}`;

    return {
      verificationCode,
      botPhoneNumber,
      wahaDeepLink,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getConnectionStatus(
    userId: string,
    query: WhatsappStatusQuery,
  ): Promise<WhatsappConnectionStatus> {
    if (query.familyContactId) {
      const family = await this.familyRepo.findOneBy({
        id: query.familyContactId,
      });
      if (!family) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Family contact not found',
        });
      }

      const pending = await this.verifyRepo.findOne({
        where: { familyContactId: query.familyContactId, status: 'PENDING' },
        order: { createdAt: 'DESC' },
      });

      return {
        verified: Boolean(family.whatsappVerified),
        phoneNumber: family.whatsappEncrypted,
        pendingCode:
          pending && pending.expiresAt > new Date()
            ? pending.verificationCode
            : null,
        expiresAt:
          pending && pending.expiresAt > new Date()
            ? pending.expiresAt.toISOString()
            : null,
        verifiedAt: family.whatsappVerifiedAt
          ? family.whatsappVerifiedAt.toISOString()
          : null,
      };
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const pending = await this.verifyRepo.findOne({
      where: { userId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });

    return {
      verified: Boolean(user.whatsappVerified),
      phoneNumber: user.whatsappEncrypted,
      pendingCode:
        pending && pending.expiresAt > new Date()
          ? pending.verificationCode
          : null,
      expiresAt:
        pending && pending.expiresAt > new Date()
          ? pending.expiresAt.toISOString()
          : null,
      verifiedAt: user.whatsappVerifiedAt
        ? user.whatsappVerifiedAt.toISOString()
        : null,
    };
  }

  async handleInboundWebhook(
    dto: WahaWebhookPayload,
  ): Promise<{ handled: boolean; verified: boolean }> {
    const { event, payload } = dto;
    if (event !== 'message' || payload.fromMe) {
      return { handled: true, verified: false };
    }

    const bodyText = payload.body?.trim() || '';
    const codeMatch = bodyText.toUpperCase().match(/\b[A-Z0-9]{6}\b/);

    if (!codeMatch) {
      return { handled: true, verified: false };
    }

    const candidateCode = codeMatch[0];
    const verification = await this.verifyRepo.findOne({
      where: {
        verificationCode: candidateCode,
        status: 'PENDING',
      },
    });

    if (!verification) {
      return { handled: true, verified: false };
    }

    if (verification.expiresAt <= new Date()) {
      verification.status = 'EXPIRED';
      await this.verifyRepo.save(verification);
      return { handled: true, verified: false };
    }

    if (
      verification.expectedChatId &&
      verification.expectedChatId !== payload.from
    ) {
      this.logger.warn(
        `WAHA verification sender mismatch: expected ${verification.expectedChatId}, got ${payload.from}. Accepting sender as source of truth.`,
      );
    }

    // Mark verification as verified
    verification.status = 'VERIFIED';
    verification.verifiedAt = new Date();
    await this.verifyRepo.save(verification);

    // Update target AuthUser or FamilyContact
    let treatmentPlanId: string | null = null;
    let actorUserId: string | null = verification.userId;
    let actorRole = verification.targetRole;
    if (verification.userId) {
      const user = await this.userRepo.findOneBy({ id: verification.userId });
      if (user) {
        user.whatsappVerified = true;
        user.whatsappVerifiedAt = new Date();
        user.whatsappChatId = payload.from;
        await this.userRepo.save(user);
        actorRole = user.role;
      }
      const plan = await this.planRepo.findOneBy({
        patientUserId: verification.userId,
      });
      if (plan) {
        treatmentPlanId = plan.id;
      }
    } else if (verification.familyContactId) {
      const family = await this.familyRepo.findOneBy({
        id: verification.familyContactId,
      });
      if (family) {
        family.whatsappVerified = true;
        family.whatsappVerifiedAt = new Date();
        family.whatsappChatId = payload.from;
        await this.familyRepo.save(family);
        treatmentPlanId = family.treatmentPlanId;
        actorUserId = family.addedByUserId;
      }
    }

    if (treatmentPlanId) {
      const plan = await this.planRepo.findOneBy({ id: treatmentPlanId });
      await this.historyRepo.save(
        this.historyRepo.create({
          treatmentPlanId,
          eventType: 'WHATSAPP_CONNECTED',
          previousState: plan?.patientState ?? null,
          newState: plan?.patientState ?? null,
          previousStreak: plan?.currentStreak ?? null,
          newStreak: plan?.currentStreak ?? null,
          actorUserId,
          actorRole,
          reasonOrSummary: 'WhatsApp number verified via 6-char code',
          metadataJson: { chatId: payload.from },
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId,
        actorRole,
        action: 'WHATSAPP_CONNECTED',
        targetEntity: 'whatsapp_verifications',
        targetId: verification.id,
        metadataJson: { chatId: payload.from },
      }),
    );

    // Bot handshake response via WAHA
    await this.wahaClient.sendSeen(payload.from, payload.id);
    await this.wahaClient.sendText(
      payload.from,
      'Halo! Nomor WhatsApp Anda sudah berhasil terhubung dengan Pandu. Pandu siap mendampingi perjalanan sehat Anda!',
    );

    return { handled: true, verified: true };
  }
}
