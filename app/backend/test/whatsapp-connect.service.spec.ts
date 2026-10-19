import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { WhatsappConnectService } from "../src/modules/whatsapp/services/whatsapp-connect.service.js";

describe("WhatsappConnectService Unit Tests", () => {
  let service: WhatsappConnectService;

  let mockVerifyRepo: any;
  let mockUserRepo: any;
  let mockFamilyRepo: any;
  let mockPlanRepo: any;
  let mockHistoryRepo: any;
  let mockAuditRepo: any;
  let mockWahaClient: any;

  beforeEach(() => {
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
    };

    service = new WhatsappConnectService(
      mockVerifyRepo,
      mockUserRepo,
      mockFamilyRepo,
      mockPlanRepo,
      mockHistoryRepo,
      mockAuditRepo,
      mockWahaClient,
    );
  });

  describe("generateConnectChallenge", () => {
    it("throws NotFoundException if user is not found", async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.generateConnectChallenge("nonexistent", "PASIEN", {
          phoneNumber: "081234567890",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("generates 6-character uppercase code and deep link for user", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: "user-1", role: "PASIEN" });

      const res = await service.generateConnectChallenge("user-1", "PASIEN", {
        phoneNumber: "081234567890",
      });

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
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // active
      };
      mockVerifyRepo.findOne.mockResolvedValue(pendingVerify);

      const res = await service.getConnectionStatus("user-1", {});
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
