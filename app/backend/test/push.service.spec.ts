import { describe, it, expect, beforeEach, vi } from "vitest";
import { PushService } from "../src/modules/push/services/push.service.js";
import webpush from "web-push";

describe("PushService Unit Tests", () => {
  let service: PushService;
  let mockPushRepo: any;
  let mockPlanRepo: any;
  let mockHistoryRepo: any;

  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY =
      "BAK8cLaycb4Sk0Ea8y_kjTed9Temj7WY-XxLfdhnzly2-6wcZrUaMGDPwEnFqsLTyQ7u-elWzCCzH5uc8Uwtubc";
    process.env.VAPID_PRIVATE_KEY =
      "RsA3wvsJZIq0Hpr2koqYFr754pZ7qSm9QRTs6y0O_os";
    process.env.VAPID_SUBJECT = "mailto:test@tiby.health";

    mockPushRepo = {
      findOneBy: vi.fn(),
      findBy: vi.fn(),
      create: vi.fn((data) => ({ id: "push-sub-uuid", ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "push-sub-uuid", ...data })),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockPlanRepo = {
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    mockHistoryRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    const mockUserRepo: any = {
      findOneBy: vi.fn(),
    };

    service = new PushService(mockPushRepo, mockPlanRepo, mockHistoryRepo, mockUserRepo);
  });

  describe("getVapidPublicKey", () => {
    it("returns configured VAPID public key", () => {
      const res = service.getVapidPublicKey();
      expect(res.publicKey).toBe(process.env.VAPID_PUBLIC_KEY);
    });
  });

  describe("subscribe", () => {
    it("creates a new subscription if endpoint does not exist", async () => {
      mockPushRepo.findOneBy.mockResolvedValue(null);

      const res = await service.subscribe(
        "user-1",
        {
          endpoint: "https://fcm.googleapis.com/fcm/send/sub-new-123",
          keys: {
            p256dh: "key-p256dh",
            auth: "key-auth",
          },
        },
        "Mozilla/5.0 Test Browser",
      );

      expect(res.subscribed).toBe(true);
      expect(res.endpoint).toBe("https://fcm.googleapis.com/fcm/send/sub-new-123");
      expect(mockPushRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          endpoint: "https://fcm.googleapis.com/fcm/send/sub-new-123",
          userAgent: "Mozilla/5.0 Test Browser",
        }),
      );
    });

    it("updates existing subscription if endpoint exists", async () => {
      const existing = {
        id: "existing-sub-id",
        userId: "old-user",
        endpoint: "https://fcm.googleapis.com/fcm/send/sub-existing",
        p256dh: "old-p256dh",
        auth: "old-auth",
        userAgent: "Old Agent",
      };
      mockPushRepo.findOneBy.mockResolvedValue(existing);

      const res = await service.subscribe(
        "user-2",
        {
          endpoint: "https://fcm.googleapis.com/fcm/send/sub-existing",
          keys: {
            p256dh: "new-p256dh",
            auth: "new-auth",
          },
        },
        "New Agent",
      );

      expect(res.subscribed).toBe(true);
      expect(existing.userId).toBe("user-2");
      expect(existing.p256dh).toBe("new-p256dh");
      expect(existing.userAgent).toBe("New Agent");
      expect(mockPushRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe("unsubscribe", () => {
    it("deletes push subscription by endpoint and userId", async () => {
      const res = await service.unsubscribe("user-1", {
        endpoint: "https://fcm.googleapis.com/fcm/send/sub-123",
      });

      expect(res.unsubscribed).toBe(true);
      expect(mockPushRepo.delete).toHaveBeenCalledWith({
        endpoint: "https://fcm.googleapis.com/fcm/send/sub-123",
        userId: "user-1",
      });
    });
  });

  describe("sendNotificationToUser & Stigma Stripping", () => {
    it("delivers push notification and prunes expired subscription on 410 Gone", async () => {
      const sub = {
        id: "sub-expired-id",
        userId: "user-1",
        endpoint: "https://fcm.googleapis.com/fcm/send/sub-expired",
        p256dh: "p256dh",
        auth: "auth",
      };
      mockPushRepo.findBy.mockResolvedValue([sub]);

      const goneError: any = new Error("Subscription expired");
      goneError.statusCode = 410;
      vi.spyOn(webpush, "sendNotification").mockRejectedValueOnce(goneError);

      const res = await service.sendNotificationToUser("user-1", {
        title: "Pengingat Minum Obat TBC",
        body: "Yuk minum obat Tuberkulosis sekarang",
      });

      expect(res.failed).toBe(1);
      // Pruned expired subscription
      expect(mockPushRepo.delete).toHaveBeenCalledWith({ id: "sub-expired-id" });
    });
  });

  describe("sendManualNotification", () => {
    it("allows user to send notification to themselves (self-test)", async () => {
      vi.spyOn(service, "sendNotificationToUser").mockResolvedValue({
        sent: 1,
        failed: 0,
      });

      const res = await service.sendManualNotification(
        { id: "user-1", role: "PASIEN" },
        { title: "Test Title", body: "Test Body" },
      );

      expect(res.success).toBe(true);
      expect(res.sent).toBe(1);
      expect(res.targetUserId).toBe("user-1");
    });

    it("forbids PASIEN from sending notification to another user", async () => {
      await expect(
        service.sendManualNotification(
          { id: "patient-1", role: "PASIEN" },
          { targetUserId: "patient-2", title: "Test", body: "Test" },
        ),
      ).rejects.toThrow();
    });
  });
});
