import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "../src/modules/internal/audit/audit.service.js";

describe("AuditService Unit Tests", () => {
  let service: AuditService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn((data) => ({ id: "audit-uuid", ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    service = new AuditService(mockRepo);
  });

  it("creates and saves an immutable audit log entry for UU PDP compliance", async () => {
    const res = await service.log({
      actorUserId: "user-123",
      actorRole: "PMO",
      action: "POST /api/check-ins",
      targetEntity: "daily_check_ins",
      targetId: "checkin-uuid",
      metadataJson: { isDoseFulfilled: true },
      ipAddress: "127.0.0.1",
    });

    expect(mockRepo.create).toHaveBeenCalledWith({
      actorUserId: "user-123",
      actorRole: "PMO",
      action: "POST /api/check-ins",
      targetEntity: "daily_check_ins",
      targetId: "checkin-uuid",
      metadataJson: { isDoseFulfilled: true },
      ipAddress: "127.0.0.1",
    });
    expect(res.action).toBe("POST /api/check-ins");
  });
});
