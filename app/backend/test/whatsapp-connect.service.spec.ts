import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  WhatsappConnectService,
  normalizeWhatsappNumber,
} from "../src/modules/whatsapp/services/whatsapp-connect.service.js";
import { createHash } from "node:crypto";

const hash = (digits: string) =>
  createHash("sha256").update(digits).digest("hex");

describe("WhatsappConnectService Unit Tests", () => {
  let service: WhatsappConnectService;

  let mockVerifyRepo: any;
  let mockUserRepo: any;
  let mockFamilyRepo: any;
  let mockPmoRepo: any;
  let mockPlanRepo: any;
  let mockHistoryRepo: any;
  let mockAuditRepo: any;
  let mockWahaClient: any;

  beforeEach(() => {
    process.env.WAHA_ENABLED = "true";
    process.env.WAHA_BOT_PHONE_NUMBER = "+62811-9988-7766";

    mockVerifyRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: "verify-uuid", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "verify-uuid", ...data })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockUserRepo = {
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockFamilyRepo = {
      findOneBy: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockPmoRepo = { count: vi.fn().mockResolvedValue(0) };
    mockPlanRepo = {
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockAuditRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockWahaClient = {
      sendSeen: vi.fn().mockResolvedValue(true),
      sendText: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
      resolvePhoneNumber: vi.fn((id: string) => Promise.resolve(id)),
    };

    service = new WhatsappConnectService(
      mockVerifyRepo,
      mockUserRepo,
      mockFamilyRepo,
      mockPmoRepo,
      mockPlanRepo,
      mockHistoryRepo,
      mockAuditRepo,
      mockWahaClient,
    );
  });

  describe("normalizeWhatsappNumber", () => {
    it("accepts 08, 8 and +62 prefixes", () => {
      expect(normalizeWhatsappNumber("081234567890")).toBe("6281234567890");
      expect(normalizeWhatsappNumber("81234567890")).toBe("6281234567890");
      expect(normalizeWhatsappNumber("+62 812-3456-7890")).toBe("6281234567890");
    });

    it("rejects numbers that cannot be Indonesian WhatsApp numbers", () => {
      expect(() => normalizeWhatsappNumber("12345")).toThrow(BadRequestException);
      expect(() => normalizeWhatsappNumber("021-555")).toThrow(BadRequestException);
    });
  });

  describe("generateConnectChallenge", () => {
    it("throws NotFoundException if user is not found", async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.generateConnectChallenge(
          { userId: "nonexistent", role: "PASIEN" },
          { phoneNumber: "081234567890" },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("generates 6-character uppercase code and deep link for user", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "user-1", role: "PASIEN" });

      const res = await service.generateConnectChallenge(
        { userId: "user-1", role: "PASIEN" },
        { phoneNumber: "081234567890" },
      );

      expect(res.verificationCode).toHaveLength(6);
      expect(res.verificationCode).toBe(res.verificationCode.toUpperCase());
      expect(res.botPhoneNumber).toBe("+62811-9988-7766");
      expect(res.wahaDeepLink).toContain("wa.me/6281199887766?text=" + res.verificationCode);
      expect(res.expiresAt).toBeDefined();

      expect(mockVerifyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          expectedChatId: "6281234567890@c.us",
          verificationCode: res.verificationCode,
          status: "PENDING",
        }),
      );
    });

    it("refuses to issue a challenge without a bot number", async () => {
      delete process.env.WAHA_BOT_PHONE_NUMBER;

      await expect(
        service.generateConnectChallenge(
          { userId: "user-1", role: "PASIEN" },
          { phoneNumber: "081234567890" },
        ),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("lets a patient manage their own family contact", async () => {
      mockFamilyRepo.findOneBy.mockResolvedValue({
        id: "family-1",
        treatmentPlanId: "plan-1",
      });
      mockPlanRepo.findOneBy.mockResolvedValue({
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
      });

      const res = await service.generateConnectChallenge(
        { userId: "user-1", role: "PASIEN" },
        { phoneNumber: "081234567890", familyContactId: "family-1" },
      );

      expect(res.verificationCode).toHaveLength(6);
      expect(mockVerifyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          familyContactId: "family-1",
          targetRole: "KELUARGA",
        }),
      );
    });

    it("hides another patient's family contact behind a 404", async () => {
      mockFamilyRepo.findOneBy.mockResolvedValue({
        id: "family-1",
        treatmentPlanId: "plan-1",
      });
      mockPlanRepo.findOneBy.mockResolvedValue({
        id: "plan-1",
        patientUserId: "someone-else",
        facilityId: "faskes-1",
      });

      await expect(
        service.generateConnectChallenge(
          { userId: "user-1", role: "PASIEN" },
          { phoneNumber: "081234567890", familyContactId: "family-1" },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("lets the plan's PMO manage the family contact", async () => {
      mockFamilyRepo.findOneBy.mockResolvedValue({
        id: "family-1",
        treatmentPlanId: "plan-1",
      });
      mockPlanRepo.findOneBy.mockResolvedValue({
        id: "plan-1",
        patientUserId: "user-1",
        facilityId: "faskes-1",
      });
      mockPmoRepo.count.mockResolvedValue(1);

      await service.generateConnectChallenge(
        { userId: "pmo-1", role: "PMO" },
        { phoneNumber: "081234567890", familyContactId: "family-1" },
      );

      expect(mockVerifyRepo.save).toHaveBeenCalled();
    });
  });

  describe("getConnectionStatus", () => {
    it("returns connection status for user with pending code", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: "user-1",
        whatsappVerified: false,
        whatsappEncrypted: "081234567890",
        whatsappVerifiedAt: null,
      });

      const pendingVerify = {
        verificationCode: "ABC123",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      mockVerifyRepo.findOne.mockResolvedValue(pendingVerify);

      const res = await service.getConnectionStatus(
        { userId: "user-1", role: "PASIEN" },
        {},
      );
      expect(res.verified).toBe(false);
      expect(res.phoneNumber).toBe("081234567890");
      expect(res.pendingCode).toBe("ABC123");
    });
  });

  describe("handleInboundWebhook", () => {
    it("ignores messages sent by the bot itself (fromMe=true)", async () => {
      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "6281234567890@c.us",
          body: "ABC123",
          fromMe: true,
        },
      });

      expect(res.handled).toBe(true);
      expect(res.verified).toBe(false);
      expect(mockVerifyRepo.findOne).not.toHaveBeenCalled();
    });

    it("ignores group chats: a group JID must never be bound to an account", async () => {
      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "120363000000000000@g.us",
          body: "ABC123",
        },
      });

      expect(res.verified).toBe(false);
      expect(mockVerifyRepo.findOne).not.toHaveBeenCalled();
    });

    it("only matches a challenge registered to the sending number", async () => {
      await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "6281234567890@c.us",
          body: "Halo ini kode verifikasi saya: XYZ987",
        },
      });

      expect(mockVerifyRepo.findOne).toHaveBeenCalledWith({
        where: {
          verificationCode: "XYZ987",
          status: "PENDING",
          phoneHash: hash("6281234567890"),
        },
      });
    });

    it("does not verify when the sender does not match the registered number", async () => {
      mockVerifyRepo.findOne.mockResolvedValue(null);

      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "6289999999999@c.us",
          body: "XYZ987",
        },
      });

      expect(res.verified).toBe(false);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it("verifies user account when incoming message contains matching 6-char verification code", async () => {
      const verification = {
        id: "verify-1",
        userId: "user-1",
        verificationCode: "XYZ987",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      mockVerifyRepo.findOne.mockResolvedValue(verification);

      const user = {
        id: "user-1",
        whatsappVerified: false,
        whatsappChatId: null,
      };
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          id: "waha-msg-uuid",
          from: "6281234567890@c.us",
          body: "Halo ini kode verifikasi saya: XYZ987",
        },
      });

      expect(res.handled).toBe(true);
      expect(res.verified).toBe(true);

      // Verify verification record updated
      expect(verification.status).toBe("VERIFIED");
      expect(mockVerifyRepo.save).toHaveBeenCalledWith(verification);

      // Verify user updated
      expect(user.whatsappVerified).toBe(true);
      expect(user.whatsappChatId).toBe("6281234567890@c.us");
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);

      // Verify bot sent seen & welcome message
      expect(mockWahaClient.sendSeen).toHaveBeenCalledWith("6281234567890@c.us", "waha-msg-uuid");
      expect(mockWahaClient.sendText).toHaveBeenCalledWith(
        "6281234567890@c.us",
        expect.stringContaining("terhubung dengan Pandu"),
      );
    });

    it("resolves a @lid sender to the registered phone and binds the LID chat", async () => {
      mockWahaClient.resolvePhoneNumber.mockResolvedValue("6281234567890@c.us");
      const verification = {
        id: "verify-lid",
        userId: "user-1",
        verificationCode: "LID123",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      mockVerifyRepo.findOne.mockResolvedValue(verification);
      const user = { id: "user-1", whatsappVerified: false, whatsappChatId: null };
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          id: "waha-msg-lid",
          from: "255546879938701@lid",
          body: "Kode saya LID123",
        },
      });

      expect(res.verified).toBe(true);
      expect(mockWahaClient.resolvePhoneNumber).toHaveBeenCalledWith("255546879938701@lid");
      expect(mockVerifyRepo.findOne).toHaveBeenCalledWith({
        where: {
          verificationCode: "LID123",
          status: "PENDING",
          phoneHash: hash("6281234567890"),
        },
      });
      // Replies must go back to the JID WAHA reported, not the phone JID.
      expect(user.whatsappChatId).toBe("255546879938701@lid");
      expect(mockWahaClient.sendText).toHaveBeenCalledWith(
        "255546879938701@lid",
        expect.any(String),
      );
    });

    it("ignores a LID that cannot be mapped to a phone number", async () => {
      mockWahaClient.resolvePhoneNumber.mockResolvedValue(null);

      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "255546879938701@lid",
          body: "Kode saya LID123",
        },
      });

      expect(res.verified).toBe(false);
      expect(mockVerifyRepo.findOne).not.toHaveBeenCalled();
      expect(mockWahaClient.sendText).not.toHaveBeenCalled();
    });

    it("returns handled: true, verified: false if code does not match active challenge", async () => {
      mockVerifyRepo.findOne.mockResolvedValue(null);

      const res = await service.handleInboundWebhook({
        event: "message",
        payload: {
          from: "6281234567890@c.us",
          body: "KODE99",
        },
      });

      expect(res.handled).toBe(true);
      expect(res.verified).toBe(false);
    });
  });
});
