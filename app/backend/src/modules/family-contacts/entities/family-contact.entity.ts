import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { EncryptedColumnTransformer } from "../../../database/transformers/encrypted-column.transformer.js";

@Entity("family_contacts")
export class FamilyContact {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_family_contacts_treatment_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "added_by_user_id", type: "varchar", length: 255 })
  addedByUserId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "added_by_user_id" })
  addedByUser: AuthUser;

  @Column({
    name: "name_encrypted",
    type: "text",
    transformer: new EncryptedColumnTransformer(),
  })
  nameEncrypted: string;

  @Column({
    name: "whatsapp_encrypted",
    type: "text",
    transformer: new EncryptedColumnTransformer(),
  })
  whatsappEncrypted: string;

  @Index("idx_family_contacts_whatsapp_hash")
  @Column({ name: "whatsapp_hash", type: "varchar", length: 64 })
  whatsappHash: string;

  @Column({ name: "whatsapp_verified", type: "boolean", default: false })
  whatsappVerified: boolean;

  @Column({ name: "whatsapp_chat_id", type: "varchar", length: 255, nullable: true })
  whatsappChatId: string | null;

  @Column({ name: "whatsapp_verified_at", type: "timestamptz", nullable: true })
  whatsappVerifiedAt: Date | null;

  @Column({ name: "notify_on_escalation", type: "boolean", default: true })
  notifyOnEscalation: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
