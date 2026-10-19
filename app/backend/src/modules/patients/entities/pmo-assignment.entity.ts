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

@Entity("pmo_assignments")
export class PmoAssignment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_pmo_assignments_treatment_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Index("idx_pmo_assignments_pmo_user")
  @Column({ name: "pmo_user_id", type: "varchar", length: 255 })
  pmoUserId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pmo_user_id" })
  pmoUser: AuthUser;

  @Column({ type: "varchar", length: 50, default: "KELUARGA" })
  relationship: string;

  @Column({ name: "is_primary", type: "boolean", default: true })
  isPrimary: boolean;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}
