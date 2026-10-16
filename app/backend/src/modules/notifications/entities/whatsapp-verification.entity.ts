import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { FamilyContact } from "../../treatments/entities/family-contact.entity.js";
import { EncryptedColumnTransformer } from "../../../database/transformers/encrypted-column.transformer.js";

@Index("idx_whatsapp_verifications_pending", ["phoneHash", "verificationCode"], {
  where: "status = 'PENDING'",
})
@Entity("whatsapp_verifications")
export class WhatsappVerification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "varchar", length: 255, nullable: true })
  userId: string | null;

  @ManyToOne(() => AuthUser, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: AuthUser | null;

  @Column({ name: "family_contact_id", type: "uuid", nullable: true })
  familyContactId: string | null;

  @ManyToOne(() => FamilyContact, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "family_contact_id" })
  familyContact?: FamilyContact | null;

  @Column({ name: "target_role", type: "varchar", length: 50 })
  targetRole: string;

  @Column({
    name: "phone_encrypted",
    type: "text",
    transformer: new EncryptedColumnTransformer(),
  })
  phoneEncrypted: string;

  @Index("idx_whatsapp_verifications_phone_hash")
  @Column({ name: "phone_hash", type: "varchar", length: 64 })
  phoneHash: string;

  @Column({ name: "expected_chat_id", type: "varchar", length: 255 })
  expectedChatId: string;

  @Column({ name: "verification_code", type: "char", length: 6 })
  verificationCode: string;

  @Column({ type: "varchar", length: 50, default: "PENDING" })
  status: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
