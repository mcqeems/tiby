import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { AdminNotificationsService } from "../src/modules/admin-notifications/services/admin-notifications.service.js";
import type { SendSimulatedNotificationDto } from "@tiby/ts-shared";

const pasien = {
  id: "pasien-1",
  username: "pasien1",
  name: "Pasien Satu",
  role: "PASIEN",
  facilityId: null,
  whatsappVerified: false,
  whatsappChatId: null,
} as any;

const nakes = {
  id: "nakes-1",
  username: "nakes1",
  name: "Nakes Satu",
  role: "NAKES",
  facilityId: "facility-1",
  whatsappVerified: true,
  whatsappChatId: "628123456789@c.us",
} as any;

function makeService(users: any[] = [pasien]) {
  const userRepo = { findBy: vi.fn().mockResolvedValue(users) };
  const alertRepo = {
    create: vi.fn((data) => data),
    save: vi.fn((data) => Promise.resolve(data)),
  };
  const auditRepo = {
    create: vi.fn((data) => data),
    save: vi.fn((data) => Promise.resolve(data)),
  };
  const pushService = {
    isConfigured: vi.fn().mockReturnValue(true),
    sendNotificationToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  };
  const wahaClient = {
    sendText: vi.fn().mockResolvedValue({ success: true, messageId: "wa-1" }),
  };
  const notificationsService = {
    createMany: vi.fn().mockResolvedValue(undefined),
  };

  const service = new AdminNotificationsService(
    userRepo as any,
    alertRepo as any,
    auditRepo as any,
    pushService as any,
    wahaClient as any,
    notificationsService as any,
  );

  return {
    service,
    userRepo,
    alertRepo,
    auditRepo,
    pushService,
    wahaClient,
    notificationsService,
  };
}

const baseDto: SendSimulatedNotificationDto = {
  recipientUserIds: ["pasien-1"],
  channels: ["ALERT"],
  title: "Pesan Uji",
  message: "Isi pesan",
  severity: "INFO",
};

describe("AdminNotificationsService", () => {
  beforeEach(() => {
    delete process.env.WAHA_ENABLED;
  });

  it("lists system templates plus presets", () => {
    const { service } = makeService();
    const { items } = service.listTemplates();

    expect(items.some((t) => t.key === "DAILY_REMINDER")).toBe(true);
    expect(items.some((t) => t.source === "PRESET")).toBe(true);
    expect(items.some((t) => t.key === "ADMIN_SIMULATION")).toBe(false);
  });

  it("delivers an alert to a patient's notification bell", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, notificationsService } = makeService();

    const res = await service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, channels: ["ALERT"] },
    );

    expect(notificationsService.createMany).toHaveBeenCalledWith(
      ["pasien-1"],
      expect.objectContaining({
        type: "ADMIN_SIMULATION",
        treatmentPlanId: null,
        title: "Pesan Uji",
      }),
    );
    expect(res.summary).toEqual({
      recipients: 1,
      delivered: 1,
      skipped: 0,
      failed: 0,
    });
    expect(res.results[0].channels[0]).toEqual({
      channel: "ALERT",
      status: "DELIVERED",
      detail: "Masuk ke lonceng notifikasi pengguna",
    });
  });

  it("writes a facility alert for nakes and skips nakes without a facility", async () => {
    const withFacility = makeService([nakes]);
    const res = await withFacility.service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, recipientUserIds: ["nakes-1"] },
    );

    expect(withFacility.alertRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "facility-1",
        treatmentPlanId: null,
        alertType: "ADMIN_SIMULATION",
      }),
    );
    expect(res.results[0].channels[0].status).toBe("DELIVERED");

    const withoutFacility = makeService([{ ...nakes, facilityId: null }]);
    const skipped = await withoutFacility.service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, recipientUserIds: ["nakes-1"] },
    );
    expect(skipped.results[0].channels[0].status).toBe("NOT_APPLICABLE");
    expect(withoutFacility.alertRepo.save).not.toHaveBeenCalled();
  });

  it("skips WhatsApp for unverified users", async () => {
    process.env.WAHA_ENABLED = "true";
    const { service, wahaClient } = makeService();

    const res = await service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, channels: ["WHATSAPP"] },
    );

    expect(wahaClient.sendText).not.toHaveBeenCalled();
    expect(res.results[0].channels[0].status).toBe("SKIPPED_UNVERIFIED");
  });

  it("reports WAHA as disabled instead of a fake success", async () => {
    const { service, wahaClient } = makeService([nakes]);

    const res = await service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, recipientUserIds: ["nakes-1"], channels: ["WHATSAPP"] },
    );

    expect(wahaClient.sendText).not.toHaveBeenCalled();
    expect(res.results[0].channels[0].status).toBe("SKIPPED_WAHA_DISABLED");
  });

  it("reports push without a subscription and when VAPID is missing", async () => {
    const subscribed = makeService();
    const delivered = await subscribed.service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, channels: ["PUSH"] },
    );
    expect(delivered.results[0].channels[0].status).toBe("DELIVERED");

    const noDevice = makeService();
    noDevice.pushService.sendNotificationToUser.mockResolvedValue({
      sent: 0,
      failed: 0,
    });
    const res = await noDevice.service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, channels: ["PUSH"] },
    );
    expect(res.results[0].channels[0].status).toBe("NO_SUBSCRIPTION");

    const unconfigured = makeService();
    unconfigured.pushService.isConfigured.mockReturnValue(false);
    const skipped = await unconfigured.service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, channels: ["PUSH"] },
    );
    expect(skipped.results[0].channels[0].status).toBe("NO_SUBSCRIPTION");
    expect(unconfigured.pushService.sendNotificationToUser).not.toHaveBeenCalled();
  });

  it("marks admins as not applicable for the alert channel", async () => {
    const admin = { ...pasien, id: "admin-1", role: "ADMIN", username: "admin" };
    const { service } = makeService([admin]);

    const res = await service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, recipientUserIds: ["admin-1"] },
    );

    expect(res.results[0].channels[0].status).toBe("NOT_APPLICABLE");
  });

  it("keeps the other channels going when one channel fails", async () => {
    const { service, alertRepo } = makeService([nakes]);
    alertRepo.save.mockRejectedValue(new Error("db down"));

    const res = await service.send(
      { id: "admin-1", role: "ADMIN" },
      { ...baseDto, recipientUserIds: ["nakes-1"], channels: ["ALERT", "PUSH"] },
    );

    expect(res.results[0].channels).toEqual([
      { channel: "ALERT", status: "FAILED", detail: "Pengiriman gagal" },
      { channel: "PUSH", status: "DELIVERED", detail: "1 perangkat" },
    ]);
    expect(res.summary).toEqual({
      recipients: 1,
      delivered: 1,
      skipped: 0,
      failed: 1,
    });
  });

  it("audits the send and rejects missing recipients", async () => {
    const { service, auditRepo } = makeService();
    await service.send({ id: "admin-1", role: "ADMIN" }, baseDto);

    expect(auditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ADMIN_SIMULATED_NOTIFICATION",
        actorUserId: "admin-1",
      }),
    );

    const missing = makeService([]);
    await expect(
      missing.service.send({ id: "admin-1", role: "ADMIN" }, baseDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
