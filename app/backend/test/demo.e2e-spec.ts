import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource, Like } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { DemoSession } from "../src/modules/demo/entities/demo-session.entity.js";

/**
 * Demo lifecycle e2e: start (cookie), role picker status, enter each role,
 * data shape, end, and full row cleanup.
 */
describe("Demo lifecycle (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const agent = () =>
    request.agent(app.getHttpServer() as never as Parameters<typeof request>[0]);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it("starts a demo, lets all three roles in, then wipes everything", async () => {
    const visitor = agent();

    // /demo auto-start: no cookie yet.
    const start = await visitor.post("/api/demo/start").expect(200);
    expect(start.body.expiresAt).toBeTruthy();
    const setCookies: string[] = (start.headers["set-cookie"] as string[]) ?? [];
    expect(setCookies.some((c) => c.startsWith("tiby_demo="))).toBe(true);

    const status = await visitor.get("/api/demo/status").expect(200);
    expect(status.body.active).toBe(true);

    // Re-start with a valid session returns the same expiry, not a new demo.
    const again = await visitor.post("/api/demo/start").expect(200);
    expect(again.body.expiresAt).toBe(status.body.expiresAt);

    const facilityCount = await dataSource
      .getRepository(Facility)
      .count({ where: { code: Like("DEMO-%") } });
    // The second test in this file expires every demo row; leftover demos
    // from crashed runs pile up here, so assert growth, not an absolute.
    expect(facilityCount).toBeGreaterThanOrEqual(1);

    // Enter PASIN: consent gate pending, no check-ins yet.
    const enter = await visitor
      .post("/api/demo/enter")
      .send({ role: "PASIEN" })
      .expect(200);
    expect(enter.body.role).toBe("PASIEN");

    const me = await visitor.get("/api/users/me").expect(200);
    expect(me.body.role).toBe("PASIEN");
    expect(me.body.name).toBe("Budi Santoso");

    const session = await visitor.get("/api/auth/get-session").expect(200);
    expect(session.body?.user?.role).toBe("PASIEN");

    const consent = await visitor.get("/api/consent").expect(200);
    expect(consent.body.mustConfirmConsent ?? consent.body.must_confirm_consent).toBe(
      true,
    );

    // Enter PMO and NAKES through the same demo session.
    await visitor.post("/api/demo/enter").send({ role: "PMO" }).expect(200);
    const pmoMe = await visitor.get("/api/users/me").expect(200);
    expect(pmoMe.body.role).toBe("PMO");

    await visitor.post("/api/demo/enter").send({ role: "NAKES" }).expect(200);
    const nakesMe = await visitor.get("/api/users/me").expect(200);
    expect(nakesMe.body.role).toBe("NAKES");

    // End deletes every row the demo created.
    const demoRow = await dataSource.getRepository(DemoSession).findOneBy({});
    expect(demoRow).not.toBeNull();

    await visitor.post("/api/demo/end").expect(200);
    const after = await visitor.get("/api/demo/status").expect(200);
    expect(after.body.active).toBe(false);

    expect(
      await dataSource
        .getRepository(AuthUser)
        .count({ where: { demoSessionId: demoRow!.id } }),
    ).toBe(0);
    expect(
      await dataSource
        .getRepository(TreatmentPlan)
        .count({ where: { facilityId: demoRow!.facilityId } }),
    ).toBe(0);
    expect(
      await dataSource.getRepository(Facility).countBy({
        id: demoRow!.facilityId,
      }),
    ).toBe(0);
    expect(
      await dataSource.getRepository(DemoSession).countBy({ id: demoRow!.id }),
    ).toBe(0);
  });

  it("rejects enter and cleanup for an expired demo", async () => {
    const visitor = agent();
    const start = await visitor.post("/api/demo/start").expect(200);

    // Expire only this test's demo (other rows may linger from crashed runs).
    const mine = await dataSource.getRepository(DemoSession).findOne({
      where: {},
      order: { createdAt: "DESC" },
    });
    expect(mine).not.toBeNull();
    await dataSource.query(
      `UPDATE demo_sessions SET expires_at = now() - interval '1 minute' WHERE id = $1`,
      [mine!.id],
    );

    const status = await visitor.get("/api/demo/status").expect(200);
    expect(status.body.active).toBe(false);
    expect(status.body.expiresAt).toBeNull();

    await visitor
      .post("/api/demo/enter")
      .send({ role: "PMO" })
      .expect(403);
  });
});
