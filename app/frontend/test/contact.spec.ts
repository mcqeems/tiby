import { describe, expect, it } from "vitest";
import { buildContactMailtoUrl, CONTACT_INFO } from "@/lib/contact";

describe("buildContactMailtoUrl", () => {
  it("targets the single Tiby admin email by default", () => {
    const url = buildContactMailtoUrl({
      name: "dr. Rini Suryani",
      facility: "Puskesmas Melati",
      email: "rini@puskesmas.go.id",
      subject: "Aktivasi layanan Tiby",
      message: "Kami ingin mendaftarkan 25 pasien baru.",
    });

    expect(url.startsWith(`mailto:${CONTACT_INFO.adminEmail}?`)).toBe(true);
    expect(url).not.toContain("+");
  });

  it("encodes spaces as %20 instead of + and includes optional phone when provided", () => {
    const url = buildContactMailtoUrl({
      name: "Budi Santoso",
      facility: "Klinik Sehat & Ceria",
      email: "budi@klinik.id",
      phone: "081234567890",
      subject: "Tanya aktivasi + onboarding",
      message: "Butuh info jadwal onboarding?",
    });

    const [prefix, query] = url.split("?");
    expect(prefix).toBe(`mailto:${CONTACT_INFO.adminEmail}`);
    expect(query).not.toContain("+");

    const params = new URLSearchParams(query);
    expect(params.get("subject")).toBe("Tanya aktivasi + onboarding");
    const body = params.get("body") ?? "";
    expect(body).toContain("Nama: Budi Santoso");
    expect(body).toContain("Faskes / Instansi: Klinik Sehat & Ceria");
    expect(body).toContain("Email: budi@klinik.id");
    expect(body).toContain("Telepon / WhatsApp: 081234567890");
    expect(body).toContain("Butuh info jadwal onboarding?");
  });

  it("omits blank phone line and falls back to default subject when blank", () => {
    const url = buildContactMailtoUrl({
      name: "Siti Aminah",
      facility: "RSUD Harapan",
      email: "siti@rsud.go.id",
      phone: "   ",
      subject: "   ",
      message: "Mohon informasi lebih lanjut.",
    });

    const query = url.split("?")[1] ?? "";
    const params = new URLSearchParams(query);
    expect(params.get("subject")).toBe("Permintaan Layanan Tiby — RSUD Harapan");
    const body = params.get("body") ?? "";
    expect(body).not.toContain("Telepon / WhatsApp:");
    expect(body).toContain("Mohon informasi lebih lanjut.");
  });
});
