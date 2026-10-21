export interface FamilyContact {
  id: string;
  treatmentPlanId: string;
  fullName: string;
  whatsappNumber: string;
  whatsappVerified: boolean;
  notifyOnEscalation: boolean;
  createdAt: string;
}

export interface CreateFamilyContactPayload {
  fullName: string;
  whatsappNumber: string;
  notifyOnEscalation: boolean;
}
