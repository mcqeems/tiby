import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "../../treatments/entities/treatment-plan.entity.js";

@Entity("notification_logs")
export class NotificationLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_notification_logs_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "recipient_user_id", type: "varchar", length: 255, nullable: true })
  recipientUserId: string | null;

  @Column({ name: "recipient_family_contact_id", type: "uuid", nullable: true })
  recipientFamilyContactId: string | null;

  @Column({ name: "recipient_role", type: "varchar", length: 50 })
  recipientRole: string;

  @Column({ type: "varchar", length: 50 })
  channel: string;

  @Column({ name: "target_address", type: "text", nullable: true })
  targetAddress: string | null;

  @Column({ name: "trigger_circumstance", type: "varchar", length: 50 })
  triggerCircumstance: string;

  @Column({ name: "delivery_status", type: "varchar", length: 50 })
  deliveryStatus: string;

  @Column({ name: "external_message_id", type: "varchar", length: 255, nullable: true })
  externalMessageId: string | null;

  @CreateDateColumn({ name: "sent_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  sentAt: Date;
}
