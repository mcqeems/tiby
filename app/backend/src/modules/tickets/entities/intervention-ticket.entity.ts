import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { Facility } from "../../facilities/entities/facilities.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

@Entity("intervention_tickets")
export class InterventionTicket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_intervention_tickets_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Index("idx_intervention_tickets_facility")
  @Column({ name: "facility_id", type: "uuid" })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: "CASCADE" })
  @JoinColumn({ name: "facility_id" })
  facility: Facility;

  @Column({ name: "trigger_source", type: "varchar", length: 50 })
  triggerSource: string;

  @Column({ type: "varchar", length: 50, default: "HIGH" })
  priority: string;

  @Index("idx_intervention_tickets_status")
  @Column({ type: "varchar", length: 50, default: "OPEN" })
  status: string;

  @Column({ name: "assigned_nakes_id", type: "varchar", length: 255, nullable: true })
  assignedNakesId: string | null;

  @ManyToOne(() => AuthUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_nakes_id" })
  assignedNakes?: AuthUser | null;

  @Column({ name: "pmo_notes", type: "text", nullable: true })
  pmoNotes: string | null;

  @Column({ name: "resolution_reason", type: "varchar", length: 255, nullable: true })
  resolutionReason: string | null;

  @Column({ name: "resolution_notes", type: "text", nullable: true })
  resolutionNotes: string | null;

  @CreateDateColumn({ name: "opened_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  openedAt: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null;
}
