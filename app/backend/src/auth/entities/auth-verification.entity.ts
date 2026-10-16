import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("verification")
export class AuthVerification {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ type: "text" })
  identifier: string;

  @Column({ type: "text" })
  value: string;

  @Column({ name: "expiresAt", type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
