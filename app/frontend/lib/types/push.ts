export interface VapidPublicKeyResponse {
  publicKey: string;
}

// Menggunakan tipe bawaan dari browser API untuk subscription
export type PushSubscriptionPayload = PushSubscriptionJSON;

export interface SendPushPayload {
  targetUserId: string;
  title: string;
  body: string;
  url: string;
  data?: Record<string, unknown>;
}
