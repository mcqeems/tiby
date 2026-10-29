import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";

// 1x1 transparent PNG
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("Profile Picture Upload (e2e)", () => {
  let app: INestApplication;
  let pasienCookie: string[];
  const pasienUsername = `pp_pasien_${Date.now()}`;
  const defaultPw = "pwgampang_123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    await auth.api.createUser({
      body: {
        name: "PP Pasien",
        email: `${pasienUsername}@users.tiby.internal`,
        password: defaultPw,
        role: "PASIEN",
        data: {
          username: pasienUsername,
          displayUsername: pasienUsername,
          must_confirm_consent: false,
        },
      },
    });

    const login = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: pasienUsername, password: defaultPw });
    expect(login.status).toBe(200);
    pasienCookie = login.get("Set-Cookie")!;
  });

  afterAll(async () => {
    await app.close();
  });

  it("uploads a png and returns a public imageUrl (200)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users/me/profile-picture")
      .set("Cookie", pasienCookie)
      .attach("file", PNG_1PX, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toMatch(/^https?:\/\/.+\/profile-pictures\//);
  });

  it("rejects non-image files (400)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users/me/profile-picture")
      .set("Cookie", pasienCookie)
      .attach("file", Buffer.from("not an image"), {
        filename: "evil.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated upload (401)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users/me/profile-picture")
      .attach("file", PNG_1PX, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(401);
  });

  it("rejects missing file (400)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/users/me/profile-picture")
      .set("Cookie", pasienCookie);
    expect(res.status).toBe(400);
  });
});
