import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { AuthUser } from "./auth-user.entity.js";

@Entity("session")
export class AuthSession {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ name: "expiresAt", type: "timestamptz" })
  expiresAt: Date;

  @Index("idx_session_token", { unique: true })
  @Column({ type: "varchar", length: 255, unique: true })
  token: string;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column({ name: "ipAddress", type: "text", nullable: true })
  ipAddress: string | null;

  @Column({ name: "userAgent", type: "text", nullable: true })
  userAgent: string | null;

  @Column({ name: "userId", type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: AuthUser;

  @Column({ name: "impersonatedBy", type: "text", nullable: true })
  impersonatedBy: string | null;
}
