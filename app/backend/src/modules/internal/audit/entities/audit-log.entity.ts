import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Index("idx_audit_logs_target", ["targetEntity", "targetId", "createdAt"])
@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "actor_user_id", type: "varchar", length: 255, nullable: true })
  actorUserId: string | null;

  @Column({ name: "actor_role", type: "varchar", length: 50, nullable: true })
  actorRole: string | null;

  @Column({ type: "varchar", length: 100 })
  action: string;

  @Column({ name: "target_entity", type: "varchar", length: 100 })
  targetEntity: string;

  @Column({ name: "target_id", type: "varchar", length: 255 })
  targetId: string;

  @Column({ name: "metadata_json", type: "jsonb", nullable: true })
  metadataJson: Record<string, unknown> | null;

  @Column({ name: "ip_address", type: "varchar", length: 50, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
