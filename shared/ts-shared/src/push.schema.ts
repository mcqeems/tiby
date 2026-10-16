import { z } from "zod";

export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});
export type PushSubscriptionKeys = z.infer<typeof PushSubscriptionKeysSchema>;

export const PushSubscriptionPayloadSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional().default(null),
  keys: PushSubscriptionKeysSchema,
});
export type PushSubscriptionPayload = z.infer<typeof PushSubscriptionPayloadSchema>;

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
export type PushUnsubscribeDto = z.infer<typeof PushUnsubscribeSchema>;

export const VapidPublicKeyResponseSchema = z.object({
  publicKey: z.string().min(1),
});
export type VapidPublicKeyResponse = z.infer<typeof VapidPublicKeyResponseSchema>;

export const PushSubscriptionStatusSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  subscribed: z.boolean(),
});
export type PushSubscriptionStatus = z.infer<typeof PushSubscriptionStatusSchema>;
