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
import { InterventionTicket } from "../src/modules/tickets/entities/intervention-ticket.entity.js";

describe("Phase 3: Check-Ins & Safety Rule Engine (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const timestamp = Date.now();
  let facilityId: string;
  let nakesId: string;

  // Patient 1 & PMO 1
  let patient1Id: string;
  let patient1Username = `pasien_p3_${timestamp}`;
  let patient1Password = "P3PatientPass123!";
  let patient1Cookie: string[];

  let pmo1Id: string;
  let pmo1Username = `pmo_p3_${timestamp}`;
  let pmo1Password = "P3PmoPass123!";
  let pmo1Cookie: string[];

  let plan1Id: string;

  // Patient 2 (Red flag)
  let patient2Id: string;
  let patient2Username = `pasien_rf_${timestamp}`;
  let patient2Password = "P3PatientPass123!";
  let patient2Cookie: string[];
  let plan2Id: string;

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
        code: `FASKES-P3-${timestamp}`,
        name: "Puskesmas Tebet",
        district: "Jakarta Selatan",
        emergencyPhone: "021-889900",
      }),
    );
    facilityId = facility.id;

    // 1b. Seed Nakes
    const nakesUsername = `nakes_p3_${timestamp}`;
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "Perawat Dewi",
        email: `${nakesUsername}@users.tiby.internal`,
        password: "NakesPassword123!",
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

    // 2. Seed Patient 1 & PMO 1
    const p1Auth = await auth.api.createUser({
      body: {
        name: "Ahmad Dahlan",
        email: `${patient1Username}@users.tiby.internal`,
        password: patient1Password,
        role: "PASIEN",
        data: {
          username: patient1Username,
          displayUsername: patient1Username,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    patient1Id = p1Auth.user.id;

    const pmoAuth = await auth.api.createUser({
      body: {
        name: "Siti Rahma",
        email: `${pmo1Username}@users.tiby.internal`,
        password: pmo1Password,
        role: "PMO",
        data: {
          username: pmo1Username,
          displayUsername: pmo1Username,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    pmo1Id = pmoAuth.user.id;

    // 3. Seed TreatmentPlan 1 & PmoAssignment
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan1 = await planRepo.save(
      planRepo.create({
        patientUserId: patient1Id,
        facilityId,
        registeredByNakesId: nakesId,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
        targetEndDate: "2027-04-16",
        currentStreak: 0,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );
    plan1Id = plan1.id;

    const pmoRepo = dataSource.getRepository(PmoAssignment);
    await pmoRepo.save(
      pmoRepo.create({
        treatmentPlanId: plan1Id,
        pmoUserId: pmo1Id,
        relationship: "KELUARGA",
        isPrimary: true,
        active: true,
      }),
    );

    // 4. Seed Patient 2 for Red Flag scenario
    const p2Auth = await auth.api.createUser({
      body: {
        name: "Bambang Sudirman",
        email: `${patient2Username}@users.tiby.internal`,
        password: patient2Password,
        role: "PASIEN",
        data: {
          username: patient2Username,
          displayUsername: patient2Username,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    patient2Id = p2Auth.user.id;

    const plan2 = await planRepo.save(
      planRepo.create({
        patientUserId: patient2Id,
        facilityId,
        registeredByNakesId: nakesId,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
        targetEndDate: "2027-04-16",
        currentStreak: 5,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );
    plan2Id = plan2.id;

    // Login Patient 1
    const p1Login = await request(app.getHttpServer())
      .post("/api/auth/sign-in/username")
      .send({ username: patient1Username, password: patient1Password });
    expect(p1Login.status).toBe(200);
    patient1Cookie = p1Login.headers["set-cookie"] as string[];

    // Login PMO 1
    const pmoLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in/username")
      .send({ username: pmo1Username, password: pmo1Password });
    expect(pmoLogin.status).toBe(200);
    pmo1Cookie = pmoLogin.headers["set-cookie"] as string[];

    // Login Patient 2
    const p2Login = await request(app.getHttpServer())
      .post("/api/auth/sign-in/username")
      .send({ username: patient2Username, password: patient2Password });
    expect(p2Login.status).toBe(200);
    patient2Cookie = p2Login.headers["set-cookie"] as string[];
  });

  afterAll(async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    if (patient1Id) await userRepo.delete({ id: patient1Id });
    if (pmo1Id) await userRepo.delete({ id: pmo1Id });
    if (patient2Id) await userRepo.delete({ id: patient2Id });
    if (nakesId) await userRepo.delete({ id: nakesId });
    await app.close();
  });

  it("1. Audio extract preview endpoint parses audio (stateless)", async () => {
    const audioBuffer = Buffer.from("mock audio bytes for Pandu STT");

    const res = await request(app.getHttpServer())
      .post("/api/check-ins/audio-extract")
      .set("Cookie", patient1Cookie)
      .attach("audio", audioBuffer, "voice_checkin.webm");

    expect(res.status).toBe(201);
    expect(res.body.transcript).toBeDefined();
    expect(res.body.medicationTaken).toBe("SUDAH_MINUM");
    expect(res.body.pillsTakenCount).toBe(4);
    expect(res.body.extractionConfidence).toBeGreaterThan(0.7);
  });

  it("2. Text extract re-extraction parses edited transcript (stateless)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins/text-extract")
      .set("Cookie", patient1Cookie)
      .send({
        editedTranscript: "Saya baru minum 2 butir obat pagi ini.",
      });

    expect(res.status).toBe(201);
    expect(res.body.medicationTaken).toBe("SUDAH_MINUM");
    expect(res.body.pillsTakenCount).toBe(2);
  });

  it("3. Incomplete check-in: dose NOT fulfilled, day remains unlocked for retry", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patient1Cookie)
      .send({
        inputMode: "FALLBACK_BUTTONS",
        fallbackButtons: {
          medicationStatus: "BELUM_MINUM",
          pillsTakenCount: 0,
          selectedComplaints: [],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.verdict).toBe("PERLU_PERHATIAN");
    expect(res.body.isDoseFulfilled).toBe(false);
    expect(res.body.redoRequiredToday).toBe(true);
    expect(res.body.currentStreak).toBe(0);
    expect(res.body.matchedRules).toContain("RULE_INCOMPLETE_DOSE_RETRY_REQUIRED");

    // Verify TreatmentPlan is still streak 0 and unlocked
    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: plan1Id });
    expect(plan?.currentStreak).toBe(0);
  });

  it("4. Full dose check-in: locks calendar day, increments streak to 1", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patient1Cookie)
      .send({
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Halo Pandu, saya sudah minum 4 butir obat dan tidak ada keluhan.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: [],
          intentToStop: false,
          confidence: 0.95,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.verdict).toBe("TERKENDALI");
    expect(res.body.isDoseFulfilled).toBe(true);
    expect(res.body.redoRequiredToday).toBe(false);
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.matchedRules).toContain("RULE_DOSE_FULFILLED_NO_SYMPTOMS");

    // Verify TreatmentPlan has streak incremented to 1
    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: plan1Id });
    expect(plan?.currentStreak).toBe(1);
  });

  it("5. Same-day second check-in is rejected with 409 Conflict (CHECK_IN_ALREADY_LOCKED)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patient1Cookie)
      .send({
        inputMode: "FALLBACK_BUTTONS",
        fallbackButtons: {
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          selectedComplaints: [],
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CHECK_IN_ALREADY_LOCKED");
  });

  it("6. PMO views patient list: status is locked, streak visible, transcript & symptoms redacted", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/pmo/patients")
      .set("Cookie", pmo1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.patients).toBeDefined();
    expect(res.body.patients.length).toBeGreaterThanOrEqual(1);

    const monitoredPatient = res.body.patients.find((p: any) => p.treatmentPlanId === plan1Id);
    expect(monitoredPatient).toBeDefined();
    expect(monitoredPatient.patientName).toBe("Ahmad Dahlan");
    expect(monitoredPatient.isLockedToday).toBe(true);
    expect(monitoredPatient.todayVerdict).toBe("TERKENDALI");
    expect(monitoredPatient.currentStreak).toBe(1);

    // Stigma & privacy check: Ensure NO transcript or symptoms leaked to PMO
    expect(monitoredPatient.rawTranscriptEncrypted).toBeUndefined();
    expect(monitoredPatient.raw_transcript_encrypted).toBeUndefined();
    expect(monitoredPatient.symptoms).toBeUndefined();
  });

  it("7. Scenario D: Red flag symptom (BATUK_DARAH) triggers SEGERA_KE_FASKES, creates critical ticket", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patient2Cookie)
      .send({
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: "Saya sudah minum 4 obat tapi batuk darah tadi pagi.",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          symptoms: ["BATUK_DARAH"],
          intentToStop: false,
          confidence: 0.92,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.verdict).toBe("SEGERA_KE_FASKES");
    expect(res.body.isDoseFulfilled).toBe(true);
    expect(res.body.matchedRules).toContain("RULE_CRITICAL_RED_FLAG");

    // Verify TreatmentPlan state transitioned to BERISIKO
    const plan = await dataSource.getRepository(TreatmentPlan).findOneBy({ id: plan2Id });
    expect(plan?.patientState).toBe("BERISIKO");

    // Verify InterventionTicket was created
    const ticketRepo = dataSource.getRepository(InterventionTicket);
    const ticket = await ticketRepo.findOneBy({
      treatmentPlanId: plan2Id,
      triggerSource: "RED_FLAG",
    });
    expect(ticket).toBeDefined();
    expect(ticket?.priority).toBe("CRITICAL");
    expect(ticket?.status).toBe("OPEN");
    expect(ticket?.pmoNotes).toContain("BATUK_DARAH");
  });
});
