import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect, vi } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { FamilyContact } from "../src/modules/family-contacts/entities/family-contact.entity.js";
import { WhatsappVerification } from "../src/modules/whatsapp/entities/whatsapp-verification.entity.js";
import { PatientStatusHistory } from "../src/modules/patients/entities/patient-status-history.entity.js";
import { WahaClientService } from "../src/modules/whatsapp/services/waha-client.service.js";

describe("WhatsApp handshake (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let pasienACookie: string[];
  let pasienBCookie: string[];
  let pasienAId: string;
  let planAId: string;
  let familyContactId: string;

  const ts = Date.now();
  const pw = "pwwhatsapp_123";
  const phoneA = `0812${String(ts).slice(-8)}`;
  const digitsA = `62${phoneA.slice(1)}`;
  const phoneB = `0813${String(ts).slice(-8)}`;

  const userIds: string[] = [];
  let facilityId: string;

  const webhookHeaders = (): Record<string, string> => {
    const secret = process.env.WAHA_WEBHOOK_SECRET;
    return secret ? { "X-Waha-Secret": secret } : {};
  };

  const postWebhook = (from: string, body: string, id = "waha-msg-1") =>
    request(app.getHttpServer())
      .post("/api/webhooks/waha")
      .set(webhookHeaders())
      .send({
        event: "message",
        session: "default",
        payload: { id, from, to: "628000000000@c.us", body, fromMe: false, timestamp: Date.now() },
      });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // Never hit the live WAHA from the test suite.
    const waha = app.get(WahaClientService);
    vi.spyOn(waha, "sendSeen").mockResolvedValue(true);
    vi.spyOn(waha, "sendText").mockResolvedValue({ success: true, messageId: "mock-msg" });

    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-WA-${ts}`,
        name: "Puskesmas WhatsApp",
        district: "Jakarta Pusat",
        emergencyPhone: "021-666",
      }),
    );
    facilityId = facility.id;

    const mk = async (role: "NAKES" | "PMO" | "PASIEN", label: string) => {
      const username = `${label}_${ts}`;
      const res = await auth.api.createUser({
        body: {
          name: `${label} user`,
          email: `${username}@users.tiby.internal`,
          password: pw,
          role,
          data: {
            username,
            displayUsername: username,
            facility_id: facilityId,
            must_confirm_consent: false,
          },
        },
      });
      userIds.push(res.user.id);
      return { id: res.user.id, username };
    };

    const nakes = await mk("NAKES", "wa_nakes");
    const pasienA = await mk("PASIEN", "wa_pasien_a");
    const pasienB = await mk("PASIEN", "wa_pasien_b");
    pasienAId = pasienA.id;

    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.save(
      planRepo.create({
        patientUserId: pasienAId,
        facilityId,
        registeredByNakesId: nakes.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        startDate: new Date().toISOString().slice(0, 10),
        targetEndDate: new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10),
      }),
    );
    planAId = plan.id;

    const familyRepo = dataSource.getRepository(FamilyContact);
    const family = await familyRepo.save(
      familyRepo.create({
        treatmentPlanId: planAId,
        addedByUserId: pasienAId,
        nameEncrypted: "Ibu Pasien",
        whatsappEncrypted: "081299998888",
        whatsappHash: "hash-placeholder",
        notifyOnEscalation: true,
      }),
    );
    familyContactId = family.id;

    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username, password: pw });
      expect(res.status).toBe(200);
      return res.get("Set-Cookie")!;
    };

    pasienACookie = await login(pasienA.username);
    pasienBCookie = await login(pasienB.username);
  });

  afterAll(async () => {
    if (dataSource) {
      for (const id of [...userIds].reverse()) {
        await dataSource.getRepository("users").delete({ id });
      }
      await dataSource.getRepository(Facility).delete({ id: facilityId });
    }
    await app.close();
  });

  it("1. requires authentication to connect", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .send({ phoneNumber: phoneA });
    expect(res.status).toBe(401);
  });

  it("2. issues a 6-character challenge with a deep link", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienACookie)
      .send({ phoneNumber: phoneA });

    expect(res.status).toBe(201);
    expect(res.body.verificationCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.wahaDeepLink).toContain(res.body.verificationCode);
    expect(res.body.botPhoneNumber).toBeTruthy();
  });

  it("3. refuses a code sent from a different number", async () => {
    const challenge = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienACookie)
      .send({ phoneNumber: phoneA });

    const res = await postWebhook(
      `6289999999999@c.us`,
      `Kode saya ${challenge.body.verificationCode}`,
      "wrong-sender",
    );

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);

    const status = await request(app.getHttpServer())
      .get("/api/whatsapp/status")
      .set("Cookie", pasienACookie);
    expect(status.body.verified).toBe(false);
  });

  it("4. verifies when the registered number sends the code", async () => {
    const challenge = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienACookie)
      .send({ phoneNumber: phoneA });

    const res = await postWebhook(
      `${digitsA}@c.us`,
      `Halo, kode verifikasi saya ${challenge.body.verificationCode}`,
      "right-sender",
    );

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(true);

    const status = await request(app.getHttpServer())
      .get("/api/whatsapp/status")
      .set("Cookie", pasienACookie);
    expect(status.body.verified).toBe(true);
    expect(status.body.phoneNumber).toBe(phoneA);

    const history = await dataSource.getRepository(PatientStatusHistory).findOneBy({
      treatmentPlanId: planAId,
      eventType: "WHATSAPP_CONNECTED",
    });
    expect(history).not.toBeNull();
  });

  it("5. ignores a code posted in a group chat", async () => {
    const challenge = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienBCookie)
      .send({ phoneNumber: phoneB });

    const res = await postWebhook(
      "120363000000000000@g.us",
      challenge.body.verificationCode,
      "group-msg",
    );

    expect(res.body.verified).toBe(false);

    const status = await request(app.getHttpServer())
      .get("/api/whatsapp/status")
      .set("Cookie", pasienBCookie);
    expect(status.body.verified).toBe(false);
  });

  it("6. hides another patient's family contact behind a 404", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienBCookie)
      .send({ phoneNumber: phoneB, familyContactId });

    expect(res.status).toBe(404);
  });

  it("7. lets the owning patient connect their family contact", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/whatsapp/connect")
      .set("Cookie", pasienACookie)
      .send({ phoneNumber: "081277776666", familyContactId });

    expect(res.status).toBe(201);

    const row = await dataSource.getRepository(WhatsappVerification).findOne({
      where: { familyContactId, status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    expect(row?.targetRole).toBe("KELUARGA");

    // and the family handshake completes from the family phone
    const sender = "6281277776666@c.us";
    const webhook = await postWebhook(sender, res.body.verificationCode, "family-msg");
    expect(webhook.body.verified).toBe(true);

    const family = await dataSource.getRepository(FamilyContact).findOneBy({ id: familyContactId });
    expect(family?.whatsappVerified).toBe(true);
    expect(family?.whatsappChatId).toBe(sender);
  });
});
