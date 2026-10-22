import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/entities/facility.entity.js";
import { EducationCard } from "../src/modules/education/entities/education-card.entity.js";

describe("Education Cards CRUD (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let facilityId: string;
  let otherFacilityId: string;

  let adminCookie: string[];
  let nakesCookie: string[];
  let otherNakesCookie: string[];
  let pasienCookie: string[];

  let adminUserId: string;
  let nakesUserId: string;
  let otherNakesUserId: string;
  let pasienUserId: string;

  let facilityCardId: string;
  let globalCardId: string;

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
        code: `FASKES-EDU-${ts}`,
        name: "Puskesmas Edu",
        district: "Jakarta Pusat",
        emergencyPhone: "021-111",
      }),
    );
    facilityId = facility.id;

    const otherFacility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-EDU-OTHER-${ts}`,
        name: "Puskesmas Edu Lain",
        district: "Jakarta Barat",
        emergencyPhone: "021-222",
      }),
    );
    otherFacilityId = otherFacility.id;

    const mk = async (role: string, label: string, facilityId?: string) => {
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
            facility_id: facilityId ?? null,
            must_confirm_consent: false,
          },
        },
      });
      return { id: res.user.id, username };
    };

    const admin = await mk("ADMIN", "edu_admin");
    adminUserId = admin.id;
    const nakes = await mk("NAKES", "edu_nakes", facilityId);
    nakesUserId = nakes.id;
    const otherNakes = await mk("NAKES", "edu_nakes2", otherFacilityId);
    otherNakesUserId = otherNakes.id;
    const pasien = await mk("PASIEN", "edu_pasien", facilityId);
    pasienUserId = pasien.id;

    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username, password: pw });
      expect(res.status).toBe(200);
      return res.headers["set-cookie"] as string[];
    };

    adminCookie = await login(admin.username);
    nakesCookie = await login(nakes.username);
    otherNakesCookie = await login(otherNakes.username);
    pasienCookie = await login(pasien.username);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.getRepository(EducationCard).delete({ facilityId });
      await dataSource.getRepository(EducationCard).delete({ facilityId: otherFacilityId });
      for (const id of [pasienUserId, otherNakesUserId, nakesUserId, adminUserId]) {
        if (id) await dataSource.getRepository("users").delete({ id });
      }
      await dataSource.getRepository(Facility).delete({ id: facilityId });
      await dataSource.getRepository(Facility).delete({ id: otherFacilityId });
    }
    await app.close();
  });

  it("1. NAKES creates a card scoped to their own facility", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/education")
      .set("Cookie", nakesCookie)
      .send({
        title: "Kartu Faskes",
        summary: "Ringkasan kartu faskes",
        contentMarkdown: "### Isi kartu",
        category: "NUTRITION",
        phase: "INTENSIF",
        sortOrder: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.facilityId).toBe(facilityId);
    expect(res.body.category).toBe("NUTRITION");
    facilityCardId = res.body.id;
  });

  it("2. NAKES cannot create a card for another facility", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/education")
      .set("Cookie", nakesCookie)
      .send({
        title: "Lintas Faskes",
        summary: "Tidak boleh",
        contentMarkdown: "Isi",
        category: "GENERAL",
        phase: "INTENSIF",
        facilityId: otherFacilityId,
      });

    expect(res.status).toBe(403);
  });

  it("3. ADMIN creates a global card (facilityId null)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/education")
      .set("Cookie", adminCookie)
      .send({
        title: "Kartu Global",
        summary: "Berlaku semua faskes",
        contentMarkdown: "### Isi global",
        category: "STIGMA",
        phase: "LANJUTAN",
      });

    expect(res.status).toBe(201);
    expect(res.body.facilityId).toBeNull();
    globalCardId = res.body.id;
  });

  it("4. PASIEN feed includes global and own-facility cards only", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/education/daily")
      .set("Cookie", pasienCookie);

    expect(res.status).toBe(200);
    const ids = res.body.cards.map((c: any) => c.id);
    expect(ids).toContain(facilityCardId);
    expect(ids).toContain(globalCardId);
  });

  it("5. PASIEN feed respects the phase filter", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/education/daily?phase=LANJUTAN")
      .set("Cookie", pasienCookie);

    expect(res.status).toBe(200);
    expect(res.body.cards.length).toBeGreaterThanOrEqual(1);
    for (const card of res.body.cards) {
      expect(card.phase).toBe("LANJUTAN");
    }
  });

  it("6. NAKES listing includes global and own-facility cards, not other facilities", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/education")
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    const ids = res.body.map((c: any) => c.id);
    expect(ids).toContain(facilityCardId);
    expect(ids).toContain(globalCardId);
    for (const card of res.body) {
      expect([null, facilityId]).toContain(card.facilityId);
    }
  });

  it("7. ADMIN listing sees every card", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/education")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    const ids = res.body.map((c: any) => c.id);
    expect(ids).toContain(facilityCardId);
    expect(ids).toContain(globalCardId);
  });

  it("8. NAKES edits their own facility card", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/education/${facilityCardId}`)
      .set("Cookie", nakesCookie)
      .send({ title: "Kartu Faskes Diperbarui" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Kartu Faskes Diperbarui");
  });

  it("9. NAKES cannot edit a global card", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/education/${globalCardId}`)
      .set("Cookie", nakesCookie)
      .send({ title: "Nope" });

    expect(res.status).toBe(403);
  });

  it("10. another facility's NAKES cannot edit this facility's card", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/education/${facilityCardId}`)
      .set("Cookie", otherNakesCookie)
      .send({ title: "Nope" });

    expect(res.status).toBe(403);
  });

  it("11. ADMIN edits a global card", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/education/${globalCardId}`)
      .set("Cookie", adminCookie)
      .send({ title: "Kartu Global Diperbarui" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Kartu Global Diperbarui");
  });

  it("12. PASIEN cannot access the management endpoints", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/education")
      .set("Cookie", pasienCookie);
    expect(list.status).toBe(403);

    const create = await request(app.getHttpServer())
      .post("/api/education")
      .set("Cookie", pasienCookie)
      .send({
        title: "Nope",
        summary: "Nope",
        contentMarkdown: "Nope",
        category: "GENERAL",
        phase: "INTENSIF",
      });
    expect(create.status).toBe(403);
  });

  it("13. NAKES cannot delete a global card", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/education/${globalCardId}`)
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(403);
  });

  it("14. NAKES hard-deletes their own facility card", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/education/${facilityCardId}`)
      .set("Cookie", nakesCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const gone = await dataSource
      .getRepository(EducationCard)
      .findOneBy({ id: facilityCardId });
    expect(gone).toBeNull();
  });

  it("15. deleting a missing card returns 404", async () => {
    const res = await request(app.getHttpServer())
      .delete("/api/education/00000000-0000-0000-0000-000000000000")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(404);
  });
});
