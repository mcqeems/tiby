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

@Entity("account")
export class AuthAccount {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ name: "accountId", type: "text" })
  accountId: string;

  @Column({ name: "providerId", type: "text" })
  providerId: string;

  @Index("idx_account_user_id")
  @Column({ name: "userId", type: "varchar", length: 255 })
  userId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: AuthUser;

  @Column({ name: "accessToken", type: "text", nullable: true })
  accessToken: string | null;

  @Column({ name: "refreshToken", type: "text", nullable: true })
  refreshToken: string | null;

  @Column({ name: "idToken", type: "text", nullable: true })
  idToken: string | null;

  @Column({ name: "accessTokenExpiresAt", type: "timestamptz", nullable: true })
  accessTokenExpiresAt: Date | null;

  @Column({ name: "refreshTokenExpiresAt", type: "timestamptz", nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column({ type: "text", nullable: true })
  scope: string | null;

  @Column({ type: "text", nullable: true })
  password: string | null;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
