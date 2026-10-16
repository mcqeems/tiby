import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Entity("push_subscriptions")
export class PushSubscription {
  @PrimaryColumn({ type: "varchar", length: 255, default: () => "gen_random_uuid()" })
  id: string;

  @Index("idx_push_subscriptions_user_id")
  @Column({ name: "user_id", type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => AuthUser, (user) => user.pushSubscriptions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: AuthUser;

  @Column({ type: "text", unique: true })
  endpoint: string;

  @Column({ type: "text" })
  p256dh: string;

  @Column({ type: "text" })
  auth: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
