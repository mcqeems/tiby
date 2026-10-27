import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash, randomBytes } from "node:crypto";
import { WhatsappVerification } from "../entities/whatsapp-verification.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { FamilyContact } from "../../family-contacts/entities/family-contact.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { PatientStatusHistory } from "../../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../../internal/audit/entities/audit-log.entity.js";
import { WahaClientService } from "./waha-client.service.js";
import type {
  WhatsappConnectRequest,
  WhatsappConnectChallenge,
  WhatsappStatusQuery,
  WhatsappConnectionStatus,
  WahaWebhookPayload,
} from "@tiby/ts-shared";

export interface WhatsappCaller {
  userId: string;
  role: string;
  facilityId?: string | null;
}

const DIRECT_CHAT = /^[0-9]+@(c\.us|lid)$/;

/** Digits only, in international form: 08… / 8… / +62… all become 62…. */
export function normalizeWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (digits.startsWith("0")) normalized = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) normalized = `62${digits}`;

  if (!/^62[0-9]{7,13}$/.test(normalized)) {
    throw new BadRequestException({
      code: "BAD_REQUEST",
      message: "Invalid Indonesian WhatsApp number",
    });
  }
  return normalized;
}

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return createHash("sha256").update(digits).digest("hex");
}

function generate6CharCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

function notFound(): NotFoundException {
  return new NotFoundException({
    code: "NOT_FOUND",
    message: "Family contact not found",
  });
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
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly wahaClient: WahaClientService,
  ) {}

  async generateConnectChallenge(
    caller: WhatsappCaller,
    dto: WhatsappConnectRequest,
  ): Promise<WhatsappConnectChallenge> {
    const botPhoneNumber = process.env.WAHA_BOT_PHONE_NUMBER || "";
    if (process.env.WAHA_ENABLED === "true" && !botPhoneNumber.replace(/\D/g, "")) {
      throw new ServiceUnavailableException({
        code: "INTERNAL",
        message: "WhatsApp bot number is not configured",
      });
    }

    const normalizedDigits = normalizeWhatsappNumber(dto.phoneNumber);
    const expectedChatId = `${normalizedDigits}@c.us`;
    const phoneHash = hashPhone(normalizedDigits);

    if (dto.familyContactId) {
      // Any authenticated user could otherwise claim another plan's contact.
      await this.getAccessibleFamilyContact(caller, dto.familyContactId);
    } else {
      const user = await this.userRepo.findOneBy({ id: caller.userId });
      if (!user) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
    }

    const verificationCode = generate6CharCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Invalidate prior pending challenges for this user/contact
    if (dto.familyContactId) {
      await this.verifyRepo.update(
        { familyContactId: dto.familyContactId, status: "PENDING" },
        { status: "REPLACED" },
      );
    } else {
      await this.verifyRepo.update(
        { userId: caller.userId, status: "PENDING" },
        { status: "REPLACED" },
      );
    }

    const verification = this.verifyRepo.create({
      userId: dto.familyContactId ? null : caller.userId,
      familyContactId: dto.familyContactId ?? null,
      targetRole: dto.familyContactId ? "KELUARGA" : caller.role,
      phoneEncrypted: dto.phoneNumber,
      phoneHash,
      expectedChatId,
      verificationCode,
      status: "PENDING",
      expiresAt,
    });

    await this.verifyRepo.save(verification);

    const cleanBotPhone = botPhoneNumber.replace(/\D/g, "");
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
    caller: WhatsappCaller,
    query: WhatsappStatusQuery,
  ): Promise<WhatsappConnectionStatus> {
    if (query.familyContactId) {
      const family = await this.getAccessibleFamilyContact(
        caller,
        query.familyContactId,
      );

      const pending = await this.verifyRepo.findOne({
        where: { familyContactId: query.familyContactId, status: "PENDING" },
        order: { createdAt: "DESC" },
      });

      const active = pending && pending.expiresAt > new Date();
      return {
        verified: Boolean(family.whatsappVerified),
        phoneNumber: family.whatsappEncrypted,
        pendingCode: active ? pending.verificationCode : null,
        expiresAt: active ? pending.expiresAt.toISOString() : null,
        verifiedAt: family.whatsappVerifiedAt
          ? family.whatsappVerifiedAt.toISOString()
          : null,
      };
    }

    const user = await this.userRepo.findOneBy({ id: caller.userId });
    if (!user) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const pending = await this.verifyRepo.findOne({
      where: { userId: caller.userId, status: "PENDING" },
      order: { createdAt: "DESC" },
    });

    const active = pending && pending.expiresAt > new Date();
    return {
      verified: Boolean(user.whatsappVerified),
      phoneNumber: user.whatsappEncrypted,
      pendingCode: active ? pending.verificationCode : null,
      expiresAt: active ? pending.expiresAt.toISOString() : null,
      verifiedAt: user.whatsappVerifiedAt
        ? user.whatsappVerifiedAt.toISOString()
        : null,
    };
  }

  async handleInboundWebhook(
    dto: WahaWebhookPayload,
  ): Promise<{ handled: boolean; verified: boolean }> {
    const { event, payload } = dto;
    if (event !== "message" || payload.fromMe) {
      return { handled: true, verified: false };
    }

    // A group JID would bind future messages to a group; only direct chats may
    // complete a handshake.
    if (!DIRECT_CHAT.test(payload.from)) {
      this.logger.warn(`Ignoring WhatsApp handshake from non-direct chat`);
      return { handled: true, verified: false };
    }

    const bodyText = payload.body?.trim() || "";
    const codeMatch = bodyText.toUpperCase().match(/\b[A-Z0-9]{6}\b/);

    if (!codeMatch) {
      return { handled: true, verified: false };
    }

    const candidateCode = codeMatch[0];

    // WAHA reports WEBJS senders as @lid; resolve it to the phone JID so the
    // same "sender must be the registered number" rule still applies.
    const senderPhone = await this.wahaClient.resolvePhoneNumber(payload.from);
    if (!senderPhone) {
      this.logger.warn(`Cannot resolve WhatsApp sender ${payload.from}; ignoring handshake`);
      return { handled: true, verified: false };
    }
    const senderDigits = senderPhone.replace(/@.*$/, "");

    // The code alone is a bearer token; the sender must be the number that was
    // registered, or anyone could bind their phone to someone else's account.
    const verification = await this.verifyRepo.findOne({
      where: {
        verificationCode: candidateCode,
        status: "PENDING",
        phoneHash: hashPhone(senderDigits),
      },
    });

    if (!verification) {
      return { handled: true, verified: false };
    }

    if (verification.expiresAt <= new Date()) {
      verification.status = "EXPIRED";
      await this.verifyRepo.save(verification);
      return { handled: true, verified: false };
    }

    verification.status = "VERIFIED";
    verification.verifiedAt = new Date();
    await this.verifyRepo.save(verification);

    // Supersede any other challenge that was still open for this target.
    if (verification.userId) {
      await this.verifyRepo.update(
        { userId: verification.userId, status: "PENDING" },
        { status: "REPLACED" },
      );
    } else if (verification.familyContactId) {
      await this.verifyRepo.update(
        { familyContactId: verification.familyContactId, status: "PENDING" },
        { status: "REPLACED" },
      );
    }

    // Update target AuthUser or FamilyContact
    let treatmentPlanId: string | null = null;
    let actorUserId: string | null = verification.userId;
    let actorRole = verification.targetRole;
    if (verification.userId) {
      const user = await this.userRepo.findOneBy({ id: verification.userId });
      if (user) {
        // Keep the number that was actually proven, so the profile and status
        // endpoint have something to display.
        user.whatsappEncrypted = verification.phoneEncrypted;
        user.whatsappHash = verification.phoneHash;
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
        family.whatsappEncrypted = verification.phoneEncrypted;
        family.whatsappHash = verification.phoneHash;
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
          eventType: "WHATSAPP_CONNECTED",
          previousState: plan?.patientState ?? null,
          newState: plan?.patientState ?? null,
          previousStreak: plan?.currentStreak ?? null,
          newStreak: plan?.currentStreak ?? null,
          actorUserId,
          actorRole,
          reasonOrSummary: "WhatsApp number verified via 6-char code",
          metadataJson: { chatId: payload.from },
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId,
        actorRole,
        action: "WHATSAPP_CONNECTED",
        targetEntity: "whatsapp_verifications",
        targetId: verification.id,
        metadataJson: { chatId: payload.from },
      }),
    );

    // Bot handshake response via WAHA
    await this.wahaClient.sendSeen(payload.from, payload.id);
    await this.wahaClient.sendText(
      payload.from,
      "Halo! Nomor WhatsApp Anda sudah berhasil terhubung dengan Pandu. Pandu siap mendampingi perjalanan sehat Anda!",
    );

    return { handled: true, verified: true };
  }

  /**
   * A family contact may only be managed by its own patient, the PMO assigned
   * to that plan, a NAKES in the plan's facility, or an ADMIN. 404, not 403:
   * the endpoint must not reveal that another plan's contact exists.
   */
  private async getAccessibleFamilyContact(
    caller: WhatsappCaller,
    familyContactId: string,
  ): Promise<FamilyContact> {
    const family = await this.familyRepo.findOneBy({ id: familyContactId });
    if (!family) throw notFound();

    const plan = await this.planRepo.findOneBy({ id: family.treatmentPlanId });
    if (!plan) throw notFound();

    let allowed = false;
    if (caller.role === "ADMIN") {
      allowed = true;
    } else if (caller.role === "PASIEN") {
      allowed = plan.patientUserId === caller.userId;
    } else if (caller.role === "NAKES") {
      allowed = Boolean(caller.facilityId) && plan.facilityId === caller.facilityId;
    } else if (caller.role === "PMO") {
      allowed =
        (await this.pmoRepo.count({
          where: {
            treatmentPlanId: plan.id,
            pmoUserId: caller.userId,
            active: true,
          },
        })) > 0;
    }

    if (!allowed) throw notFound();
    return family;
  }
}
