import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from "typeorm";

@Unique("uq_demo_sessions_token_hash", ["tokenHash"])
@Entity("demo_sessions")
export class DemoSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash: string;

  // Random per-demo credential, used by /enter; never returned to the browser.
  @Column({ name: "password_encrypted", type: "text" })
  passwordEncrypted: string;

  @Column({ name: "facility_id", type: "uuid" })
  facilityId: string;

  @Column({ name: "patient_user_id", type: "varchar", length: 255 })
  patientUserId: string;

  @Column({ name: "pmo_user_id", type: "varchar", length: 255 })
  pmoUserId: string;

  @Column({ name: "nakes_user_id", type: "varchar", length: 255 })
  nakesUserId: string;

  @Index("idx_demo_sessions_expires_at")
  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
