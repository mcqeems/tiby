import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { Facility } from "../src/modules/facilities/entities/facility.entity.js";
import { TreatmentPlan } from "../src/modules/treatments/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../src/modules/treatments/entities/pmo-assignment.entity.js";
import { SilenceDetectorService } from "../src/modules/escalation/services/silence-detector.service.js";
import { InterventionTicket } from "../src/modules/tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../src/modules/facilities/entities/facility-alert.entity.js";
import { PushSubscription } from "../src/modules/push/entities/push-subscription.entity.js";

describe("Phase 4: Silence, Tickets, Alerts, History, & Web Push (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let silenceDetector: SilenceDetectorService;

  const timestamp = Date.now();
  let facilityId: string;

  // Nakes
  let nakesId: string;
  const nakesUsername = `nakes_p4_${timestamp}`;
  const nakesPassword = "NakesPassword123!";
  let nakesCookie: string[];

  // Patient
  let patientId: string;
  const patientUsername = `pasien_p4_${timestamp}`;
  const patientPassword = "PatientPassword123!";
  let patientCookie: string[];

  // PMO
  let pmoId: string;
  const pmoUsername = `pmo_p4_${timestamp}`;
  const pmoPassword = "PmoPassword123!";
  let pmoCookie: string[];

  let planId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);
    silenceDetector = app.get(SilenceDetectorService);

    // 1. Seed Facility
    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-P4-${timestamp}`,
        name: "Puskesmas Matraman",
        district: "Jakarta Timur",
        emergencyPhone: "021-554433",
      }),
    );
    facilityId = facility.id;

    // 2. Seed Nakes
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "Dokter Rian",
        email: `${nakesUsername}@users.tiby.internal`,
        password: nakesPassword,
        role: "NAKES",
        data: {
          username: nakesUsername,
          displayUsername: nakesUsername,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    nakesId = nakesAuth.user.id;

    // 3. Seed Patient
    const patientAuth = await auth.api.createUser({
      body: {
        name: "Hendra Wijaya",
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

    // 4. Seed PMO
    const pmoAuth = await auth.api.createUser({
      body: {
        name: "Ratna Wijaya",
        email: `${pmoUsername}@users.tiby.internal`,
        password: pmoPassword,
        role: "PMO",
        data: {
          username: pmoUsername,
          displayUsername: pmoUsername,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    pmoId = pmoAuth.user.id;

    // 5. Seed TreatmentPlan
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.save(
      planRepo.create({
        patientUserId: patientId,
        facilityId,
        registeredByNakesId: nakesId,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-10",
        targetEndDate: "2027-04-10",
        currentStreak: 5,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );
    planId = plan.id;

    const pmoRepo = dataSource.getRepository(PmoAssignment);
    await pmoRepo.save(
      pmoRepo.create({
        treatmentPlanId: planId,
        pmoUserId: pmoId,
        relationship: "KELUARGA",
        isPrimary: true,
        active: true,
      }),
    );

    // Login Nakes
    const nLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: nakesUsername, password: nakesPassword });
    expect(nLogin.status).toBe(200);
    nakesCookie = nLogin.headers["set-cookie"] as string[];

    // Login Patient
    const pLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: patientUsername, password: patientPassword });
    expect(pLogin.status).toBe(200);
    patientCookie = pLogin.headers["set-cookie"] as string[];

    // Login PMO
    const pmoLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: pmoUsername, password: pmoPassword });
    expect(pmoLogin.status).toBe(200);
    pmoCookie = pmoLogin.headers["set-cookie"] as string[];
  });

  afterAll(async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    if (patientId) await userRepo.delete({ id: patientId });
    if (pmoId) await userRepo.delete({ id: pmoId });
    if (nakesId) await userRepo.delete({ id: nakesId });
    await app.close();
  });

  it("1. Public VAPID public key endpoint accessible anonymously", async () => {
    const res = await request(app.getHttpServer()).get("/api/push/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBeDefined();
    expect(res.body.publicKey.length).toBeGreaterThan(20);
  });

  it("2. Patient subscribes and unsubscribes to Web Push", async () => {
    const endpoint = `https://fcm.googleapis.com/fcm/send/test_sub_${timestamp}`;

    // Subscribe
    const subRes = await request(app.getHttpServer())
      .post("/api/push/subscribe")
      .set("Cookie", patientCookie)
      .send({
        endpoint,
        keys: {
          p256dh: "mock_p256dh_key_base64",
          auth: "mock_auth_key_base64",
        },
      });

    expect(subRes.status).toBe(201);
    expect(subRes.body.subscribed).toBe(true);
    expect(subRes.body.endpoint).toBe(endpoint);

    // Verify in database
    const subInDb = await dataSource.getRepository(PushSubscription).findOneBy({ endpoint });
    expect(subInDb).toBeDefined();
    expect(subInDb?.userId).toBe(patientId);

    // Unsubscribe
    const unsubRes = await request(app.getHttpServer())
      .post("/api/push/unsubscribe")
      .set("Cookie", patientCookie)
      .send({ endpoint });

    expect(unsubRes.status).toBe(201);
    expect(unsubRes.body.unsubscribed).toBe(true);

    const prunedFromDb = await dataSource.getRepository(PushSubscription).findOneBy({ endpoint });
    expect(prunedFromDb).toBeNull();
  });

  it("3. Education daily cards endpoint returns phase-matched cards", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/education/daily?phase=INTENSIF")
      .set("Cookie", patientCookie);

    expect(res.status).toBe(200);
    expect(res.body.cards).toBeDefined();
    expect(res.body.cards.length).toBeGreaterThanOrEqual(1);
    expect(res.body.cards[0].phase).toBe("INTENSIF");

    // Also accessible by PMO
    const pmoEduRes = await request(app.getHttpServer())
      .get("/api/education/daily")
      .set("Cookie", pmoCookie);
    expect(pmoEduRes.status).toBe(200);
    expect(pmoEduRes.body.cards.length).toBeGreaterThanOrEqual(1);
  });

  it("4. Midnight silence detector: Day 1 missed -> streak resets to 0, silence count 1", async () => {
    const res = await silenceDetector.runMidnightSilenceCheck("2026-10-15");
    expect(res.silenced).toBeGreaterThanOrEqual(1);

    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: planId });
    expect(plan?.currentStreak).toBe(0);
    expect(plan?.consecutiveSilenceDays).toBe(1);
    expect(plan?.patientState).toBe("AKTIF");
  });

  it("5. Midnight silence detector: Day 2 missed -> silence count 2, state transitions to BERISIKO", async () => {
    await silenceDetector.runMidnightSilenceCheck("2026-10-14");

    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: planId });
    expect(plan?.consecutiveSilenceDays).toBe(2);
    expect(plan?.patientState).toBe("BERISIKO");
  });

  it("6. Midnight silence detector: Day 3 missed -> silence count 3, creates CRITICAL SILENCE_H3 ticket & FacilityAlert", async () => {
    await silenceDetector.runMidnightSilenceCheck("2026-10-13");

    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: planId });
    expect(plan?.consecutiveSilenceDays).toBe(3);
    expect(plan?.patientState).toBe("BERISIKO");

    // Verify ticket opened
    const ticketRepo = dataSource.getRepository(InterventionTicket);
    const ticket = await ticketRepo.findOneBy({
      treatmentPlanId: planId,
      triggerSource: "SILENCE_H3",
      status: "OPEN",
    });
    expect(ticket).toBeDefined();
    expect(ticket?.priority).toBe("CRITICAL");

    // Verify FacilityAlert
    const alertRepo = dataSource.getRepository(FacilityAlert);
    const alert = await alertRepo.findOneBy({
      treatmentPlanId: planId,
      alertType: "SILENCE_H3_WARNING",
    });
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("HIGH");
  });

  it("7. Silence Recovery: Patient submits full check-in -> auto-closes SILENCE_H3 ticket, resets streak to 1", async () => {
    const checkInRes = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patientCookie)
      .send({
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Halo Pandu, saya kembali minum 4 butir obat dan sehat.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: [],
          intentToStop: false,
          confidence: 0.95,
        },
      });

    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.isDoseFulfilled).toBe(true);
    expect(checkInRes.body.currentStreak).toBe(1); // DEC-05 reset to 1

    // Verify TreatmentPlan state returned to AKTIF
    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: planId });
    expect(plan?.patientState).toBe("AKTIF");
    expect(plan?.consecutiveSilenceDays).toBe(0);
    expect(plan?.currentStreak).toBe(1);

    // Verify SILENCE_H3 ticket was AUTO-CLOSED
    const ticketRepo = dataSource.getRepository(InterventionTicket);
    const closedTicket = await ticketRepo.findOneBy({
      treatmentPlanId: planId,
      triggerSource: "SILENCE_H3",
    });
    expect(closedTicket?.status).toBe("AUTO_CLOSED_BY_CHECKIN");
    expect(closedTicket?.resolutionReason).toBe("PATIENT_CHECKED_IN_RECOVERED");

    // Verify FacilityAlert warning recorded
    const alertRepo = dataSource.getRepository(FacilityAlert);
    const recAlert = await alertRepo.findOneBy({
      treatmentPlanId: planId,
      alertType: "SILENCE_RECOVERED_WARNING",
    });
    expect(recAlert).toBeDefined();
  });

  it("8. Nakes views tickets, alerts, and patient timeline history", async () => {
    // 1. List tickets
    const ticketsRes = await request(app.getHttpServer())
      .get("/api/faskes/tickets")
      .set("Cookie", nakesCookie);

    expect(ticketsRes.status).toBe(200);
    expect(ticketsRes.body.items).toBeDefined();
    expect(ticketsRes.body.items.length).toBeGreaterThanOrEqual(1);

    // 2. List alerts
    const alertsRes = await request(app.getHttpServer())
      .get("/api/faskes/alerts")
      .set("Cookie", nakesCookie);

    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.items).toBeDefined();
    expect(alertsRes.body.items.length).toBeGreaterThanOrEqual(1);

    const alertId = alertsRes.body.items[0].id;

    // 3. Mark alert as read
    const readAlertRes = await request(app.getHttpServer())
      .patch(`/api/faskes/alerts/${alertId}/read`)
      .set("Cookie", nakesCookie);

    expect(readAlertRes.status).toBe(200);
    expect(readAlertRes.body.isRead).toBe(true);

    // 4. View patient timeline history
    const historyRes = await request(app.getHttpServer())
      .get(`/api/faskes/patients/${planId}/history`)
      .set("Cookie", nakesCookie);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.items).toBeDefined();
    expect(historyRes.body.items.length).toBeGreaterThanOrEqual(3);

    const eventTypes = historyRes.body.items.map((i: any) => i.eventType);
    expect(eventTypes).toContain("STREAK_RESET");
    expect(eventTypes).toContain("TICKET_AUTO_CLOSED");
  });
});
