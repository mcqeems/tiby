export interface WhatsappConnectPayload {
  phoneNumber: string;
  familyContactId?: string;
}

export interface WhatsappStatusResponse {
  connected: boolean;
  phoneNumber?: string;
  status?: string;
}
