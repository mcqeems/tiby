import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { UserNotification } from "../src/modules/notifications/entities/user-notification.entity.js";

describe("User notifications (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let pasienACookie: string[];
  let pasienBCookie: string[];
  let nakesCookie: string[];

  let pasienAId: string;
  let pasienBId: string;
  let nakesId: string;
  let notificationAId: string;

  const suffix = Date.now();
  const pw = "pwgampang_123";
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    const mk = async (role: "PASIEN" | "NAKES", label: string) => {
      const username = `notif_${label}_${suffix}`;
      const res = await auth.api.createUser({
        body: {
          name: `Notif ${label}`,
          email: `${username}@users.tiby.internal`,
          password: pw,
          role,
          data: {
            username,
            must_confirm_consent: false,
          },
        },
      });
      userIds.push(res.user.id);
      return { id: res.user.id, username };
    };

    const pasienA = await mk("PASIEN", "a");
    const pasienB = await mk("PASIEN", "b");
    const nakes = await mk("NAKES", "nakes");
    pasienAId = pasienA.id;
    pasienBId = pasienB.id;
    nakesId = nakes.id;

    const repo = dataSource.getRepository(UserNotification);
    const first = await repo.save(
      repo.create({
        recipientUserId: pasienAId,
        treatmentPlanId: null,
        type: "DAILY_REMINDER",
        severity: "INFO",
        title: "Waktunya Minum Obat",
        message: "Halo, jangan lupa minum obat.",
      }),
    );
    notificationAId = first.id;
    await repo.save(
      repo.create({
        recipientUserId: pasienAId,
        treatmentPlanId: null,
        type: "RED_FLAG_ALERT",
        severity: "HIGH",
        title: "Perhatian",
        message: "Segera hubungi faskes.",
      }),
    );
    await repo.save(
      repo.create({
        recipientUserId: pasienBId,
        treatmentPlanId: null,
        type: "DAILY_REMINDER",
        severity: "INFO",
        title: "Milik pasien B",
        message: "Tidak boleh terlihat pasien A.",
      }),
    );

    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username, password: pw });
      expect(res.status).toBe(200);
      return res.get("Set-Cookie")!;
    };

    pasienACookie = await login(pasienA.username);
    pasienBCookie = await login(pasienB.username);
    nakesCookie = await login(nakes.username);
  });

  afterAll(async () => {
    const notificationRepo = dataSource.getRepository(UserNotification);
    await notificationRepo.delete({ recipientUserId: pasienAId });
    await notificationRepo.delete({ recipientUserId: pasienBId });
    await notificationRepo.delete({ recipientUserId: nakesId });
    for (const id of [...userIds].reverse()) {
      await dataSource.getRepository("users").delete({ id });
    }
    await app.close();
  });

  it("lists only the caller's notifications, newest first", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/notifications")
      .set("Cookie", pasienACookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
    for (const item of res.body.items) {
      expect(item.title).not.toBe("Milik pasien B");
    }
    expect(res.body.items[0].createdAt >= res.body.items[1].createdAt).toBe(true);
  });

  it("filters unread notifications", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/notifications?unreadOnly=true")
      .set("Cookie", pasienACookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.every((item: { isRead: boolean }) => !item.isRead)).toBe(
      true,
    );
  });

  it("marks the caller's notification as read", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationAId}/read`)
      .set("Cookie", pasienACookie);

    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
    expect(res.body.readAt).toBeTruthy();
  });

  it("hides another user's notification behind 404", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationAId}/read`)
      .set("Cookie", pasienBCookie);

    expect(res.status).toBe(404);
  });

  it("keeps NAKES on the facility-alert endpoint", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/notifications")
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(403);
  });
});
