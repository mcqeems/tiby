import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("user_notifications")
@Index("idx_user_notifications_recipient", [
  "recipientUserId",
  "isRead",
  "createdAt",
])
export class UserNotification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "recipient_user_id", type: "varchar", length: 255 })
  recipientUserId: string;

  @Column({ name: "treatment_plan_id", type: "uuid", nullable: true })
  treatmentPlanId: string | null;

  @Column({ name: "notification_type", type: "varchar", length: 50 })
  type: string;

  @Column({ type: "varchar", length: 20, default: "INFO" })
  severity: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead: boolean;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;
}
