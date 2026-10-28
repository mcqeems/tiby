import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "../src/modules/notifications/services/notifications.service.js";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "notification-1",
    recipientUserId: "user-1",
    treatmentPlanId: "plan-1",
    type: "DAILY_REMINDER",
    severity: "INFO",
    title: "Waktunya Minum Obat",
    message: "Halo",
    isRead: false,
    readAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeService() {
  const repo = {
    create: vi.fn((data) => data),
    save: vi.fn((data) => Promise.resolve(data)),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    findOneBy: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  };
  const service = new NotificationsService(repo as any);
  return { service, repo };
}

describe("NotificationsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the list to the caller and supports unreadOnly", async () => {
    const { service, repo } = makeService();
    repo.findAndCount.mockResolvedValue([[makeRow()], 1]);

    const res = await service.list("user-1", {
      page: 2,
      limit: 10,
      unreadOnly: true,
    });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientUserId: "user-1", isRead: false },
        skip: 10,
        take: 10,
      }),
    );
    expect(res).toMatchObject({ total: 1, page: 2, limit: 10 });
    expect(res.items[0]).toMatchObject({ isRead: false, type: "DAILY_REMINDER" });
  });

  it("creates one row per unique recipient", async () => {
    const { service, repo } = makeService();

    await service.createMany(["user-1", "user-1", "user-2"], {
      treatmentPlanId: "plan-1",
      type: "RED_FLAG_ALERT",
      severity: "HIGH",
      title: "Perhatian",
      message: "Segera hubungi faskes.",
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect((repo.save.mock.calls[0][0] as unknown[]).length).toBe(2);
  });

  it("marks only the caller's notification as read", async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue(makeRow());

    const res = await service.markRead("user-1", "notification-1");

    expect(repo.findOneBy).toHaveBeenCalledWith({
      id: "notification-1",
      recipientUserId: "user-1",
    });
    expect(res.isRead).toBe(true);
    expect(res.readAt).not.toBeNull();
  });

  it("hides another user's notification behind 404", async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue(null);

    await expect(
      service.markRead("user-2", "notification-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
