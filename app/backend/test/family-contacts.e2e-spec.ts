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

describe("Dedicated Family Contacts API (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let patientCookie: string[];
  let pmoCookie: string[];
  let nakesCookie: string[];

  let patientId: string;
  let planId: string;
  let createdContactId: string;

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
        code: `FASKES-FC-${suffix}`,
        name: "Puskesmas Gambir Family",
        district: "Jakarta Pusat",
        emergencyPhone: "0811-999-888",
      }),
    );

    // 2. NAKES
    const nakesAuth = await auth.api.createUser({
      body: {
        name: "dr. Nakes FC",
        email: `nakes_fc_${suffix}@users.tiby.internal`,
        password: pw,
        role: "NAKES",
        data: {
          username: `nakes_fc_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });

    const nakesLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `nakes_fc_${suffix}`, password: pw });
    nakesCookie = nakesLogin.headers["set-cookie"];

    // 3. PASIEN
    const pasienAuth = await auth.api.createUser({
      body: {
        name: "Budi FC",
        email: `pasien_fc_${suffix}@users.tiby.internal`,
        password: pw,
        role: "PASIEN",
        data: {
          username: `pasien_fc_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });
    patientId = pasienAuth.user.id;

    const pasienLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `pasien_fc_${suffix}`, password: pw });
    patientCookie = pasienLogin.headers["set-cookie"];

    // 4. PMO
    const pmoAuth = await auth.api.createUser({
      body: {
        name: "Ratna PMO FC",
        email: `pmo_fc_${suffix}@users.tiby.internal`,
        password: pw,
        role: "PMO",
        data: {
          username: `pmo_fc_${suffix}`,
          facility_id: facility.id,
          must_confirm_consent: false,
        },
      },
    });

    const pmoLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `pmo_fc_${suffix}`, password: pw });
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

  it("1. PMO adds an emergency family contact via POST /api/patients/:id/family-contacts", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/patients/${planId}/family-contacts`)
      .set("Cookie", pmoCookie)
      .send({
        fullName: "Ibu Siti (Istri)",
        whatsappNumber: "081299887766",
        notifyOnEscalation: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.fullName).toBe("Ibu Siti (Istri)");
    expect(res.body.whatsappNumber).toBe("081299887766");
    expect(res.body.whatsappVerified).toBe(false);
    expect(res.body.notifyOnEscalation).toBe(true);

    createdContactId = res.body.id;
  });

  it("2. Patient lists their own family contacts via GET /api/patients/:id/family-contacts", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/patients/${patientId}/family-contacts`)
      .set("Cookie", patientCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].fullName).toBe("Ibu Siti (Istri)");
  });

  it("3. PMO is forbidden from deleting family contact", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/patients/${planId}/family-contacts/${createdContactId}`)
      .set("Cookie", pmoCookie);

    expect(res.status).toBe(403);
  });

  it("4. NAKES from same facility successfully deletes family contact", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/patients/${planId}/family-contacts/${createdContactId}`)
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify list is now empty
    const checkRes = await request(app.getHttpServer())
      .get(`/api/patients/${planId}/family-contacts`)
      .set("Cookie", nakesCookie);
    expect(checkRes.body).toHaveLength(0);
  });
});
