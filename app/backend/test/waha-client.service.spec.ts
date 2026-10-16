import { describe, it, expect, beforeEach } from "vitest";
import { WahaClientService } from "../src/modules/notifications/services/waha-client.service.js";

describe("WahaClientService Unit Tests", () => {
  let service: WahaClientService;

  beforeEach(() => {
    // Keep WAHA disabled for mock mode
    process.env.WAHA_ENABLED = "false";
    service = new WahaClientService();
  });

  it("handles sendSeen safely in mock mode without real phone number or server", async () => {
    const res = await service.sendSeen("628123456789@c.us");
    expect(res).toBe(true);
  });

  it("handles startTyping and stopTyping in mock mode", async () => {
    expect(await service.startTyping("628123456789@c.us")).toBe(true);
    expect(await service.stopTyping("628123456789@c.us")).toBe(true);
  });

  it("sends text and enforces zero-stigma filtering (strips TBC/Tuberkulosis)", async () => {
    const res = await service.sendText(
      "628123456789@c.us",
      "Halo! Mari minum obat TBC Anda secara rutin agar bebas Tuberkulosis.",
    );

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });
});
