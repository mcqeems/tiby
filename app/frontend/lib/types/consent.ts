export type ConsentScope =
  | "PATIENT_DATA_SHARE"
  | "PMO_STATUS_ONLY"
  | "STT_AUDIO_PROCESSING";

export interface ConsentStatus {
  active: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  scopes: ConsentScope[];
  mustConfirmConsent: boolean;
}
