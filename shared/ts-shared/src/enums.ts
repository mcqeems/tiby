import { z } from "zod";

// Roles & Actors
export const UserRoles = ["ADMIN", "NAKES", "PMO", "PASIEN"] as const;
export const UserRoleSchema = z.enum(UserRoles);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RecipientRoles = ["PASIEN", "PMO", "KELUARGA", "NAKES"] as const;
export const RecipientRoleSchema = z.enum(RecipientRoles);
export type RecipientRole = z.infer<typeof RecipientRoleSchema>;

export const PmoRelationships = ["KELUARGA", "KADER", "NAKES"] as const;
export const PmoRelationshipSchema = z.enum(PmoRelationships);
export type PmoRelationship = z.infer<typeof PmoRelationshipSchema>;

// Treatment Phases & Patient States
export const TreatmentPhases = ["INTENSIF", "LANJUTAN"] as const;
export const TreatmentPhaseSchema = z.enum(TreatmentPhases);
export type TreatmentPhase = z.infer<typeof TreatmentPhaseSchema>;

export const PatientStates = [
  "PENDING",
  "AKTIF",
  "BERISIKO",
  "PUTUS_FOLLOW_UP",
  "DIJEDA",
  "DIPANTAU_TERBATAS",
  "PINDAH_FASKES",
  "SELESAI",
] as const;
export const PatientStateSchema = z.enum(PatientStates);
export type PatientState = z.infer<typeof PatientStateSchema>;

// Check-In & Safety Rule Engine
export const CheckInInputModes = ["VOICE_STT", "FALLBACK_BUTTONS"] as const;
export const CheckInInputModeSchema = z.enum(CheckInInputModes);
export type CheckInInputMode = z.infer<typeof CheckInInputModeSchema>;

export const MedicationStatuses = ["SUDAH_MINUM", "BELUM_MINUM", "TIDAK_PASTI"] as const;
export const MedicationStatusSchema = z.enum(MedicationStatuses);
export type MedicationStatus = z.infer<typeof MedicationStatusSchema>;

export const SafetyVerdicts = ["TERKENDALI", "PERLU_PERHATIAN", "SEGERA_KE_FASKES"] as const;
export const SafetyVerdictSchema = z.enum(SafetyVerdicts);
export type SafetyVerdict = z.infer<typeof SafetyVerdictSchema>;

export const MinorSideEffects = [
  "URINE_MERAH",
  "MUAL_RINGAN",
  "NYERI_SENDI_RINGAN",
  "MENGANTUK_LEMAS",
] as const;
export const MinorSideEffectSchema = z.enum(MinorSideEffects);
export type MinorSideEffect = z.infer<typeof MinorSideEffectSchema>;

export const MajorRedFlags = [
  "BATUK_DARAH",
  "SESAK_NAPAS",
  "KUNING_IKTERIK",
  "MUNTAH_HEBAT",
  "GANGGUAN_PENGLIHATAN",
  "GANGGUAN_PENDENGARAN",
  "RUAM_KULIT_BERAT",
  "DEMAM_TINGGI_MENETAP",
] as const;
export const MajorRedFlagSchema = z.enum(MajorRedFlags);
export type MajorRedFlag = z.infer<typeof MajorRedFlagSchema>;

// Consent Scopes
export const ConsentScopes = [
  "PATIENT_DATA_SHARE",
  "PMO_STATUS_ONLY",
  "STT_AUDIO_PROCESSING",
] as const;
export const ConsentScopeSchema = z.enum(ConsentScopes);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

// Intervention Tickets & Facility Alerts
export const TicketTriggerSources = [
  "RED_FLAG",
  "INTENT_TO_STOP",
  "SILENCE_H3",
  "PMO_ESCALATION",
] as const;
export const TicketTriggerSourceSchema = z.enum(TicketTriggerSources);
export type TicketTriggerSource = z.infer<typeof TicketTriggerSourceSchema>;

export const TicketPriorities = ["HIGH", "CRITICAL"] as const;
export const TicketPrioritySchema = z.enum(TicketPriorities);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "RESOLVED_CLOSED",
  "AUTO_CLOSED_BY_CHECKIN",
] as const;
export const TicketStatusSchema = z.enum(TicketStatuses);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const FacilityAlertTypes = [
  "SILENCE_RECOVERED_WARNING",
  "DOSE_RETRY_WARNING",
  "CONSENT_REVOKED_WARNING",
  "STREAK_RESET_WARNING",
  "SILENCE_H3_WARNING",
] as const;
export const FacilityAlertTypeSchema = z.enum(FacilityAlertTypes);
export type FacilityAlertType = z.infer<typeof FacilityAlertTypeSchema>;

export const AlertSeverities = ["INFO", "WARNING", "HIGH"] as const;
export const AlertSeveritySchema = z.enum(AlertSeverities);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

// Longitudinal History Event Types
export const PatientStatusEventTypes = [
  "STATE_TRANSITION",
  "CHECK_IN_LOCKED",
  "CHECK_IN_INCOMPLETE_RETRY",
  "STREAK_RESET",
  "TICKET_OPENED",
  "TICKET_AUTO_CLOSED",
  "TICKET_RESOLVED",
  "CONSENT_CHANGED",
  "WHATSAPP_CONNECTED",
  "PUSH_SUBSCRIBED",
  "PMO_OUTREACH",
] as const;
export const PatientStatusEventTypeSchema = z.enum(PatientStatusEventTypes);
export type PatientStatusEventType = z.infer<typeof PatientStatusEventTypeSchema>;

// Outbound Notification Enums
export const NotificationChannels = ["WEB_PUSH", "WHATSAPP"] as const;
export const NotificationChannelSchema = z.enum(NotificationChannels);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationTriggerCircumstances = [
  "DAILY_REMINDER",
  "REMINDER_SCHEDULED",
  "DOSE_INCOMPLETE_NUDGE",
  "SILENCE_H1",
  "SILENCE_H2",
  "SILENCE_H3",
  "SILENCE_H1_ESCALATION",
  "SILENCE_H2_ESCALATION",
  "SILENCE_H3_ESCALATION",
  "RED_FLAG_ALERT",
  "INTENT_TO_STOP_ALERT",
  "WHATSAPP_VERIFIED_ACK",
] as const;
export const NotificationTriggerCircumstanceSchema = z.enum(NotificationTriggerCircumstances);
export type NotificationTriggerCircumstance = z.infer<typeof NotificationTriggerCircumstanceSchema>;

export const DeliveryStatuses = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "NO_SUBSCRIPTION",
  "SKIPPED_UNVERIFIED",
  "SKIPPED_WAHA_DISABLED",
  "EXPIRED_REMOVED",
  "FAILED",
] as const;
export const DeliveryStatusSchema = z.enum(DeliveryStatuses);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const WhatsappVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "EXPIRED",
  "REPLACED",
] as const;
export const WhatsappVerificationStatusSchema = z.enum(WhatsappVerificationStatuses);
export type WhatsappVerificationStatus = z.infer<typeof WhatsappVerificationStatusSchema>;

// PMO Follow-Up / Outreach Actions
export const PmoFollowUpActions = [
  "MENGHUBUNGI_PASIEN",           // Contacted patient directly (Phone/WhatsApp)
  "KUNJUNGAN_RUMAH",             // Visited patient's residence
  "MENGHUBUNGI_KELUARGA",         // Contacted family / household member
  "MENGANTAR_OBAT",              // Delivered medication directly to patient
  "EDUKASI_KONSULTASI",          // Provided motivational counseling / compliance education
  "MENGINGATKAN_JADWAL_KONTROL",  // Reminded about clinic checkup or lab refill schedule
  "KONSULTASI_FASKES",           // Consulted with Puskesmas / nurse regarding patient condition
  "PASIEN_TIDAK_DAPAT_DIHUBUNGI", // Attempted contact but patient unreachable
  "LAINNYA",                     // Other custom action (detailed in notes)
] as const;
export const PmoFollowUpActionSchema = z.enum(PmoFollowUpActions);
export type PmoFollowUpAction = z.infer<typeof PmoFollowUpActionSchema>;
