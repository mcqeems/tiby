import { describe, it, expect, vi, afterEach } from "vitest";
import { WahaClientService } from "../src/modules/whatsapp/services/waha-client.service.js";

describe("WahaClientService.resolvePhoneNumber", () => {
  const service = new WahaClientService();

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WAHA_ENABLED;
  });

  it("returns a @c.us JID unchanged without calling WAHA", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(service.resolvePhoneNumber("6281234567890@c.us")).resolves.toBe(
      "6281234567890@c.us",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a @lid to its phone JID through WAHA's LIDs API", async () => {
    process.env.WAHA_ENABLED = "true";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lid: "255546879938701@lid", pn: "628811558295@c.us" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(service.resolvePhoneNumber("255546879938701@lid")).resolves.toBe(
      "628811558295@c.us",
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain("/lids/255546879938701");
  });

  it("returns null when WAHA does not know the LID", async () => {
    process.env.WAHA_ENABLED = "true";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ lid: "1@lid", pn: null }) }),
    );

    await expect(service.resolvePhoneNumber("1@lid")).resolves.toBeNull();
  });

  it("returns null when WAHA is disabled or the lookup fails", async () => {
    await expect(service.resolvePhoneNumber("1@lid")).resolves.toBeNull();

    process.env.WAHA_ENABLED = "true";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(service.resolvePhoneNumber("1@lid")).resolves.toBeNull();
  });
});
