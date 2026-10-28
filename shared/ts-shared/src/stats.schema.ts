import { z } from "zod";
import { SafetyVerdicts, TreatmentPhaseSchema } from "./enums.js";

/** Today's report can also simply be missing. */
export const TodayCheckInStatuses = ["BELUM_CHECK_IN", ...SafetyVerdicts] as const;
export const TodayCheckInStatusSchema = z.enum(TodayCheckInStatuses);
export type TodayCheckInStatus = z.infer<typeof TodayCheckInStatusSchema>;

export const CareTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  isPrimary: z.boolean(),
  /** PMO only, e.g. ISTRI / ORANG_TUA. */
  relationship: z.string().nullable().optional(),
});
export type CareTeamMember = z.infer<typeof CareTeamMemberSchema>;

export const PatientCareTeamSchema = z.object({
  facility: z
    .object({
      id: z.uuid(),
      name: z.string(),
      district: z.string().nullable(),
    })
    .nullable(),
  pmo: z.array(CareTeamMemberSchema),
  nakes: z.array(CareTeamMemberSchema),
});
export type PatientCareTeam = z.infer<typeof PatientCareTeamSchema>;

export const PasienStatsSchema = z.object({
  role: z.literal("PASIEN"),
  currentStreak: z.number().int().nonnegative(),
  /** 0..1 across the days elapsed since treatment start. */
  adherenceRate: z.number().min(0).max(1),
  daysRemaining: z.number().int().nonnegative(),
  todayCheckInStatus: TodayCheckInStatusSchema,
  totalPillsTaken: z.number().int().nonnegative(),
  currentPhase: TreatmentPhaseSchema.nullable(),
  careTeam: PatientCareTeamSchema,
});
export type PasienStats = z.infer<typeof PasienStatsSchema>;

export const PmoStatsSchema = z.object({
  role: z.literal("PMO"),
  totalPatients: z.number().int().nonnegative(),
  checkedInToday: z.number().int().nonnegative(),
  pendingCheckIn: z.number().int().nonnegative(),
  highRiskPatients: z.number().int().nonnegative(),
  unreadAlerts: z.number().int().nonnegative(),
});
export type PmoStats = z.infer<typeof PmoStatsSchema>;

export const NakesStatsSchema = z.object({
  role: z.literal("NAKES"),
  totalPatients: z.number().int().nonnegative(),
  highRiskPatients: z.number().int().nonnegative(),
  openTickets: z.number().int().nonnegative(),
  criticalTickets: z.number().int().nonnegative(),
  unreadAlerts: z.number().int().nonnegative(),
  /** Weighted across the facility's active plans: Σfulfilled / Σelapsed. */
  adherenceRate: z.number().min(0).max(1),
});
export type NakesStats = z.infer<typeof NakesStatsSchema>;

export const AdminStatsSchema = z.object({
  role: z.literal("ADMIN"),
  totalFacilities: z.number().int().nonnegative(),
  totalNakes: z.number().int().nonnegative(),
  totalPatients: z.number().int().nonnegative(),
  totalActiveTickets: z.number().int().nonnegative(),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

/**
 * One dashboard endpoint, four shapes. The discriminated union keeps the
 * frontend from defending against fields its role can never receive.
 */
export const StatsResponseSchema = z.discriminatedUnion("role", [
  PasienStatsSchema,
  PmoStatsSchema,
  NakesStatsSchema,
  AdminStatsSchema,
]);
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
