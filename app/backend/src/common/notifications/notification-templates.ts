import {
  NotificationTriggerCircumstances,
  type NotificationSeverity,
  type NotificationTemplate,
  type NotificationTriggerCircumstance,
} from "@tiby/ts-shared";

/**
 * Single source of truth for outbound notification copy.
 *
 * The automatic dispatcher renders real events from here; the admin
 * simulation screen lists the same text as "Sistem" templates. Presets are
 * demo messages that have no trigger behind them.
 */

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
    circumstance === "DOSE_INCOMPLETE_NUDGE"
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
        body: custom || "Halo! Mari minum obat tepat waktu agar senantiasa sehat.",
      };
    case "DOSE_INCOMPLETE_NUDGE":
      return {
        title: "Catatan Pengingat dari Pandu",
        body: custom || "Pandu mengingatkan untuk melengkapi obat hari ini ya.",
      };
    case "RED_FLAG_ALERT":
      return {
        title: "Perhatian dari Pandu",
        body: custom || "Laporan kesehatan Anda memerlukan perhatian medis. Petugas faskes telah diberitahu.",
      };
    case "INTENT_TO_STOP_ALERT":
      return {
        title: "Pandu Siap Mendampingi",
        body: custom || "Jangan cemas, silakan konsultasikan kendala Anda dengan faskes terdekat.",
      };
    case "SILENCE_H1_ESCALATION":
    case "SILENCE_H1":
      return {
        title: "Pandu Kangen Kabarmu",
        body: custom || "Sudahkah minum obat hari ini? Luangkan waktu sebentar untuk check-in ya.",
      };
    case "SILENCE_H2_ESCALATION":
    case "SILENCE_H2":
      return {
        title: "Pengingat Pendamping Obat",
        body: custom || "Pasien belum melapor kemarin. Mohon bantu dampingi dan ingatkan minum obat hari ini.",
      };
    case "SILENCE_H3_ESCALATION":
    case "SILENCE_H3":
      return {
        title: "Pemberitahuan Pendamping Obat",
        body: custom || "Pasien belum melapor selama 3 hari berturut-turut. Tim faskes telah membuka tindak lanjut.",
      };
    case "WHATSAPP_VERIFIED_ACK":
      return {
        title: "WhatsApp Terhubung",
        body: custom || "Nomor WhatsApp Anda sudah terhubung dengan Pandu. Pandu siap mendampingi!",
      };
    default:
      return {
        title: "Pesan dari Pandu",
        body: custom || "Halo, ada pesan baru dari pendamping kesehatan Anda.",
      };
  }
}

/** Trigger circumstances an admin may preview; ADMIN_SIMULATION is a tag, not copy. */
const SIMULATABLE_CIRCUMSTANCES = NotificationTriggerCircumstances.filter(
  (circumstance) => circumstance !== "ADMIN_SIMULATION",
);

export const PRESET_NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  {
    key: "PRESET_TEST",
    source: "PRESET",
    title: "Pesan Uji Coba",
    body: "Halo! Ini pesan uji coba dari tim Tiby. Tidak ada tindakan yang perlu dilakukan.",
    severity: "INFO",
  },
  {
    key: "PRESET_CONTROL_DATE",
    source: "PRESET",
    title: "Pengingat Jadwal Kontrol",
    body: "Jangan lupa jadwal kontrol Anda di faskes minggu ini. Bawa kartu pengobatan dan catatan minum obat ya.",
    severity: "WARNING",
  },
  {
    key: "PRESET_APP_UPDATE",
    source: "PRESET",
    title: "Pembaruan Aplikasi Tiby",
    body: "Aplikasi Tiby akan diperbarui malam ini. Layanan check-in tetap tersedia seperti biasa.",
    severity: "INFO",
  },
];

export function listNotificationTemplates(): NotificationTemplate[] {
  const system = SIMULATABLE_CIRCUMSTANCES.map(
    (circumstance: NotificationTriggerCircumstance): NotificationTemplate => {
      const { title, body } = getMessageForCircumstance(circumstance);
      return {
        key: circumstance,
        source: "SYSTEM",
        title,
        body,
        severity: getSeverity(circumstance),
      };
    },
  );

  return [...system, ...PRESET_NOTIFICATION_TEMPLATES];
}
