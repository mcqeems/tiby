import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { Facility } from "../src/entities/facility.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";

describe("Phase 5: WhatsApp Connect & Inbound WAHA Webhook (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const timestamp = Date.now();
  let facilityId: string;

  let patientId: string;
  const patientUsername = `pasien_waha_${timestamp}`;
  const patientPassword = "PatientPassword123!";
  let patientCookie: string[];

  let verificationCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Seed Facility
    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-W5-${timestamp}`,
        name: "Puskesmas Gambir",
        district: "Jakarta Pusat",
        emergencyPhone: "021-123456",
      }),
    );
    facilityId = facility.id;

    // 2. Seed Nakes
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "Bidan Nur",
        email: `nakes_w5_${timestamp}@users.tiby.internal`,
        password: "NakesPassword123!",
        role: "NAKES",
        data: {
          username: `nakes_w5_${timestamp}`,
          displayUsername: `nakes_w5_${timestamp}`,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });

    // 3. Seed Patient
    const patientAuth = await auth.api.createUser({
      body: {
        name: "Udin Sedunia",
        email: `${patientUsername}@users.tiby.internal`,
        password: patientPassword,
        role: "PASIEN",
        data: {
          username: patientUsername,
          displayUsername: patientUsername,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    patientId = patientAuth.user.id;

    // 4. Seed TreatmentPlan
    const planRepo = dataSource.getRepository(TreatmentPlan);
    await planRepo.save(
      planRepo.create({
        patientUserId: patientId,
        facilityId,
        registeredByNakesId: nakesAuth.user.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
        targetEndDate: "2027-04-16",
        currentStreak: 1,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );

    // Login Patient
    const pLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: patientUsername, password: patientPassword });
    expect(pLogin.status).toBe(200);
    patientCookie = pLogin.headers["set-cookie"] as string[];
  });

  afterAll(async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    if (patientId) await userRepo.delete({ id: patientId });
    await app.close();
  });

  it("1. Patient requests WhatsApp connect challenge via POST /api/whatsapp/connect", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", patientCookie)
      .send({
        phoneNumber: "081234567890",
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationCode).toBeDefined();
    expect(res.body.verificationCode).toHaveLength(6);
    expect(res.body.wahaDeepLink).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();

    verificationCode = res.body.verificationCode;
  });

  it("2. Patient checks status before sending code: verified is false, pendingCode is returned", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/whatsapp/status")
      .set("Cookie", patientCookie);

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(false);
    expect(res.body.pendingCode).toBe(verificationCode);
  });

  it("3. Inbound WAHA webhook handles verification handshake: POST /api/webhooks/waha", async () => {
    const webhookPayload = {
      event: "message",
      session: "default",
      payload: {
        id: `waha_msg_${Date.now()}`,
        from: "6281234567890@c.us",
        body: `Halo Pandu ini kode saya: ${verificationCode}`,
        fromMe: false,
        timestamp: Math.floor(Date.now() / 1000),
      },
    };

    const res = await request(app.getHttpServer())
      .post("/api/webhooks/waha")
      .send(webhookPayload);

    expect(res.status).toBe(201);
    expect(res.body.handled).toBe(true);
    expect(res.body.verified).toBe(true);

    // Verify Patient record in DB is now verified
    const user = await dataSource.getRepository(AuthUser).findOneBy({ id: patientId });
    expect(user?.whatsappVerified).toBe(true);
    expect(user?.whatsappChatId).toBe("6281234567890@c.us");
    expect(user?.whatsappVerifiedAt).toBeDefined();
  });

  it("4. Patient checks status after verification: verified is true, pendingCode is null", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/whatsapp/status")
      .set("Cookie", patientCookie);

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.pendingCode).toBeNull();
    expect(res.body.verifiedAt).toBeDefined();
  });
});
