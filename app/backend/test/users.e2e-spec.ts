import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/entities/facility.entity.js";

describe("Users & RBAC Password Management (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let facilityId: string;

  let adminCookie: string[];
  let nakesCookie: string[];
  let pasienCookie: string[];

  let nakesUserId: string;
  let pasienUserId: string;
  let otherFacilityId: string;
  let outsiderPasienId: string;

  const adminUsername = `admin_${Date.now()}`;
  const nakesUsername = `nakes_${Date.now()}`;
  const pasienUsername = `pasien_${Date.now()}`;
  const defaultPw = "pwgampang_123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    dataSource = app.get(DataSource);

    // 1. Facility
    const facilityRepo = dataSource.getRepository(Facility);
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-RBAC-${Date.now()}`,
        name: "Puskesmas Menteng",
        district: "Jakarta Pusat",
        emergencyPhone: "021-123456",
      }),
    );
    facilityId = facility.id;

    // 1b. A second facility with its own PASIEN, to prove facility scoping
    const otherFacility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-RBAC-OTHER-${Date.now()}`,
        name: "Puskesmas Lain",
        district: "Jakarta Barat",
        emergencyPhone: "021-999888",
      }),
    );
    otherFacilityId = otherFacility.id;

    // 2. Admin User
    await auth.api.createUser({
      body: {
        name: "Super Admin",
        email: `${adminUsername}@users.tiby.internal`,
        password: defaultPw,
        role: "ADMIN",
        data: {
          username: adminUsername,
          displayUsername: adminUsername,
          must_confirm_consent: false,
        },
      },
    });

    // 3. Login as Admin using unified /api/auth/sign-in (with username)
    const adminLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: adminUsername, password: defaultPw });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers["set-cookie"];

    // 4. Admin creates NAKES user
    const createNakesRes = await request(app.getHttpServer())
      .post("/api/users")
      .set("Cookie", adminCookie)
      .send({
        username: nakesUsername,
        password: defaultPw,
        fullName: "dr. Nakes E2E",
        role: "NAKES",
        facilityId,
      });
    expect(createNakesRes.status).toBe(201);
    expect(createNakesRes.body.facility).toBe("Puskesmas Menteng");
    nakesUserId = createNakesRes.body.id;

    // 4b. Admin creates a PASIEN in the OTHER facility
    const createOutsiderRes = await request(app.getHttpServer())
      .post("/api/users")
      .set("Cookie", adminCookie)
      .send({
        username: `outsider_${Date.now()}`,
        password: defaultPw,
        fullName: "Outsider Pasien",
        role: "PASIEN",
        facilityId: otherFacilityId,
      });
    expect(createOutsiderRes.status).toBe(201);
    outsiderPasienId = createOutsiderRes.body.id;

    // 5. Login as NAKES using unified /api/auth/sign-in (with email)
    const nakesLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: `${nakesUsername}@users.tiby.internal`, password: defaultPw });
    expect(nakesLogin.status).toBe(200);
    nakesCookie = nakesLogin.headers["set-cookie"];

    // 6. NAKES creates PASIEN user
    const createPasienRes = await request(app.getHttpServer())
      .post("/api/users")
      .set("Cookie", nakesCookie)
      .send({
        username: pasienUsername,
        password: defaultPw,
        fullName: "Pasien E2E",
        role: "PASIEN",
      });
    expect(createPasienRes.status).toBe(201);
    expect(createPasienRes.body.facility).toBe("Puskesmas Menteng");
    pasienUserId = createPasienRes.body.id;

    // 7. Login as PASIEN using unified /api/auth/sign-in (with identifier)
    const pasienLogin = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ identifier: pasienUsername, password: defaultPw });
    expect(pasienLogin.status).toBe(200);
    pasienCookie = pasienLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Account Creation Guardrails", () => {
    it("forbids NAKES from creating ADMIN account", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users")
        .set("Cookie", nakesCookie)
        .send({
          username: `fake_admin_${Date.now()}`,
          password: defaultPw,
          fullName: "Fake Admin",
          role: "ADMIN",
        });
      expect(res.status).toBe(403);
    });

    it("forbids PASIEN from creating any account", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users")
        .set("Cookie", pasienCookie)
        .send({
          username: `illegal_user_${Date.now()}`,
          password: defaultPw,
          fullName: "Illegal User",
          role: "PASIEN",
        });
      expect(res.status).toBe(403);
    });

    it("returns facility name in GET /api/users/me and GET /api/users", async () => {
      const meRes = await request(app.getHttpServer())
        .get("/api/users/me")
        .set("Cookie", nakesCookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.facility).toBe("Puskesmas Menteng");

      const listRes = await request(app.getHttpServer())
        .get("/api/users")
        .set("Cookie", nakesCookie);
      expect(listRes.status).toBe(200);
      const foundNakes = listRes.body.find((u: any) => u.id === nakesUserId);
      expect(foundNakes?.facility).toBe("Puskesmas Menteng");
    });
  });

  describe("Self-Service Password Change", () => {
    it("rejects password change if current password is wrong", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/change-password")
        .set("Cookie", pasienCookie)
        .send({
          currentPassword: "wrong_password_123",
          newPassword: "new_password_super_secure",
        });
      expect(res.status).toBe(400);
    });

    it("allows user to change their own password with correct current password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/users/change-password")
        .set("Cookie", pasienCookie)
        .send({
          currentPassword: defaultPw,
          newPassword: "new_pw_pasien_123",
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify sign in with new password works
      const loginCheck = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ username: pasienUsername, password: "new_pw_pasien_123" });
      expect(loginCheck.status).toBe(200);
    });
  });


  describe("Edit User (PATCH /api/users/:id)", () => {
    it("allows NAKES to edit a PASIEN in their own facility", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${pasienUserId}`)
        .set("Cookie", nakesCookie)
        .send({ fullName: "Pasien Diperbarui", whatsappNumber: "081277778888" });

      expect(res.status).toBe(200);
      expect(res.body.fullName ?? res.body.name).toBe("Pasien Diperbarui");
      expect(res.body.facility).toBe("Puskesmas Menteng");

      // persisted
      const me = await request(app.getHttpServer())
        .get("/api/users/me")
        .set("Cookie", pasienCookie);
      expect(me.body.name).toBe("Pasien Diperbarui");
    });

    it("forbids NAKES from editing a PASIEN in another facility", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${outsiderPasienId}`)
        .set("Cookie", nakesCookie)
        .send({ fullName: "Illegal Edit" });

      expect(res.status).toBe(403);
    });

    it("forbids NAKES from editing another NAKES account", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${nakesUserId}`)
        .set("Cookie", nakesCookie)
        .send({ fullName: "Illegal Self Edit" });

      expect(res.status).toBe(403);
    });

    it("forbids NAKES from promoting a PASIEN to NAKES", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${pasienUserId}`)
        .set("Cookie", nakesCookie)
        .send({ role: "NAKES" });

      expect(res.status).toBe(403);
    });

    it("allows ADMIN to edit any user, including a NAKES", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${nakesUserId}`)
        .set("Cookie", adminCookie)
        .send({ fullName: "dr. Nakes Diperbarui" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("dr. Nakes Diperbarui");
    });

    it("forbids PASIEN from editing anyone", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${pasienUserId}`)
        .set("Cookie", pasienCookie)
        .send({ fullName: "Nope" });

      expect(res.status).toBe(403);
    });

    it("returns 404 for an unknown target user", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/users/00000000-0000-0000-0000-000000000000")
        .set("Cookie", adminCookie)
        .send({ fullName: "Ghost" });

      expect(res.status).toBe(404);
    });

    // Note: the e2e harness does not register the global StandardSchema pipe
    // (main.ts does), so body validation is covered by the schema itself.
  });

  describe("Hierarchical Password Reset", () => {
    it("forbids PASIEN from resetting NAKES password", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/users/${nakesUserId}/reset-password`)
        .set("Cookie", pasienCookie)
        .send({ newPassword: "hacked_password_123" });
      expect(res.status).toBe(403);
    });

    it("allows NAKES to reset PASIEN password in their facility", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/users/${pasienUserId}/reset-password`)
        .set("Cookie", nakesCookie)
        .send({ newPassword: "reset_by_nakes_123" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify PASIEN can login with newly reset password
      const loginCheck = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ identifier: pasienUsername, password: "reset_by_nakes_123" });
      expect(loginCheck.status).toBe(200);
    });

    it("forbids NAKES from resetting ADMIN password", async () => {
      // Find admin user ID
      const userRepo = dataSource.getRepository("users");
      const adminUser: any = await userRepo.findOneBy({ username: adminUsername });

      const res = await request(app.getHttpServer())
        .post(`/api/users/${adminUser.id}/reset-password`)
        .set("Cookie", nakesCookie)
        .send({ newPassword: "nakes_reset_admin_illegal" });
      expect(res.status).toBe(403);
    });

    it("allows ADMIN to reset ANY user password", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/users/${nakesUserId}/reset-password`)
        .set("Cookie", adminCookie)
        .send({ newPassword: "admin_reset_nakes_123" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify NAKES can login with newly reset password
      const loginCheck = await request(app.getHttpServer())
        .post("/api/auth/sign-in")
        .send({ email: `${nakesUsername}@users.tiby.internal`, password: "admin_reset_nakes_123" });
      expect(loginCheck.status).toBe(200);
    });
  });
});
