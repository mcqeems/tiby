import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../src/modules/patients/entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../src/modules/check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../src/modules/internal/rule-engine/entities/safety-evaluation.entity.js";
import { FacilityAlert } from "../src/modules/alerts/entities/facility-alert.entity.js";
import { InterventionTicket } from "../src/modules/tickets/entities/intervention-ticket.entity.js";

describe("Dashboard stats (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminCookie: string[];
  let nakesACookie: string[];
  let nakesBCookie: string[];
  let pmoCookie: string[];
  let pasienACookie: string[];
  let pasienBCookie: string[];

  const ts = Date.now();
  const pw = "pwstats_123";
  const DAY_MS = 86_400_000;
  const today = new Date().toISOString().slice(0, 10);
  const dayOffset = (days: number) =>
    new Date(Date.parse(today) + days * DAY_MS).toISOString().slice(0, 10);

  const userIds: string[] = [];
  let facilityAId: string;
  let facilityBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    const facilityRepo = dataSource.getRepository(Facility);
    const facilityA = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-STATS-A-${ts}`,
        name: "Puskesmas Stats A",
        district: "Jakarta Pusat",
        emergencyPhone: "021-444",
      }),
    );
    facilityAId = facilityA.id;
    const facilityB = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-STATS-B-${ts}`,
        name: "Puskesmas Stats B",
        district: "Jakarta Barat",
        emergencyPhone: "021-555",
      }),
    );
    facilityBId = facilityB.id;

    const mk = async (
      role: "ADMIN" | "NAKES" | "PMO" | "PASIEN",
      label: string,
      facId?: string,
    ) => {
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
            facility_id: facId ?? null,
            must_confirm_consent: false,
          },
        },
      });
      userIds.push(res.user.id);
      return { id: res.user.id, username };
    };

    const admin = await mk("ADMIN", "stats_admin");
    const nakesA = await mk("NAKES", "stats_nakes_a", facilityAId);
    const nakesB = await mk("NAKES", "stats_nakes_b", facilityBId);
    const pmo = await mk("PMO", "stats_pmo");
    const pasienA = await mk("PASIEN", "stats_pasien_a", facilityAId);
    const pasienB = await mk("PASIEN", "stats_pasien_b", facilityBId);

    // Plan A: 11 elapsed days, 3 fulfilled days, one retry, one open ticket.
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const planA = await planRepo.save(
      planRepo.create({
        patientUserId: pasienA.id,
        facilityId: facilityAId,
        registeredByNakesId: nakesA.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        startDate: dayOffset(-10),
        targetEndDate: dayOffset(170),
        currentStreak: 3,
      }),
    );

    const checkInRepo = dataSource.getRepository(DailyCheckIn);
    const addCheckIn = (
      date: string,
      attemptNumber: number,
      pillsTakenCount: number,
      isDoseFulfilled: boolean,
    ) =>
      checkInRepo.save(
        checkInRepo.create({
          treatmentPlanId: planA.id,
          checkInDate: date,
          attemptNumber,
          reportedByUserId: pasienA.id,
          reportedByRole: "PASIEN",
          inputMode: "FALLBACK_BUTTONS",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount,
          isDoseFulfilled,
        }),
      );

    await addCheckIn(dayOffset(-2), 1, 4, true);
    await addCheckIn(dayOffset(-1), 1, 2, false);
    await addCheckIn(dayOffset(-1), 2, 4, true);
    const todayCheckIn = await addCheckIn(today, 1, 4, true);

    const evalRepo = dataSource.getRepository(SafetyEvaluation);
    await evalRepo.save(
      evalRepo.create({
        checkInId: todayCheckIn.id,
        verdict: "TERKENDALI",
        isValidCompletion: true,
        matchedRuleCodes: [],
        responseMessageId: `msg_${todayCheckIn.id}`,
      }),
    );

    const pmoRepo = dataSource.getRepository(PmoAssignment);
    await pmoRepo.save(
      pmoRepo.create({
        treatmentPlanId: planA.id,
        pmoUserId: pmo.id,
        relationship: "KELUARGA",
        isPrimary: true,
        active: true,
      }),
    );

    const alertRepo = dataSource.getRepository(FacilityAlert);
    await alertRepo.save(
      alertRepo.create({
        facilityId: facilityAId,
        treatmentPlanId: planA.id,
        alertType: "SILENCE_H3_WARNING",
        severity: "WARNING",
        title: "Unread alert",
        message: "Should count",
        isRead: false,
      }),
    );
    await alertRepo.save(
      alertRepo.create({
        facilityId: facilityAId,
        treatmentPlanId: planA.id,
        alertType: "DOSE_RETRY_WARNING",
        severity: "INFO",
        title: "Read alert",
        message: "Should not count",
        isRead: true,
      }),
    );

    const ticketRepo = dataSource.getRepository(InterventionTicket);
    await ticketRepo.save(
      ticketRepo.create({
        treatmentPlanId: planA.id,
        facilityId: facilityAId,
        triggerSource: "SILENCE_H3",
        priority: "CRITICAL",
        status: "OPEN",
      }),
    );

    // Plan B keeps NAKES A's numbers honest: nothing in facility A may include it.
    const planB = await planRepo.save(
      planRepo.create({
        patientUserId: pasienB.id,
        facilityId: facilityBId,
        registeredByNakesId: nakesB.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        startDate: today,
        targetEndDate: dayOffset(180),
        currentStreak: 0,
      }),
    );
    await alertRepo.save(
      alertRepo.create({
        facilityId: facilityBId,
        treatmentPlanId: planB.id,
        alertType: "SILENCE_H3_WARNING",
        severity: "HIGH",
        title: "Facility B alert",
        message: "Must not leak into A",
        isRead: false,
      }),
    );
    await ticketRepo.save(
      ticketRepo.create({
        treatmentPlanId: planB.id,
        facilityId: facilityBId,
        triggerSource: "SILENCE_H3",
        priority: "HIGH",
        status: "OPEN",
      }),
    );

    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username, password: pw });
      expect(res.status).toBe(200);
      return res.get("Set-Cookie")!;
    };

    adminCookie = await login(admin.username);
    nakesACookie = await login(nakesA.username);
    nakesBCookie = await login(nakesB.username);
    pmoCookie = await login(pmo.username);
    pasienACookie = await login(pasienA.username);
    pasienBCookie = await login(pasienB.username);
  });

  afterAll(async () => {
    if (dataSource) {
      // Patients first: their plans cascade to check-ins, tickets and alerts.
      // NAKES must go after them because treatment_plans.registered_by_nakes_id
      // is RESTRICT.
      for (const id of [...userIds].reverse()) {
        await dataSource.getRepository("users").delete({ id });
      }
      await dataSource.getRepository(Facility).delete({ id: facilityAId });
      await dataSource.getRepository(Facility).delete({ id: facilityBId });
    }
    await app.close();
  });

  it("1. PASIEN gets their plan's live numbers", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", pasienACookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: "PASIEN",
      currentStreak: 3,
      adherenceRate: 0.273,
      daysRemaining: 170,
      todayCheckInStatus: "TERKENDALI",
      totalPillsTaken: 12,
      currentPhase: "INTENSIF",
    });
  });

  it("2. PASIEN without a plan gets a zeroed payload", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", pasienBCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: "PASIEN",
      currentStreak: 0,
      totalPillsTaken: 0,
      currentPhase: "INTENSIF",
      todayCheckInStatus: "BELUM_CHECK_IN",
    });
  });

  it("3. PMO sees only their assigned patients", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", pmoCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: "PMO",
      totalPatients: 1,
      checkedInToday: 1,
      pendingCheckIn: 0,
      highRiskPatients: 0,
      unreadAlerts: 1,
    });
  });

  it("4. NAKES sees only their facility and the weighted adherence", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", nakesACookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: "NAKES",
      totalPatients: 1,
      highRiskPatients: 0,
      openTickets: 1,
      criticalTickets: 1,
      unreadAlerts: 1,
      adherenceRate: 0.273,
    });
  });

  it("5. facility B's NAKES does not see facility A's rows", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", nakesBCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: "NAKES",
      totalPatients: 1,
      openTickets: 1,
      criticalTickets: 0,
      unreadAlerts: 1,
    });
  });

  it("6. ADMIN gets the platform-wide payload", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/stats")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("ADMIN");
    expect(res.body.totalFacilities).toBeGreaterThanOrEqual(2);
    expect(res.body.totalNakes).toBeGreaterThanOrEqual(2);
    expect(res.body.totalPatients).toBeGreaterThanOrEqual(2);
    expect(res.body.totalActiveTickets).toBeGreaterThanOrEqual(2);
  });

  it("7. requires authentication", async () => {
    const res = await request(app.getHttpServer()).get("/api/stats");
    expect(res.status).toBe(401);
  });
});
