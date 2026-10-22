import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/entities/facility.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../src/modules/patients/entities/pmo-assignment.entity.js";

describe("Intervention Tickets Lifecycle (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let patientCookie: string[];
  let pmoCookie: string[];
  let nakesCookie: string[];

  let patientId: string;
  let planId: string;
  let patientTicketId: string;
  let pmoTicketId: string;

  const pw = "pwgampang_123";
  const suffix = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Facility
    const facRepo = dataSource.getRepository(Facility);
    const facility = await facRepo.save(
      facRepo.create({
        code: `FASKES-TCK-${suffix}`,
        name: "Puskesmas Kebon Sirih",
        district: "Jakarta Pusat",
        emergencyPhone: "0811-1234-5678",
      }),
    );

    // 2. NAKES
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "dr. Hendra",
        email: `nakes_tck_${suffix}@users.tiby.internal`,
        password: pw,
        role: "NAKES",
        data: {
          username: `nakes_tck_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });

    const nLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `nakes_tck_${suffix}`, password: pw });
    nakesCookie = nLogin.headers["set-cookie"];

    // 3. PASIEN
    const pasienAuth = await auth.api.createUser({
      body: {
        name: "Agus Pasien",
        email: `pasien_tck_${suffix}@users.tiby.internal`,
        password: pw,
        role: "PASIEN",
        data: {
          username: `pasien_tck_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });
    patientId = pasienAuth.user.id;

    const pLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `pasien_tck_${suffix}`, password: pw });
    patientCookie = pLogin.headers["set-cookie"];

    // 4. PMO
    const pmoAuth = await auth.api.createUser({
      body: {
        name: "Dewi PMO",
        email: `pmo_tck_${suffix}@users.tiby.internal`,
        password: pw,
        role: "PMO",
        data: {
          username: `pmo_tck_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });

    const pmoLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `pmo_tck_${suffix}`, password: pw });
    pmoCookie = pmoLogin.headers["set-cookie"];

    // 5. Treatment Plan
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const plan = await planRepo.save(
      planRepo.create({
        patientUserId: patientId,
        facilityId: facility.id,
        registeredByNakesId: nakesAuth.user.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        reminderTimeLocal: "08:00",
        timezone: "Asia/Jakarta",
        startDate: "2026-10-18",
        targetEndDate: "2027-04-18",
      }),
    );
    planId = plan.id;

    // 6. PMO Assignment
    const pmoRepo = dataSource.getRepository(PmoAssignment);
    await pmoRepo.save(
      pmoRepo.create({
        treatmentPlanId: planId,
        pmoUserId: pmoAuth.user.id,
        relationship: "KELUARGA",
        isPrimary: true,
        active: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Patient manually creates a ticket via POST /api/faskes/tickets", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/faskes/tickets")
      .set("Cookie", patientCookie)
      .send({
        priority: "HIGH",
        reason: "Mual berat dan pusing setelah minum dosis pagi ini, butuh bantuan suster.",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.triggerSource).toBe("MANUAL_PATIENT");
    expect(res.body.priority).toBe("HIGH");
    expect(res.body.status).toBe("OPEN");
    expect(res.body.pmoNotes).toContain("[PASIEN]: Mual berat");

    patientTicketId = res.body.id;
  });

  it("2. PMO manually creates a critical ticket via POST /api/faskes/tickets", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/faskes/tickets")
      .set("Cookie", pmoCookie)
      .send({
        treatmentPlanId: planId,
        priority: "CRITICAL",
        reason: "Pasien batuk bercak darah saat didatangi ke rumah.",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.triggerSource).toBe("PMO_ESCALATION");
    expect(res.body.priority).toBe("CRITICAL");
    expect(res.body.status).toBe("OPEN");

    pmoTicketId = res.body.id;
  });

  it("3. NAKES lists tickets and sees both open manual tickets", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/faskes/tickets")
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    const ids = res.body.items.map((t: any) => t.id);
    expect(ids).toContain(patientTicketId);
    expect(ids).toContain(pmoTicketId);
  });

  it("4. Patient is forbidden from closing tickets", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/faskes/tickets/${patientTicketId}/close`)
      .set("Cookie", patientCookie)
      .send({
        resolutionReason: "KONSULTASI_KLINIK",
        resolutionNotes: "Self close unauthorized",
      });

    expect(res.status).toBe(403);
  });

  it("5. NAKES resolves ticket with standard resolution reason enum and notes", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/faskes/tickets/${patientTicketId}/close`)
      .set("Cookie", nakesCookie)
      .send({
        resolutionReason: "KONSULTASI_KLINIK",
        resolutionNotes: "Pasien datang ke Puskesmas, diberikan obat anti-mual 30 menit sebelum OAT.",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED_CLOSED");
    expect(res.body.resolutionReason).toBe("KONSULTASI_KLINIK");
    expect(res.body.resolutionNotes).toContain("diberikan obat anti-mual");
    expect(res.body.closedAt).toBeDefined();
  });
});
