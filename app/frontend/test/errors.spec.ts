import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/errors";

describe("errorMessage", () => {
  it("uses the thrown message when there is one", () => {
    expect(errorMessage(new Error("Nomor sudah dipakai"), "Gagal")).toBe(
      "Nomor sudah dipakai",
    );
  });

  it("falls back for non-Error throws", () => {
    expect(errorMessage("boom", "Gagal")).toBe("Gagal");
    expect(errorMessage(undefined, "Gagal")).toBe("Gagal");
    expect(errorMessage({ message: "plain object" }, "Gagal")).toBe("Gagal");
  });

  it("falls back on an empty message so the user never sees a blank notice", () => {
    expect(errorMessage(new Error(""), "Gagal")).toBe("Gagal");
  });
});
