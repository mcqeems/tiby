import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { EncryptedColumnTransformer } from "../../database/transformers/encrypted-column.transformer.js";
import type { PushSubscription } from "../../modules/push/entities/push-subscription.entity.js";
import { Facility } from "../../modules/facilities/entities/facilities.entity.js";

@Entity("users")
export class AuthUser {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  username: string | null;

  @Column({ name: "displayUsername", type: "varchar", length: 255, nullable: true })
  displayUsername: string | null;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ name: "emailVerified", type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ type: "text", nullable: true })
  image: string | null;

  @Column({ type: "varchar", length: 50, default: "PASIEN" })
  role: string;

  @Column({ type: "boolean", default: false })
  banned: boolean;

  @Column({ name: "banReason", type: "text", nullable: true })
  banReason: string | null;

  @Column({ name: "banExpires", type: "timestamptz", nullable: true })
  banExpires: Date | null;

  @Column({ name: "facility_id", type: "uuid", nullable: true })
  facilityId: string | null;

  @ManyToOne(() => Facility, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "facility_id" })
  facility?: Facility | null;

  @Column({
    name: "full_name_encrypted",
    type: "text",
    nullable: true,
    transformer: new EncryptedColumnTransformer(),
  })
  fullNameEncrypted: string | null;

  @Column({
    name: "whatsapp_encrypted",
    type: "text",
    nullable: true,
    transformer: new EncryptedColumnTransformer(),
  })
  whatsappEncrypted: string | null;

  @Index("idx_users_whatsapp_hash")
  @Column({ name: "whatsapp_hash", type: "varchar", length: 64, nullable: true })
  whatsappHash: string | null;

  @Column({ name: "whatsapp_verified", type: "boolean", default: false })
  whatsappVerified: boolean;

  @Column({ name: "whatsapp_chat_id", type: "varchar", length: 255, nullable: true })
  whatsappChatId: string | null;

  @Column({ name: "whatsapp_verified_at", type: "timestamptz", nullable: true })
  whatsappVerifiedAt: Date | null;

  @Column({ name: "must_confirm_consent", type: "boolean", default: true })
  mustConfirmConsent: boolean;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @OneToMany("PushSubscription", (sub: PushSubscription) => sub.user)
  pushSubscriptions: PushSubscription[];
}
