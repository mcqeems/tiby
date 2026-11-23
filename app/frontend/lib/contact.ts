export interface ContactInfo {
  adminEmail: string;
  phoneDisplay: string;
  phoneHref: string;
  whatsappHref: string;
  operatingHours: string;
  location: string;
}

// TODO: Ganti informasi kontak boilerplate di bawah dengan kontak resmi admin Tiby.
export const CONTACT_INFO: ContactInfo = {
  adminEmail: "mcqeemsofficial@gmail.com",
  phoneDisplay: "+62 881-1558-295",
  phoneHref: "tel:+628811558295",
  whatsappHref: "https://wa.me/6281200000000",
  operatingHours: "Senin–Jumat, 08.00–17.00 WIB",
  location: "Yogyakarta, Indonesia",
};

export interface ContactFormData {
  name: string;
  facility: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/**
 * Build a mailto URL targeting the Tiby admin address.
 * Uses encodeURIComponent instead of URLSearchParams so spaces stay `%20`
 * across desktop mail clients rather than rendering as `+`.
 */
export function buildContactMailtoUrl(
  data: ContactFormData,
  recipientEmail = CONTACT_INFO.adminEmail,
): string {
  const name = data.name.trim();
  const facility = data.facility.trim();
  const email = data.email.trim();
  const phone = data.phone?.trim() ?? "";
  const rawSubject = data.subject.trim();
  const message = data.message.trim();

  const subject =
    rawSubject || `Permintaan Layanan Tiby — ${facility || name || "Faskes"}`;

  const lines = [
    `Nama: ${name}`,
    `Faskes / Instansi: ${facility}`,
    `Email: ${email}`,
  ];
  if (phone) {
    lines.push(`Telepon / WhatsApp: ${phone}`);
  }
  lines.push("", "Pesan:", message);

  const body = lines.join("\n");
  return `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
