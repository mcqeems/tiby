import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Unique("uq_consent_records_user_scope", ["userId", "scope"])
@Entity("consent_records")
export class ConsentRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_consent_records_user_id")
  @Column({ name: "user_id", type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: AuthUser;

  @Column({ name: "consent_version", type: "varchar", length: 50, default: "1.0" })
  consentVersion: string;

  @Column({ type: "varchar", length: 50 })
  scope: string;

  @CreateDateColumn({ name: "granted_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  grantedAt: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ name: "ip_address", type: "varchar", length: 50, nullable: true })
  ipAddress: string | null;
}
