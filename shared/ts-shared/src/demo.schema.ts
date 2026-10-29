import { z } from "zod";

export const DemoRoleSchema = z.enum(["PASIEN", "PMO", "NAKES"]);
export type DemoRole = z.infer<typeof DemoRoleSchema>;

export const DemoStatusSchema = z.object({
  active: z.boolean(),
  expiresAt: z.string().nullable(),
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
