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
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { Facility } from "../../facilities/entities/facility.entity.js";

@Index("idx_treatment_plans_triage", ["facilityId", "patientState", "riskScore"])
@Entity("treatment_plans")
export class TreatmentPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_treatment_plans_patient_user_id")
  @Column({ name: "patient_user_id", type: "varchar", length: 255 })
  patientUserId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patient_user_id" })
  patientUser: AuthUser;

  @Column({ name: "facility_id", type: "uuid" })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: "CASCADE" })
  @JoinColumn({ name: "facility_id" })
  facility: Facility;

  @Column({ name: "registered_by_nakes_id", type: "varchar", length: 255 })
  registeredByNakesId: string;

  @ManyToOne(() => AuthUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "registered_by_nakes_id" })
  registeredByNakes: AuthUser;

  @Column({ type: "varchar", length: 50, default: "INTENSIF" })
  phase: string;

  @Column({ name: "patient_state", type: "varchar", length: 50, default: "PENDING" })
  patientState: string;

  @Column({ name: "regimen_code", type: "varchar", length: 50 })
  regimenCode: string;

  @Column({ name: "daily_pill_quota", type: "int" })
  dailyPillQuota: number;

  @Column({ name: "reminder_time_local", type: "varchar", length: 10, default: "08:00" })
  reminderTimeLocal: string;

  @Column({ type: "varchar", length: 50, default: "Asia/Jakarta" })
  timezone: string;

  @Column({ name: "start_date", type: "date" })
  startDate: string;

  @Column({ name: "target_end_date", type: "date" })
  targetEndDate: string;

  @Column({ name: "current_streak", type: "int", default: 0 })
  currentStreak: number;

  @Column({ name: "consecutive_silence_days", type: "int", default: 0 })
  consecutiveSilenceDays: number;

  @Column({ name: "risk_score", type: "int", default: 0 })
  riskScore: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
