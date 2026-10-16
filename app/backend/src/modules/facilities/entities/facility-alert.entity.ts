import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Facility } from "./facility.entity.js";
import { TreatmentPlan } from "../../treatments/entities/treatment-plan.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Entity("facility_alerts")
export class FacilityAlert {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_facility_alerts_facility")
  @Column({ name: "facility_id", type: "uuid" })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: "CASCADE" })
  @JoinColumn({ name: "facility_id" })
  facility: Facility;

  @Index("idx_facility_alerts_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "alert_type", type: "varchar", length: 50 })
  alertType: string;

  @Column({ type: "varchar", length: 50, default: "WARNING" })
  severity: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead: boolean;

  @Column({ name: "read_by_nakes_id", type: "varchar", length: 255, nullable: true })
  readByNakesId: string | null;

  @ManyToOne(() => AuthUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "read_by_nakes_id" })
  readByNakes?: AuthUser | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt: Date | null;
}
