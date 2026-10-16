import { z } from "zod";

export const WhatsappConnectRequestSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  familyContactId: z.string().uuid().optional(),
});
export type WhatsappConnectRequest = z.infer<typeof WhatsappConnectRequestSchema>;

export const WhatsappConnectChallengeSchema = z.object({
  verificationCode: z.string().length(6),
  botPhoneNumber: z.string(),
  wahaDeepLink: z.string(),
  expiresAt: z.string(),
});
export type WhatsappConnectChallenge = z.infer<typeof WhatsappConnectChallengeSchema>;

export const WhatsappStatusQuerySchema = z.object({
  familyContactId: z.string().uuid().optional(),
});
export type WhatsappStatusQuery = z.infer<typeof WhatsappStatusQuerySchema>;

export const WhatsappConnectionStatusSchema = z.object({
  verified: z.boolean(),
  phoneNumber: z.string().nullable(),
  pendingCode: z.string().nullable(),
  expiresAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});
export type WhatsappConnectionStatus = z.infer<typeof WhatsappConnectionStatusSchema>;

export const WahaWebhookPayloadSchema = z.object({
  event: z.string(),
  session: z.string().optional(),
  payload: z.object({
    id: z.string().optional(),
    from: z.string(),
    to: z.string().optional(),
    body: z.string(),
    fromMe: z.boolean().optional(),
    timestamp: z.number().optional(),
  }),
});
export type WahaWebhookPayload = z.infer<typeof WahaWebhookPayloadSchema>;
