export type {
  CreateOnboardingDto,
  OcrOnboardingDraft,
  OnboardingCredentials,
  PmoRelationship,
} from "@tiby/ts-shared";

import type { PmoRelationship } from "@tiby/ts-shared";

/**
 * What the onboarding form edits before it collapses into
 * `CreateOnboardingDto`. The contract narrows `pmo` to a union (an existing
 * user id, or a new account); a live form edits both shapes at once and picks
 * one at submit, so it needs its own type instead of a loosened contract.
 */
export interface OnboardingFormState {
  patient: {
    fullName: string;
    username: string;
    whatsappNumber: string;
  };
  pmo: {
    fullName: string;
    username: string;
    whatsappNumber: string;
    relationship: PmoRelationship;
  };
  familyContact?: {
    fullName: string;
    whatsappNumber: string;
    notifyOnEscalation: boolean;
  };
  regimenCode: string;
  dailyPillQuota: number;
  reminderTimeLocal: string;
  timezone: string;
  startDate: string;
}
