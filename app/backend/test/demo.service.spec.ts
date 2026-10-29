import { describe, it, expect, beforeEach, vi } from "vitest";
import { DemoService } from "../src/modules/demo/services/demo.service.js";
import { auth } from "../src/auth/auth.config.js";

function mockRepo(extra: Record<string, unknown> = {}) {
  return {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockResolvedValue([]),
    save: vi.fn((data: unknown) => Promise.resolve(data)),
    create: vi.fn((data: unknown) => data),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
    ...extra,
  };
}

describe("DemoService Unit Tests", () => {
  let service: DemoService;
  let demoRepo: any;
  let userRepo: any;
  let facilityRepo: any;
  let planRepo: any;
  let pmoRepo: any;
  let checkInRepo: any;
  let consentRepo: any;
  let notificationRepo: any;
  let auditRepo: any;

  beforeEach(() => {
    demoRepo = mockRepo();
    userRepo = mockRepo();
    facilityRepo = mockRepo();
    planRepo = mockRepo();
    pmoRepo = mockRepo();
    checkInRepo = mockRepo();
    consentRepo = mockRepo();
    notificationRepo = mockRepo();
    auditRepo = mockRepo();
    service = new DemoService(
      demoRepo,
      userRepo,
      facilityRepo,
      planRepo,
      pmoRepo,
      checkInRepo,
      consentRepo,
      notificationRepo,
      auditRepo,
    );
    vi.restoreAllMocks();
  });

  it("creates a demo with 5 users, 3 plans, consent and history for extras", async () => {
    const ids = ["pasien", "pmo", "nakes", "pasien2", "pasien3"];
    let call = 0;
    vi.spyOn(auth.api, "createUser").mockImplementation(
      (async () => ({ user: { id: `u-${ids[call++]}` } })) as never,
    );
    facilityRepo.save.mockImplementation(async (f: any) => ({
      ...f,
      id: "fac-1",
    }));
    demoRepo.save.mockImplementation(async (d: any) => ({
      ...d,
      id: "demo-1",
    }));

    const res = await service.create("127.0.0.1");

    expect(res.expiresAt).toBeTruthy();
    expect(res.token).toHaveLength(64);
    expect(auth.api.createUser).toHaveBeenCalledTimes(5);
    expect(planRepo.save).toHaveBeenCalledTimes(3);
    expect(pmoRepo.save).toHaveBeenCalledTimes(3);
    // Consent + 4 check-ins each for the two extra patients only.
    expect(consentRepo.save).toHaveBeenCalledTimes(6);
    expect(checkInRepo.save).toHaveBeenCalledTimes(8);

    const primaryUser = (auth.api.createUser as any).mock.calls[0][0];
    expect(primaryUser.body.data.must_confirm_consent).toBe(true);
    const extraUser = (auth.api.createUser as any).mock.calls[3][0];
    expect(extraUser.body.data.must_confirm_consent).toBe(false);
  });

  it("rejects enter when the demo token is missing", async () => {
    const err = await service
      .enter(null, "PASIEN", {})
      .catch((e: any) => e.response);
    expect(err.code).toBe("DEMO_EXPIRED");
  });

  it("deletes facility-bound rows for expired demos only", async () => {
    demoRepo.find.mockResolvedValue([
      { id: "demo-old", facilityId: "fac-old", expiresAt: new Date(0) },
    ]);
    userRepo.find.mockImplementation(async (opts: any) => {
      if (opts.where.facilityId) return [{ id: "u-1" }];
      if (opts.where.demoSessionId) return [{ id: "u-1" }];
      return [];
    });
    planRepo.find.mockResolvedValue([{ id: "plan-1" }]);

    const res = await service.cleanupExpired();

    expect(res.cleaned).toBe(1);
    expect(notificationRepo.delete).toHaveBeenCalledWith({
      recipientUserId: expect.anything(),
    });
    expect(planRepo.delete).toHaveBeenCalledWith({ facilityId: "fac-old" });
    expect(userRepo.delete).toHaveBeenCalledWith({ facilityId: "fac-old" });
    expect(facilityRepo.delete).toHaveBeenCalledWith({ id: "fac-old" });
    expect(demoRepo.delete).toHaveBeenCalledWith({ id: "demo-old" });
  });

  it("keeps unexpired demos", async () => {
    demoRepo.find.mockResolvedValue([]);
    const res = await service.cleanupExpired();
    expect(res.cleaned).toBe(0);
    expect(demoRepo.delete).not.toHaveBeenCalled();
  });

  it("rate-limits demo starts per IP", async () => {
    vi.spyOn(auth.api, "createUser").mockImplementation(
      (async () => ({ user: { id: "u-x" } })) as never,
    );
    facilityRepo.save.mockImplementation(async (f: any) => ({
      ...f,
      id: "fac-x",
    }));
    demoRepo.save.mockImplementation(async (d: any) => ({ ...d, id: "demo-x" }));

    for (let i = 0; i < 5; i++) {
      await service.create("10.0.0.1");
      vi.clearAllMocks();
    }
    const err = await service
      .create("10.0.0.1")
      .catch((e: any) => e.response);
    expect(err.code).toBe("DEMO_LIMIT");
  });
});
