import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../src/modules/patients/entities/pmo-assignment.entity.js";
import { FacilityAlert } from "../src/modules/alerts/entities/facility-alert.entity.js";

describe("Phase 2: Auth, Consent, and Faskes Onboarding (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let nakesUserId: string;
  let nakesCookie: string[];
  const nakesUsername = `nakes_${Date.now()}`;
  const nakesPassword = "NakesPassword123!";

  let patientCredentials: {
    username: string;
    password: string;
    treatmentPlanId: string;
    userId: string;
  };
  let pmoUsername: string;
  let pmoUserId: string;
  let secondPatientUserId: string;
  let patientCookie: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Seed a test Facility
    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-E2E-${Date.now()}`,
        name: "Puskesmas Kebayoran",
        district: "Jakarta Selatan",
        emergencyPhone: "021-998877",
      }),
    );

    // 2. Seed a Nakes account via Better Auth
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "Suster Siti",
        email: `${nakesUsername}@users.tiby.internal`,
        password: nakesPassword,
        role: "NAKES",
        data: {
          username: nakesUsername,
          displayUsername: nakesUsername,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });
    nakesUserId = nakesAuth.user.id;

    // 3. Login as Nakes to get session cookie via unified sign-in
    const loginRes = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({
        username: nakesUsername,
        password: nakesPassword,
      });

    expect(loginRes.status).toBe(200);
    nakesCookie = loginRes.get("Set-Cookie")!;
    expect(nakesCookie).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup
    if (secondPatientUserId) {
      await dataSource.getRepository(AuthUser).delete({ id: secondPatientUserId });
    }
    if (patientCredentials?.userId) {
      await dataSource.getRepository(AuthUser).delete({ id: patientCredentials.userId });
    }
    if (pmoUserId) {
      await dataSource.getRepository(AuthUser).delete({ id: pmoUserId });
    }
    if (nakesUserId) {
      await dataSource.getRepository(AuthUser).delete({ id: nakesUserId });
    }
    await app.close();
  });

  it("1. Nakes onboards Patient + PMO in under 1 minute via POST /api/faskes/onboarding", async () => {
    const timestamp = Date.now();
    const patientUsername = `pasien_${timestamp}`;
    pmoUsername = `pmo_${timestamp}`;

    const onboardingPayload = {
      patient: {
        fullName: "Budi Santoso",
        username: patientUsername,
        whatsappNumber: "081234567890",
      },
      pmo: {
        fullName: "Sri Wahyuni",
        username: pmoUsername,
        whatsappNumber: "081298765432",
        relationship: "KELUARGA",
      },
      familyContact: {
        fullName: "Joko Santoso",
        whatsappNumber: "081300001111",
        notifyOnEscalation: true,
      },
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      reminderTimeLocal: "08:00",
      timezone: "Asia/Jakarta",
      startDate: "2026-10-16",
    };

    const res = await request(app.getHttpServer())
      .post("/api/faskes/onboarding")
      .set("Cookie", nakesCookie)
      .send(onboardingPayload);

    expect(res.status).toBe(201);
    expect(res.body.treatmentPlanId).toBeDefined();
    expect(res.body.patientUsername).toBe(patientUsername);
    expect(res.body.patientPassword).toBeDefined();
    expect(res.body.pmoUsername).toBe(pmoUsername);
    expect(res.body.pmoPassword).toBeDefined();

    patientCredentials = {
      username: res.body.patientUsername,
      password: res.body.patientPassword,
      treatmentPlanId: res.body.treatmentPlanId,
      userId: res.body.patientUserId,
    };
    pmoUserId = res.body.pmoUserId;
    expect(res.body.pmoCreated).toBe(true);

    // Check TreatmentPlan state is initially PENDING
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.findOneBy({ id: patientCredentials.treatmentPlanId });
    expect(plan).toBeDefined();
    expect(plan?.patientState).toBe("PENDING");
    expect(plan?.phase).toBe("INTENSIF");
    expect(plan?.dailyPillQuota).toBe(4);
  });

  it("2. Patient signs in via /api/auth/sign-in and checks consent status", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({
        username: patientCredentials.username,
        password: patientCredentials.password,
      });

    expect(loginRes.status).toBe(200);
    patientCookie = loginRes.get("Set-Cookie")!;
    expect(patientCookie).toBeDefined();

    const consentStatusRes = await request(app.getHttpServer())
      .get("/api/consent")
      .set("Cookie", patientCookie);

    expect(consentStatusRes.status).toBe(200);
    expect(consentStatusRes.body.active).toBe(false);
    expect(consentStatusRes.body.mustConfirmConsent).toBe(true);
  });

  it("3. Patient grants consent -> transitions TreatmentPlan to AKTIF", async () => {
    const grantRes = await request(app.getHttpServer())
      .post("/api/consent")
      .set("Cookie", patientCookie)
      .send({
        scopes: ["PATIENT_DATA_SHARE", "STT_AUDIO_PROCESSING"],
        scheduleConfirmed: true,
      });

    expect(grantRes.status).toBe(201);
    expect(grantRes.body.active).toBe(true);
    expect(grantRes.body.mustConfirmConsent).toBe(false);
    expect(grantRes.body.scopes).toContain("PATIENT_DATA_SHARE");

    // Verify TreatmentPlan state transitioned to AKTIF
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.findOneBy({ id: patientCredentials.treatmentPlanId });
    expect(plan?.patientState).toBe("AKTIF");
  });

  it("4. Patient revokes consent -> transitions TreatmentPlan to DIPANTAU_TERBATAS & emits FacilityAlert", async () => {
    const revokeRes = await request(app.getHttpServer())
      .delete("/api/consent")
      .set("Cookie", patientCookie)
      .send({
        reason: "Ingin membatasi pembagian data",
      });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.active).toBe(false);
    expect(revokeRes.body.mustConfirmConsent).toBe(true);

    // Verify TreatmentPlan state transitioned to DIPANTAU_TERBATAS
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.findOneBy({ id: patientCredentials.treatmentPlanId });
    expect(plan?.patientState).toBe("DIPANTAU_TERBATAS");

    // Verify FacilityAlert was generated
    const alertRepo = dataSource.getRepository(FacilityAlert);
    const alert = await alertRepo.findOneBy({ treatmentPlanId: patientCredentials.treatmentPlanId });
    expect(alert).toBeDefined();
    expect(alert?.alertType).toBe("CONSENT_REVOKED_WARNING");
    expect(alert?.severity).toBe("HIGH");
  });

  it("5. Nakes lists patients via GET /api/faskes/patients", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/faskes/patients")
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);

    const targetPatient = res.body.items.find(
      (p: any) => p.id === patientCredentials.treatmentPlanId,
    );
    expect(targetPatient).toBeDefined();
    expect(targetPatient.username).toBe(patientCredentials.username);
    expect(targetPatient.patientState).toBe("DIPANTAU_TERBATAS");
    expect(targetPatient.pmo).toMatchObject({
      username: pmoUsername,
      fullName: "Sri Wahyuni",
      relationship: "KELUARGA",
      isPrimary: true,
    });
    expect(targetPatient.pmo.userId).toBeDefined();
  });

  it("5b. Nakes can search patients by assigned PMO name", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/faskes/patients")
      .query({ search: pmoUsername })
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    const ids = res.body.items.map((p: any) => p.id);
    expect(ids).toContain(patientCredentials.treatmentPlanId);
  });


  it("5c. Nakes onboards a second patient reusing the existing PMO account", async () => {
    const timestamp = Date.now();
    const secondPatientUsername = `pasien2_${timestamp}`;

    const res = await request(app.getHttpServer())
      .post("/api/faskes/onboarding")
      .set("Cookie", nakesCookie)
      .send({
        patient: {
          fullName: "Siti Aminah",
          username: secondPatientUsername,
          whatsappNumber: "081299998888",
        },
        pmo: {
          id: pmoUserId,
          relationship: "KADER",
        },
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-17",
      });

    expect(res.status).toBe(201);
    expect(res.body.pmoCreated).toBe(false);
    expect(res.body.pmoPassword).toBeNull();
    expect(res.body.pmoUserId).toBe(pmoUserId);
    expect(res.body.pmoUsername).toBe(pmoUsername);
    expect(res.body.patientPassword).toBeDefined();

    secondPatientUserId = res.body.patientUserId;

    // the new plan is assigned to the same PMO with the new relationship
    const assignment = await dataSource.getRepository(PmoAssignment).findOneBy({
      treatmentPlanId: res.body.treatmentPlanId,
      pmoUserId,
      active: true,
    });
    expect(assignment).toBeDefined();
    expect(assignment?.relationship).toBe("KADER");
  });

  it("5d. Onboarding rejects an existing PMO id that does not exist", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/faskes/onboarding")
      .set("Cookie", nakesCookie)
      .send({
        patient: {
          fullName: "Ghost Patient",
          username: `ghost_${Date.now()}`,
          whatsappNumber: "081200000000",
        },
        pmo: { id: "00000000-0000-0000-0000-000000000000", relationship: "KELUARGA" },
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        startDate: "2026-10-17",
      });

    expect(res.status).toBe(404);
  });

  it("6. Nakes requests OCR draft via POST /api/faskes/onboarding/ocr", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/faskes/onboarding/ocr")
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(201);
    expect(res.body.regimenCode).toBe("FDC-4");
    expect(res.body.dailyPillQuota).toBe(4);
  });
});
