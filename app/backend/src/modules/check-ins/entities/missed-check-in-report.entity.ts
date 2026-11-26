import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Index("uq_missed_report_pending", ["treatmentPlanId", "reportedDate"], {
  unique: true,
  where: "status = 'PENDING'",
})
@Entity("missed_check_in_reports")
export class MissedCheckInReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_missed_reports_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "reported_date", type: "date" })
  reportedDate: string;

  @Column({ name: "reported_by_user_id", type: "varchar", length: 255 })
  reportedByUserId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reported_by_user_id" })
  reportedByUser: AuthUser;

  @Column({ name: "patient_note", type: "text", nullable: true })
  patientNote: string | null;

  @Column({ type: "varchar", length: 30, default: "PENDING" })
  status: string;

  @Column({ name: "verified_by_user_id", type: "varchar", length: 255, nullable: true })
  verifiedByUserId: string | null;

  @Column({ name: "verified_check_in_id", type: "uuid", nullable: true })
  verifiedCheckInId: string | null;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;
}
