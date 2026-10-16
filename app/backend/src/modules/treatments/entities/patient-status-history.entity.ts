import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "./treatment-plan.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Index("idx_patient_status_history_timeline", ["treatmentPlanId", "createdAt"])
@Entity("patient_status_history")
export class PatientStatusHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_patient_status_history_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "event_type", type: "varchar", length: 50 })
  eventType: string;

  @Column({ name: "previous_state", type: "varchar", length: 50, nullable: true })
  previousState: string | null;

  @Column({ name: "new_state", type: "varchar", length: 50, nullable: true })
  newState: string | null;

  @Column({ name: "previous_streak", type: "int", nullable: true })
  previousStreak: number | null;

  @Column({ name: "new_streak", type: "int", nullable: true })
  newStreak: number | null;

  @Column({ name: "actor_user_id", type: "varchar", length: 255, nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => AuthUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "actor_user_id" })
  actorUser?: AuthUser | null;

  @Column({ name: "actor_role", type: "varchar", length: 50 })
  actorRole: string;

  @Column({ name: "reason_or_summary", type: "text" })
  reasonOrSummary: string;

  @Column({ name: "metadata_json", type: "jsonb", nullable: true })
  metadataJson: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
