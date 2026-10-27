import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ServiceUnavailableException } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect, vi } from "vitest";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { auth } from "../src/auth/auth.config.js";
import { Facility } from "../src/modules/facilities/entities/facilities.entity.js";
import { AiClientService } from "../src/modules/internal/ai-client/ai-client.service.js";

describe("Guidance bridge (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let pasienCookie: string[];
  let pasienUserId: string;
  let facilityId: string;

  const ts = Date.now();
  const pw = "pwguidance_123";

  const answer = {
    answer: "Ya, mual ringan termasuk efek samping umum OAT.",
    grounded: true,
    evidence: [{ citation_id: "src-1", text: "Mual ringan..." }],
    citations: [
      {
        citation_id: "src-1",
        document_id: "kemenkes-juknis-tb-so-2025",
        organization: "Kemenkes",
        title: "Juknis TB SO",
        year: 2025,
        page: 116,
        section: null,
        source_url: "https://example.test/juknis.pdf",
      },
    ],
    limitations: [],
  };

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
        code: `FASKES-GUIDANCE-${ts}`,
        name: "Puskesmas Guidance",
        district: "Jakarta Pusat",
        emergencyPhone: "021-333",
      }),
    );
    facilityId = facility.id;

    const created = await auth.api.createUser({
      body: {
        name: "guidance pasien",
        email: `guidance_pasien_${ts}@users.tiby.internal`,
        password: pw,
        role: "PASIEN",
        data: {
          username: `guidance_pasien_${ts}`,
          displayUsername: `guidance_pasien_${ts}`,
          facility_id: facilityId,
          must_confirm_consent: false,
        },
      },
    });
    pasienUserId = created.user.id;

    const login = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ username: `guidance_pasien_${ts}`, password: pw });

    expect(login.status).toBe(200);
    pasienCookie = login.get("Set-Cookie")!;
  });

  afterAll(async () => {
    if (dataSource) {
      if (pasienUserId) await dataSource.getRepository("users").delete({ id: pasienUserId });
      await dataSource.getRepository(Facility).delete({ id: facilityId });
    }
    await app.close();
  });

  it("1. requires authentication", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/guidance")
      .send({ question: "Apakah mual itu wajar?" });

    expect(res.status).toBe(401);
  });

  it("2. forwards the question and transcript to the AI service", async () => {
    const aiClient = app.get(AiClientService);
    const spy = vi.spyOn(aiClient, "askGuidance").mockResolvedValue(answer);

    const res = await request(app.getHttpServer())
      .post("/api/guidance")
      .set("Cookie", pasienCookie)
      .send({ question: "Apakah mual itu wajar?", transcript: "Saya mual sejak pagi." });

    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledWith(
      "Apakah mual itu wajar?",
      "Saya mual sejak pagi.",
    );
    expect(res.body.grounded).toBe(true);
    expect(res.body.citations[0].citation_id).toBe("src-1");
  });

  it("3. a fail-closed answer passes through with HTTP 200", async () => {
    vi.spyOn(app.get(AiClientService), "askGuidance").mockResolvedValue({
      answer: null,
      grounded: false,
      evidence: [],
      citations: [],
      limitations: ["Silakan hubungi tenaga kesehatan yang menangani Anda."],
    });

    const res = await request(app.getHttpServer())
      .post("/api/guidance")
      .set("Cookie", pasienCookie)
      .send({ question: "Berapa dosis saya?" });

    expect(res.status).toBe(201);
    expect(res.body.answer).toBeNull();
    expect(res.body.limitations).toHaveLength(1);
  });

  it("4. an unavailable provider returns 503 and never a fabricated answer", async () => {
    vi.spyOn(app.get(AiClientService), "askGuidance").mockRejectedValue(
      new ServiceUnavailableException({
        code: "INTERNAL",
        message: "Guidance service is unavailable. Please try again later.",
      }),
    );

    const res = await request(app.getHttpServer())
      .post("/api/guidance")
      .set("Cookie", pasienCookie)
      .send({ question: "Apakah mual itu wajar?" });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("INTERNAL");
    expect(res.body.answer).toBeUndefined();
  });
});
