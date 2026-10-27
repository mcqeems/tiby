import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect, vi } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../src/modules/patients/entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../src/modules/check-ins/entities/daily-check-in.entity.js";
import { InterventionTicket } from "../src/modules/tickets/entities/intervention-ticket.entity.js";
import { AiClientService } from "../src/modules/internal/ai-client/ai-client.service.js";

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

  // Patient 4 (voice transcript -> backend extraction, isolated from the red-flag fixture)
  let patient4Id: string;
  let patient4Username = `pasien_voice_${timestamp}`;
  let patient4Password = "P3PatientPass123!";
  let patient4Cookie: string[];
  let plan4Id: string;

  // Cross-facility visibility fixtures
  let facilityBId: string;
  let nakesACookie: string[];
  let nakesBId: string;
  let nakesBCookie: string[];
  let adminId: string;
  let adminCookie: string[];
  let patient3Id: string;
  let plan3Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // The e2e suite describes backend behaviour, not model latency or
    // accuracy: stub the AI bridge so a live provider cannot make it flaky.
    const aiClient = app.get(AiClientService);
    vi.spyOn(aiClient, "transcribeFromAudio").mockResolvedValue({
      transcript: "Halo Pandu, saya sudah minum 4 butir obat pagi ini dan tidak ada keluhan.",
    });
    vi.spyOn(aiClient, "extractFromText").mockImplementation(async (text: string) => {
      const pills = Number(
        text.match(/(\d+)\s*(butir|tablet|biji|obat|pil)/)?.[1] ?? 4,
      );
      return {
        transcript: text,
        medicationTaken: "SUDAH_MINUM",
        pillsTakenCount: pills,
        symptoms: [],
        intentToStopOrRefuse: false,
        extractionConfidence: 0.9,
      };
    });

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
      .post("/api/auth/sign-in")
      .send({ username: patient1Username, password: patient1Password });
    expect(p1Login.status).toBe(200);
    patient1Cookie = p1Login.get("Set-Cookie")!;

    // Login PMO 1
    const pmoLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: pmo1Username, password: pmo1Password });
    expect(pmoLogin.status).toBe(200);
    pmo1Cookie = pmoLogin.get("Set-Cookie")!;

    // Login Patient 2
    const p2Login = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: patient2Username, password: patient2Password });
    expect(p2Login.status).toBe(200);
    patient2Cookie = p2Login.get("Set-Cookie")!;

    // Login Nakes A (facility A)
    const nakesALogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: nakesUsername, password: "NakesPassword123!" });
    expect(nakesALogin.status).toBe(200);
    nakesACookie = nakesALogin.get("Set-Cookie")!;

    // Facility B + its own nakes, patient and check-in
    const facilityB = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-P3B-${timestamp}`,
        name: "Puskesmas Bandung",
        district: "Bandung",
        emergencyPhone: "022-112233",
      }),
    );
    facilityBId = facilityB.id;

    const nakesBUsername = `nakes_p3b_${timestamp}`;
    const nakesBAuth = await auth.api.createUser({
      body: {
        name: "Perawat Bandung",
        email: `${nakesBUsername}@users.tiby.internal`,
        password: "NakesPassword123!",
        role: "NAKES",
        data: {
          username: nakesBUsername,
          displayUsername: nakesBUsername,
          facility_id: facilityBId,
          must_confirm_consent: false,
        },
      },
    });
    nakesBId = nakesBAuth.user.id;

    const patient3Username = `pasien_p3b_${timestamp}`;
    const p3Auth = await auth.api.createUser({
      body: {
        name: "Citra Bandung",
        email: `${patient3Username}@users.tiby.internal`,
        password: "P3PatientPass123!",
        role: "PASIEN",
        data: {
          username: patient3Username,
          displayUsername: patient3Username,
          facility_id: facilityBId,
          must_confirm_consent: false,
        },
      },
    });
    patient3Id = p3Auth.user.id;

    const plan3 = await planRepo.save(
      planRepo.create({
        patientUserId: patient3Id,
        facilityId: facilityBId,
        registeredByNakesId: nakesBId,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-16",
        targetEndDate: "2027-04-16",
        currentStreak: 2,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );
    plan3Id = plan3.id;

    const checkInRepo = dataSource.getRepository(DailyCheckIn);
    await checkInRepo.save(
      checkInRepo.create({
        treatmentPlanId: plan3Id,
        checkInDate: "2026-10-21",
        attemptNumber: 1,
        reportedByUserId: patient3Id,
        reportedByRole: "PASIEN",
        inputMode: "VOICE_STT",
        medicationStatus: "SUDAH_MINUM",
        pillsTakenCount: 4,
        isDoseFulfilled: true,
      }),
    );

    // Patient 4: voice check-in whose day must stay untouched until its own
    // test, so the red-flag fixture (patient 2) can still lock a full dose.
    const p4Auth = await auth.api.createUser({
      body: {
        name: "Dewi Lestari",
        email: `${patient4Username}@users.tiby.internal`,
        password: patient4Password,
        role: "PASIEN",
        data: {
          username: patient4Username,
          displayUsername: patient4Username,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    patient4Id = p4Auth.user.id;

    const plan4 = await planRepo.save(
      planRepo.create({
        patientUserId: patient4Id,
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
        currentStreak: 3,
        consecutiveSilenceDays: 0,
        riskScore: 0,
      }),
    );
    plan4Id = plan4.id;

    const p4Login = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: patient4Username, password: patient4Password });
    expect(p4Login.status).toBe(200);
    patient4Cookie = p4Login.get("Set-Cookie")!;

    // ADMIN (super admin, no facility)
    const adminUsername = `admin_p3_${timestamp}`;
    const adminAuth = await auth.api.createUser({
      body: {
        name: "Super Admin",
        email: `${adminUsername}@users.tiby.internal`,
        password: "AdminPassword123!",
        role: "ADMIN",
        data: {
          username: adminUsername,
          displayUsername: adminUsername,
          facility_id: null,
          must_confirm_consent: false,
        },
      },
    });
    adminId = adminAuth.user.id;

    const nakesBLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: nakesBUsername, password: "NakesPassword123!" });
    expect(nakesBLogin.status).toBe(200);
    nakesBCookie = nakesBLogin.get("Set-Cookie")!;

    const adminLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: adminUsername, password: "AdminPassword123!" });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.get("Set-Cookie")!;
  });

  afterAll(async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    if (patient1Id) await userRepo.delete({ id: patient1Id });
    if (pmo1Id) await userRepo.delete({ id: pmo1Id });
    if (patient2Id) await userRepo.delete({ id: patient2Id });
    if (patient4Id) await userRepo.delete({ id: patient4Id });
    if (nakesId) await userRepo.delete({ id: nakesId });
    if (patient3Id) await userRepo.delete({ id: patient3Id });
    if (nakesBId) await userRepo.delete({ id: nakesBId });
    if (adminId) await userRepo.delete({ id: adminId });
    if (facilityBId) {
      await dataSource.getRepository(Facility).delete({ id: facilityBId });
    }
    await app.close();
  });

  it("1. Audio extract preview endpoint returns the transcript only (stateless)", async () => {
    const audioBuffer = Buffer.from("mock audio bytes for Pandu STT");

    const res = await request(app.getHttpServer())
      .post("/api/check-ins/audio-extract")
      .set("Cookie", patient1Cookie)
      .attach("audio", audioBuffer, "voice_checkin.webm");

    expect(res.status).toBe(201);
    expect(res.body.transcript).toBeDefined();
    // Facts are extracted from the edited transcript later, never with the audio.
    expect(res.body.medicationTaken).toBeUndefined();
    expect(res.body.pillsTakenCount).toBeUndefined();
    expect(res.body.extractionConfidence).toBeUndefined();
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

  it("4b. Voice submit accepts a confirmed transcript without facts (backend extracts)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/check-ins/audio-extract")
      .set("Cookie", patient4Cookie)
      .attach("audio", Buffer.from("mock audio bytes for Pandu STT"), "voice_checkin.webm")
      .field("treatmentPlanId", plan4Id);

    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(["transcript"]);

    const submit = await request(app.getHttpServer())
      .post("/api/check-ins")
      .set("Cookie", patient4Cookie)
      .send({
        inputMode: "VOICE_STT",
        confirmedFacts: { transcript: res.body.transcript },
      });

    expect(submit.status).toBe(201);
    expect(submit.body.verdict).toBe("TERKENDALI");
    expect(submit.body.isDoseFulfilled).toBe(true);

    const stored = await dataSource
      .getRepository(DailyCheckIn)
      .findOneBy({ treatmentPlanId: plan4Id });
    expect(stored?.rawTranscriptEncrypted).toBe(res.body.transcript);
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
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const monitoredPatient = res.body.find((p: any) => p.treatmentPlanId === plan1Id);
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

  it("8. PASIEN lists only their own check-ins, never the transcript", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/check-ins")
      .set("Cookie", patient1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(
      res.body.items.every((i: any) => i.treatmentPlanId === plan1Id),
    ).toBe(true);
    for (const item of res.body.items) {
      expect(item.rawTranscriptEncrypted).toBeUndefined();
      expect(item.extractedFactsJson).toBeUndefined();
      expect(item.patientName).toBe("Ahmad Dahlan");
      expect(item.facilityId).toBe(facilityId);
    }
  });

  it("9. PMO lists only check-ins of patients assigned to them", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/check-ins")
      .set("Cookie", pmo1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(
      res.body.items.every((i: any) => i.treatmentPlanId === plan1Id),
    ).toBe(true);
    expect(
      res.body.items.some((i: any) => i.treatmentPlanId === plan2Id),
    ).toBe(false);
  });

  it("10. NAKES lists every check-in in their own facility only", async () => {
    const own = await request(app.getHttpServer())
      .get("/api/check-ins")
      .set("Cookie", nakesACookie);

    expect(own.status).toBe(200);
    const planIds = own.body.items.map((i: any) => i.treatmentPlanId);
    expect(planIds).toContain(plan1Id);
    expect(planIds).toContain(plan2Id);
    expect(planIds).not.toContain(plan3Id);

    const other = await request(app.getHttpServer())
      .get("/api/check-ins")
      .set("Cookie", nakesBCookie);

    expect(other.status).toBe(200);
    expect(other.body.items.every((i: any) => i.treatmentPlanId === plan3Id)).toBe(
      true,
    );
    expect(other.body.items.every((i: any) => i.facilityId === facilityBId)).toBe(
      true,
    );
  });

  it("11. NAKES cannot filter check-ins down to another facility's plan", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/check-ins?treatmentPlanId=${plan3Id}`)
      .set("Cookie", nakesACookie);

    expect(res.status).toBe(404);
  });

  it("12. ADMIN lists check-ins across every facility", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/check-ins?limit=100")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    const planIds = res.body.items.map((i: any) => i.treatmentPlanId);
    expect(planIds).toContain(plan1Id);
    expect(planIds).toContain(plan2Id);
    expect(planIds).toContain(plan3Id);
  });

  it("13. NAKES cannot read another facility's patient timeline", async () => {
    const forbidden = await request(app.getHttpServer())
      .get(`/api/faskes/patients/${plan3Id}/history`)
      .set("Cookie", nakesACookie);

    expect(forbidden.status).toBe(404);

    const allowed = await request(app.getHttpServer())
      .get(`/api/faskes/patients/${plan1Id}/history`)
      .set("Cookie", nakesACookie);

    expect(allowed.status).toBe(200);
    expect(allowed.body.items.length).toBeGreaterThanOrEqual(1);
  });
  it("14. filters check-ins by medication status and date range", async () => {
    const byStatus = await request(app.getHttpServer())
      .get("/api/check-ins?medicationStatus=SUDAH_MINUM")
      .set("Cookie", patient1Cookie);

    expect(byStatus.status).toBe(200);
    expect(byStatus.body.items.length).toBeGreaterThanOrEqual(1);
    expect(
      byStatus.body.items.every(
        (i: any) => i.medicationStatus === "SUDAH_MINUM",
      ),
    ).toBe(true);

    const inRange = await request(app.getHttpServer())
      .get("/api/check-ins?from=2000-01-01&to=2100-01-01")
      .set("Cookie", patient1Cookie);

    expect(inRange.status).toBe(200);
    expect(inRange.body.total).toBeGreaterThanOrEqual(1);

    const outOfRange = await request(app.getHttpServer())
      .get("/api/check-ins?from=1990-01-01&to=1990-12-31")
      .set("Cookie", patient1Cookie);

    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.total).toBe(0);
  });

  it("15. NAKES cannot filter check-ins by another facility", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/check-ins?facilityId=${facilityBId}`)
      .set("Cookie", nakesACookie);

    expect(res.status).toBe(403);
  });

  it("16. ADMIN filters check-ins by facility", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/check-ins?facilityId=${facilityBId}`)
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(
      res.body.items.every((i: any) => i.facilityId === facilityBId),
    ).toBe(true);
  });
});
