import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";

describe("Facilities CRUD (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminCookie: string[];
  let nakesCookie: string[];
  let pasienCookie: string[];

  let adminUserId: string;
  let nakesUserId: string;
  let otherNakesUserId: string;
  let pasienUserId: string;

  let facilityId: string;
  let otherFacilityId: string;
  let createdFacilityId: string;

  const ts = Date.now();
  const pw = "pwgampang_123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-CRUD-${ts}`,
        name: "Puskesmas CRUD",
        district: "Jakarta Pusat",
        emergencyPhone: "021-111",
      }),
    );
    facilityId = facility.id;

    const otherFacility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-CRUD-OTHER-${ts}`,
        name: "Puskesmas CRUD Lain",
        district: "Jakarta Barat",
        emergencyPhone: "021-222",
      }),
    );
    otherFacilityId = otherFacility.id;

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
      return { id: res.user.id, username };
    };

    const admin = await mk("ADMIN", "fac_admin");
    adminUserId = admin.id;
    const nakes = await mk("NAKES", "fac_nakes", facilityId);
    nakesUserId = nakes.id;
    const otherNakes = await mk("NAKES", "fac_nakes2", otherFacilityId);
    otherNakesUserId = otherNakes.id;
    const pasien = await mk("PASIEN", "fac_pasien", facilityId);
    pasienUserId = pasien.id;

    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username, password: pw });
      expect(res.status).toBe(200);
      return res.get("Set-Cookie")!;
    };

    adminCookie = await login(admin.username);
    nakesCookie = await login(nakes.username);
    pasienCookie = await login(pasien.username);
  });

  afterAll(async () => {
    if (dataSource) {
      if (createdFacilityId) {
        await dataSource.getRepository(Facility).delete({ id: createdFacilityId });
      }
      for (const id of [pasienUserId, otherNakesUserId, nakesUserId, adminUserId]) {
        if (id) await dataSource.getRepository("users").delete({ id });
      }
      await dataSource.getRepository(Facility).delete({ id: facilityId });
      await dataSource.getRepository(Facility).delete({ id: otherFacilityId });
    }
    await app.close();
  });

  it("1. every role can read the facility list", async () => {
    for (const cookie of [adminCookie, nakesCookie, pasienCookie]) {
      const res = await request(app.getHttpServer())
        .get("/api/facilities?limit=100")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      const found = res.body.items.find((f: any) => f.id === facilityId);
      expect(found).toBeDefined();
      expect(found.district).toBe("Jakarta Pusat");
      expect(found.emergencyPhone).toBe("021-111");
    }
  });

  it("2. any role can read a single facility", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/facilities/${facilityId}`)
      .set("Cookie", pasienCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(facilityId);
    expect(res.body.code).toBe(`FASKES-CRUD-${ts}`);
  });

  it("3. ADMIN creates a facility", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/facilities")
      .set("Cookie", adminCookie)
      .send({
        code: `FASKES-NEW-${ts}`,
        name: "Puskesmas Baru",
        district: "Bandung",
        emergencyPhone: "022-333",
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(`FASKES-NEW-${ts}`);
    createdFacilityId = res.body.id;
  });

  it("4. ADMIN cannot create a duplicate code", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/facilities")
      .set("Cookie", adminCookie)
      .send({
        code: `FASKES-NEW-${ts}`,
        name: "Duplikat",
        district: "Bandung",
        emergencyPhone: "022-444",
      });

    expect(res.status).toBe(409);
  });

  it("5. NAKES cannot create a facility", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/facilities")
      .set("Cookie", nakesCookie)
      .send({
        code: `FASKES-ILLEGAL-${ts}`,
        name: "Ilegal",
        district: "Bandung",
        emergencyPhone: "022-555",
      });

    expect(res.status).toBe(403);
  });

  it("6. NAKES edits their own facility", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/facilities/${facilityId}`)
      .set("Cookie", nakesCookie)
      .send({
        code: `FASKES-CRUD-RENAMED-${ts}`,
        name: "Puskesmas CRUD Diperbarui",
        district: "Jakarta Selatan",
        emergencyPhone: "021-999",
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Puskesmas CRUD Diperbarui");
    expect(res.body.district).toBe("Jakarta Selatan");
    expect(res.body.emergencyPhone).toBe("021-999");
    expect(res.body.code).toBe(`FASKES-CRUD-RENAMED-${ts}`);
  });

  it("7. NAKES cannot edit another facility", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/facilities/${otherFacilityId}`)
      .set("Cookie", nakesCookie)
      .send({ name: "Nope" });

    expect(res.status).toBe(403);
  });

  it("8. ADMIN edits any facility", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/facilities/${otherFacilityId}`)
      .set("Cookie", adminCookie)
      .send({ name: "Puskesmas Lain Diperbarui" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Puskesmas Lain Diperbarui");
  });

  it("9. PASIEN cannot edit any facility", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/facilities/${facilityId}`)
      .set("Cookie", pasienCookie)
      .send({ name: "Nope" });

    expect(res.status).toBe(403);
  });

  it("10. NAKES cannot delete a facility", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/facilities/${facilityId}`)
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(403);
  });

  it("11. ADMIN deletes a facility", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/facilities/${createdFacilityId}`)
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const gone = await dataSource
      .getRepository(Facility)
      .findOneBy({ id: createdFacilityId });
    expect(gone).toBeNull();
    createdFacilityId = "";
  });

  it("12. reading a missing facility returns 404", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/facilities/00000000-0000-0000-0000-000000000000")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(404);
  });
  it("13. filters the facility list by search", async () => {
    const match = await request(app.getHttpServer())
      .get("/api/facilities?search=Lain")
      .set("Cookie", adminCookie);

    expect(match.status).toBe(200);
    expect(match.body.total).toBeGreaterThanOrEqual(1);
    expect(
      match.body.items.every((f: any) => f.name.includes("Lain")),
    ).toBe(true);

    const miss = await request(app.getHttpServer())
      .get("/api/facilities?search=zzzznomatch")
      .set("Cookie", adminCookie);

    expect(miss.status).toBe(200);
    expect(miss.body.total).toBe(0);
  });
});
