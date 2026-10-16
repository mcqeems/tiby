import type {
  NotificationTriggerCircumstance,
  RecipientRole,
} from "@tiby/ts-shared";

export class NotificationTriggerEvent {
  constructor(
    public readonly circumstance: NotificationTriggerCircumstance,
    public readonly treatmentPlanId: string,
    public readonly recipientRole: RecipientRole,
    public readonly recipientUserId?: string,
    public readonly recipientFamilyContactId?: string,
    public readonly customMessage?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
