import {
  NotificationTriggerCircumstances,
  type NotificationSeverity,
  type NotificationTemplate,
  type NotificationTriggerCircumstance,
  type UserRole,
} from "@tiby/ts-shared";

/**
 * Single source of truth for outbound notification copy, formatting, stigma
 * sanitization, and push click targets.
 */

export function stripDiseaseStigma(text: string): string {
  return text
    .replace(/\b(anti-TB|TBC|Tuberkulosis|TB)\b/gi, "")
    .replace(/[^\S\r\n]{2,}/g, " ")
    .replace(/[^\S\r\n]+([.,!?;:])/g, "$1")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function formatWhatsappText(title: string, body: string): string {
  const cleanTitle = stripDiseaseStigma(title);
  const cleanBody = stripDiseaseStigma(body);
  return cleanTitle ? `*${cleanTitle}*\n\n${cleanBody}` : cleanBody;
}

export function getRoleHomeUrl(role: string): string {
  switch (role) {
    case "PASIEN":
      return "/pasien";
    case "PMO":
      return "/pmo";
    case "NAKES":
      return "/nakes";
    case "ADMIN":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export function getNotificationTargetUrl(
  circumstance: string,
  recipientRole: string,
  metadata?: Record<string, unknown> | null,
): string {
  if (recipientRole === "PASIEN") {
    switch (circumstance) {
      case "DAILY_REMINDER":
      case "REMINDER_SCHEDULED":
      case "DOSE_INCOMPLETE_NUDGE":
      case "SILENCE_H1_ESCALATION":
      case "SILENCE_H1":
        return "/pasien/check-in";
      case "WHATSAPP_VERIFIED_ACK":
        return "/pasien/profile";
      default:
        return "/pasien";
    }
  }

  if (recipientRole === "PMO") {
    if (circumstance === "MISSED_CHECKIN_REPORT") {
      const planId = metadata?.treatmentPlanId;
      const reportedDate = metadata?.reportedDate;
      if (typeof planId === "string" && typeof reportedDate === "string") {
        const qs = new URLSearchParams({
          patientId: planId,
          patientName:
            typeof metadata?.patientName === "string"
              ? metadata.patientName
              : "Pasien",
          date: reportedDate,
        });
        if (typeof metadata?.missedReportId === "string") {
          qs.set("missedReportId", metadata.missedReportId);
        }
        return `/pmo/check-in?${qs.toString()}`;
      }
      return "/pmo/pasien";
    }
    if (
      circumstance === "SILENCE_H2_ESCALATION" ||
      circumstance === "SILENCE_H2" ||
      circumstance === "SILENCE_H3_ESCALATION" ||
      circumstance === "SILENCE_H3" ||
      circumstance === "RED_FLAG_ALERT" ||
      circumstance === "INTENT_TO_STOP_ALERT"
    ) {
      return "/pmo/pasien";
    }
    if (circumstance === "WHATSAPP_VERIFIED_ACK") {
      return "/pmo/profile";
    }
    return "/pmo";
  }

  if (recipientRole === "NAKES") {
    if (
      circumstance === "RED_FLAG_ALERT" ||
      circumstance === "INTENT_TO_STOP_ALERT" ||
      circumstance === "SILENCE_H3_ESCALATION" ||
      circumstance === "SILENCE_H3"
    ) {
      return "/nakes/tiket";
    }
    if (circumstance === "WHATSAPP_VERIFIED_ACK") {
      return "/nakes/profile";
    }
    return "/nakes";
  }

  return getRoleHomeUrl(recipientRole);
}

export function getSeverity(circumstance: string): NotificationSeverity {
  if (
    circumstance === "RED_FLAG_ALERT" ||
    circumstance === "INTENT_TO_STOP_ALERT" ||
    circumstance === "SILENCE_H3" ||
    circumstance === "SILENCE_H3_ESCALATION" ||
    circumstance === "ADMIN_SIMULATION"
  ) {
    return "HIGH";
  }
  if (
    circumstance === "SILENCE_H2" ||
    circumstance === "SILENCE_H2_ESCALATION" ||
    circumstance === "DOSE_INCOMPLETE_NUDGE" ||
    circumstance === "MISSED_CHECKIN_REPORT"
  ) {
    return "WARNING";
  }
  return "INFO";
}

export function getMessageForCircumstance(
  circumstance: string,
  custom?: string,
): { title: string; body: string } {
  switch (circumstance) {
    case "DAILY_REMINDER":
    case "REMINDER_SCHEDULED":
      return {
        title: "Waktunya Minum Obat Bersama Pandu",
        body:
          custom ||
          "Halo! Jangan lupa minum obat tepat waktu hari ini dan laporkan check-in Anda bersama Pandu.",
      };
    case "DOSE_INCOMPLETE_NUDGE":
      return {
        title: "Catatan Pengingat dari Pandu",
        body:
          custom ||
          "Dosis hari ini belum lengkap. Silakan lengkapi minum obat Anda dan perbarui check-in sebelum tengah malam.",
      };
    case "RED_FLAG_ALERT":
      return {
        title: "Perhatian Medis Diperlukan",
        body:
          custom ||
          "Pasien dampingan Anda melaporkan kondisi yang memerlukan perhatian medis. Tim faskes telah diberitahu; mohon segera bantu pendampingan.",
      };
    case "INTENT_TO_STOP_ALERT":
      return {
        title: "Dukungan Kepatuhan Diperlukan",
        body:
          custom ||
          "Pasien dampingan Anda membutuhkan dukungan untuk melanjutkan jadwal minum obat. Mohon hubungi dan koordinasikan dengan faskes terdekat.",
      };
    case "SILENCE_H1_ESCALATION":
    case "SILENCE_H1":
      return {
        title: "Check-in Kemarin Terlewat",
        body:
          custom ||
          "Catatan check-in kemarin belum masuk sehingga streak Anda kembali ke 0. Jika sudah minum obat kemarin, Anda dapat melaporkannya ke PMO lewat notifikasi atau dashboard.",
      };
    case "SILENCE_H2_ESCALATION":
    case "SILENCE_H2":
      return {
        title: "Pengingat Pendamping Obat",
        body:
          custom ||
          "Pasien dampingan Anda belum melapor check-in kemarin. Mohon bantu ingatkan untuk minum obat dan check-in hari ini.",
      };
    case "SILENCE_H3_ESCALATION":
    case "SILENCE_H3":
      return {
        title: "Pemberitahuan Pendamping Obat",
        body:
          custom ||
          "Pasien dampingan Anda belum melapor selama 3 hari berturut-turut. Tim faskes telah membuka tindak lanjut.",
      };
    case "MISSED_CHECKIN_REPORT":
      return {
        title: "Laporan Lupa Check-in",
        body:
          custom ||
          "Pasien melaporkan sudah minum obat pada tanggal yang terlewat. Mohon verifikasi melalui Wakili Check-in.",
      };
    case "MISSED_CHECKIN_VERIFIED":
      return {
        title: "Laporan Lupa Check-in Terverifikasi",
        body:
          custom ||
          "PMO telah memverifikasi laporan minum obat Anda. Streak dan sisa hari telah diperbarui.",
      };
    case "WHATSAPP_VERIFIED_ACK":
      return {
        title: "WhatsApp Terhubung",
        body:
          custom ||
          "Nomor WhatsApp Anda sudah terhubung dengan Pandu. Pandu siap mendampingi perjalanan sehat Anda!",
      };
    default:
      return {
        title: "Pesan dari Pandu",
        body: custom || "Halo, ada pesan baru dari pendamping kesehatan Anda.",
      };
  }
}

/** Legacy aliases kept for historical rows; omitted from the admin picker. */
const LEGACY_DUPLICATE_CIRCUMSTANCES = new Set<string>([
  "REMINDER_SCHEDULED",
  "SILENCE_H1",
  "SILENCE_H2",
  "SILENCE_H3",
]);

const SYSTEM_TEMPLATE_AUDIENCE: Record<
  string,
  { audienceLabel: string; targetRoles: UserRole[] }
> = {
  DAILY_REMINDER: { audienceLabel: "Pasien", targetRoles: ["PASIEN"] },
  DOSE_INCOMPLETE_NUDGE: { audienceLabel: "Pasien", targetRoles: ["PASIEN"] },
  SILENCE_H1_ESCALATION: { audienceLabel: "Pasien", targetRoles: ["PASIEN"] },
  MISSED_CHECKIN_VERIFIED: { audienceLabel: "Pasien", targetRoles: ["PASIEN"] },
  MISSED_CHECKIN_REPORT: { audienceLabel: "PMO", targetRoles: ["PMO"] },
  SILENCE_H2_ESCALATION: {
    audienceLabel: "PMO & Keluarga",
    targetRoles: ["PMO"],
  },
  SILENCE_H3_ESCALATION: {
    audienceLabel: "PMO, Keluarga & Nakes",
    targetRoles: ["PMO", "NAKES"],
  },
  RED_FLAG_ALERT: {
    audienceLabel: "PMO, Keluarga & Nakes",
    targetRoles: ["PMO", "NAKES"],
  },
  INTENT_TO_STOP_ALERT: {
    audienceLabel: "PMO, Keluarga & Nakes",
    targetRoles: ["PMO", "NAKES"],
  },
  WHATSAPP_VERIFIED_ACK: {
    audienceLabel: "Semua Peran",
    targetRoles: ["PASIEN", "PMO", "NAKES"],
  },
};

/** Trigger circumstances an admin may preview; excludes ADMIN_SIMULATION & legacy aliases. */
const SIMULATABLE_CIRCUMSTANCES = NotificationTriggerCircumstances.filter(
  (circumstance) =>
    circumstance !== "ADMIN_SIMULATION" &&
    !LEGACY_DUPLICATE_CIRCUMSTANCES.has(circumstance),
);

export const PRESET_NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  {
    key: "PRESET_TEST",
    source: "PRESET",
    title: "Pesan Uji Coba",
    body: "Halo! Ini pesan uji coba dari tim Tiby. Tidak ada tindakan yang perlu dilakukan.",
    severity: "INFO",
    audienceLabel: "Semua Peran",
    targetRoles: ["PASIEN", "PMO", "NAKES"],
  },
  {
    key: "PRESET_CONTROL_DATE",
    source: "PRESET",
    title: "Pengingat Jadwal Kontrol",
    body: "Jangan lupa jadwal kontrol Anda di faskes minggu ini. Bawa kartu pengobatan dan catatan minum obat ya.",
    severity: "WARNING",
    audienceLabel: "Pasien & PMO",
    targetRoles: ["PASIEN", "PMO"],
  },
  {
    key: "PRESET_APP_UPDATE",
    source: "PRESET",
    title: "Pembaruan Aplikasi Tiby",
    body: "Aplikasi Tiby akan diperbarui malam ini. Layanan check-in tetap tersedia seperti biasa.",
    severity: "INFO",
    audienceLabel: "Semua Peran",
    targetRoles: ["PASIEN", "PMO", "NAKES"],
  },
  {
    key: "PRESET_NAKES_STREAK_RESET",
    source: "PRESET",
    title: "Streak Minum Obat Terputus",
    body: "Pasien belum mencatat check-in sebelum batas tengah malam. Streak terputus dan kembali ke 0.",
    severity: "WARNING",
    audienceLabel: "Nakes / Faskes",
    targetRoles: ["NAKES"],
  },
  {
    key: "PRESET_NAKES_SILENCE_H3",
    source: "PRESET",
    title: "Pasien Putus Kontak H+3",
    body: "Pasien belum melapor selama 3 hari berturut-turut. Segera lakukan tindak lanjut lapangan.",
    severity: "HIGH",
    audienceLabel: "Nakes / Faskes",
    targetRoles: ["NAKES"],
  },
  {
    key: "PRESET_NAKES_RED_FLAG",
    source: "PRESET",
    title: "Perhatian Medis Pasien",
    body: "Pasien melaporkan kondisi yang memerlukan perhatian medis segera. Tiket tindak lanjut telah dibuka.",
    severity: "HIGH",
    audienceLabel: "Nakes / Faskes",
    targetRoles: ["NAKES"],
  },
  {
    key: "PRESET_NAKES_CONSENT_REVOKED",
    source: "PRESET",
    title: "Persetujuan Pasien Dicabut",
    body: "Pasien mencabut persetujuan berbagi data klinis.",
    severity: "HIGH",
    audienceLabel: "Nakes / Faskes",
    targetRoles: ["NAKES"],
  },
];

export function listNotificationTemplates(): NotificationTemplate[] {
  const system = SIMULATABLE_CIRCUMSTANCES.map(
    (circumstance: NotificationTriggerCircumstance): NotificationTemplate => {
      const { title, body } = getMessageForCircumstance(circumstance);
      const audience = SYSTEM_TEMPLATE_AUDIENCE[circumstance];
      return {
        key: circumstance,
        source: "SYSTEM",
        title,
        body,
        severity: getSeverity(circumstance),
        audienceLabel: audience?.audienceLabel,
        targetRoles: audience?.targetRoles,
      };
    },
  );

  return [...system, ...PRESET_NOTIFICATION_TEMPLATES];
}
