import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationDispatchService } from "../src/modules/whatsapp/services/notification-dispatch.service.js";
import { NotificationTriggerEvent } from "../src/common/events/notification-trigger.event.js";

function makeService() {
  const logRepo = {
    create: vi.fn((data) => data),
    save: vi.fn((data) => Promise.resolve(data)),
  };
  const planRepo = { findOneBy: vi.fn() };
  const pmoRepo = { find: vi.fn().mockResolvedValue([]) };
  const familyRepo = { find: vi.fn().mockResolvedValue([]), findOneBy: vi.fn() };
  const userRepo = { findOneBy: vi.fn() };
  const pushService = {
    sendNotificationToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  };
  const wahaClient = {
    sendText: vi.fn().mockResolvedValue({ success: true, messageId: "wa-1" }),
  };
  const notificationsService = {
    createMany: vi.fn().mockResolvedValue(undefined),
  };

  const service = new NotificationDispatchService(
    logRepo as any,
    planRepo as any,
    pmoRepo as any,
    familyRepo as any,
    userRepo as any,
    pushService as any,
    wahaClient as any,
    notificationsService as any,
  );

  return {
    service,
    logRepo,
    planRepo,
    pmoRepo,
    familyRepo,
    userRepo,
    pushService,
    wahaClient,
    notificationsService,
  };
}

const pasienEvent = () =>
  new NotificationTriggerEvent("DAILY_REMINDER", "plan-1", "PASIEN", "pasien-1");

describe("NotificationDispatchService", () => {
  beforeEach(() => {
    delete process.env.WAHA_ENABLED;
  });

  it("logs a skipped WhatsApp row per patient while WAHA is disabled", async () => {
    const {
      service,
      logRepo,
      planRepo,
      pushService,
      wahaClient,
      notificationsService,
    } = makeService();
    planRepo.findOneBy.mockResolvedValue({ id: "plan-1", patientUserId: "pasien-1" });

    await service.handleNotificationTrigger(pasienEvent());

    expect(notificationsService.createMany).toHaveBeenCalledWith(
      ["pasien-1"],
      expect.objectContaining({
        type: "DAILY_REMINDER",
        severity: "INFO",
      }),
    );
    expect(pushService.sendNotificationToUser).toHaveBeenCalledWith(
      "pasien-1",
      expect.objectContaining({ title: expect.any(String) }),
    );
    expect(wahaClient.sendText).not.toHaveBeenCalled();
    const channels = logRepo.save.mock.calls.map((c) => c[0].channel);
    expect(channels).toEqual(["WEB_PUSH", "WHATSAPP"]);
    const whatsapp = logRepo.save.mock.calls[1][0];
    expect(whatsapp.deliveryStatus).toBe("SKIPPED_WAHA_DISABLED");
    expect(whatsapp.recipientUserId).toBe("pasien-1");
  });

  it("sends WhatsApp to a verified patient when WAHA is enabled", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, logRepo, planRepo, wahaClient, userRepo } = makeService();
    planRepo.findOneBy.mockResolvedValue({ id: "plan-1", patientUserId: "pasien-1" });
    userRepo.findOneBy.mockResolvedValue({
      id: "pasien-1",
      whatsappVerified: true,
      whatsappChatId: "6281234567890@c.us",
    });

    await service.handleNotificationTrigger(pasienEvent());

    expect(wahaClient.sendText).toHaveBeenCalledWith(
      "6281234567890@c.us",
      expect.stringContaining("Waktunya Minum Obat"),
    );
    const whatsapp = logRepo.save.mock.calls.find((c) => c[0].channel === "WHATSAPP")[0];
    expect(whatsapp.deliveryStatus).toBe("DELIVERED");
    expect(whatsapp.externalMessageId).toBe("wa-1");
    expect(whatsapp.triggerCircumstance).toBe("DAILY_REMINDER");
  });

  it("marks an unverified patient instead of sending", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, logRepo, planRepo, wahaClient, userRepo } = makeService();
    planRepo.findOneBy.mockResolvedValue({ id: "plan-1", patientUserId: "pasien-1" });
    userRepo.findOneBy.mockResolvedValue({ id: "pasien-1", whatsappVerified: false });

    await service.handleNotificationTrigger(pasienEvent());

    expect(wahaClient.sendText).not.toHaveBeenCalled();
    const whatsapp = logRepo.save.mock.calls.find((c) => c[0].channel === "WHATSAPP")[0];
    expect(whatsapp.deliveryStatus).toBe("SKIPPED_UNVERIFIED");
  });

  it("notifies every PMO assigned to the plan", async () => {
    const { service, logRepo, pmoRepo, pushService, userRepo, wahaClient } = makeService();
    pmoRepo.find.mockResolvedValue([{ pmoUserId: "pmo-1" }, { pmoUserId: "pmo-2" }]);
    userRepo.findOneBy.mockResolvedValue({ whatsappVerified: false });

    await service.handleNotificationTrigger(
      new NotificationTriggerEvent("RED_FLAG_ALERT", "plan-1", "PMO"),
    );

    expect(pushService.sendNotificationToUser).toHaveBeenCalledTimes(2);
    expect(pushService.sendNotificationToUser).toHaveBeenCalledWith("pmo-1", expect.anything());
    expect(pushService.sendNotificationToUser).toHaveBeenCalledWith("pmo-2", expect.anything());
    const whatsappRows = logRepo.save.mock.calls
      .map((c) => c[0])
      .filter((row) => row.channel === "WHATSAPP");
    expect(whatsappRows).toHaveLength(2);
    expect(wahaClient.sendText).not.toHaveBeenCalled();
  });

  it("sends family contacts WhatsApp only, and never Web Push", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, logRepo, familyRepo, pushService, wahaClient } = makeService();
    familyRepo.find.mockResolvedValue([
      { id: "family-1", whatsappVerified: true, whatsappChatId: "628111@c.us" },
      { id: "family-2", whatsappVerified: false, whatsappChatId: null },
    ]);

    await service.handleNotificationTrigger(
      new NotificationTriggerEvent("RED_FLAG_ALERT", "plan-1", "KELUARGA"),
    );

    expect(pushService.sendNotificationToUser).not.toHaveBeenCalled();
    expect(wahaClient.sendText).toHaveBeenCalledTimes(1);
    expect(wahaClient.sendText).toHaveBeenCalledWith("628111@c.us", expect.any(String));

    const rows = logRepo.save.mock.calls.map((c) => c[0]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      recipientFamilyContactId: "family-1",
      recipientRole: "KELUARGA",
      deliveryStatus: "DELIVERED",
    });
    expect(rows[1]).toMatchObject({
      recipientFamilyContactId: "family-2",
      deliveryStatus: "SKIPPED_UNVERIFIED",
    });
  });

  it("targets a single family contact when the event names one", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, familyRepo, wahaClient } = makeService();
    familyRepo.findOneBy.mockResolvedValue({
      id: "family-9",
      whatsappVerified: true,
      whatsappChatId: "628999@c.us",
    });

    await service.handleNotificationTrigger(
      new NotificationTriggerEvent("SILENCE_H2_ESCALATION", "plan-1", "KELUARGA", undefined, "family-9"),
    );

    expect(familyRepo.find).not.toHaveBeenCalled();
    expect(wahaClient.sendText).toHaveBeenCalledWith("628999@c.us", expect.any(String));
  });

  it("does not skip WhatsApp when Web Push throws", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, planRepo, pushService, userRepo, wahaClient, logRepo } = makeService();
    planRepo.findOneBy.mockResolvedValue({ id: "plan-1", patientUserId: "pasien-1" });
    pushService.sendNotificationToUser.mockRejectedValue(new Error("push down"));
    userRepo.findOneBy.mockResolvedValue({
      whatsappVerified: true,
      whatsappChatId: "628123@c.us",
    });

    await service.handleNotificationTrigger(pasienEvent());

    expect(wahaClient.sendText).toHaveBeenCalledTimes(1);
    const pushRow = logRepo.save.mock.calls.find((c) => c[0].channel === "WEB_PUSH")[0];
    expect(pushRow.deliveryStatus).toBe("FAILED");
  });
});
