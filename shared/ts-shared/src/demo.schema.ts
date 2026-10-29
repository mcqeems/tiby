import { z } from "zod";

export const DemoRoleSchema = z.enum(["PASIEN", "PMO", "NAKES"]);
export type DemoRole = z.infer<typeof DemoRoleSchema>;

export const DemoLiveSessionSchema = z.object({
  /** Short display id; never the raw session id or a user name. */
  label: z.string(),
  startedAt: z.string(),
  expiresAt: z.string(),
  isMine: z.boolean(),
});
export type DemoLiveSession = z.infer<typeof DemoLiveSessionSchema>;

export const DemoStatusSchema = z.object({
  active: z.boolean(),
  expiresAt: z.string().nullable(),
  activeCount: z.number(),
  maxActive: z.number(),
  sessions: z.array(DemoLiveSessionSchema),
});
export type DemoStatus = z.infer<typeof DemoStatusSchema>;

export const DemoStartResponseSchema = z.object({
  expiresAt: z.string(),
});
export type DemoStartResponse = z.infer<typeof DemoStartResponseSchema>;

export const DemoEnterSchema = z.object({
  role: DemoRoleSchema,
});
export type DemoEnterDto = z.infer<typeof DemoEnterSchema>;

export const DemoEnterResponseSchema = z.object({
  role: DemoRoleSchema,
});
export type DemoEnterResponse = z.infer<typeof DemoEnterResponseSchema>;

export const DemoEndResponseSchema = z.object({
  ok: z.literal(true),
});
export type DemoEndResponse = z.infer<typeof DemoEndResponseSchema>;
