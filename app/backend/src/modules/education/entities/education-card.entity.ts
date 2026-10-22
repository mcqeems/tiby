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
import { Facility } from "../../../entities/facility.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";

/**
 * Educational content shown to patients/PMOs.
 * `facilityId = null` marks a global card owned by ADMIN and inherited by
 * every facility; otherwise the card belongs to that facility's Nakes.
 */
@Index("idx_education_cards_facility_phase", ["facilityId", "phase", "sortOrder"])
@Entity("education_cards")
export class EducationCard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "facility_id", type: "uuid", nullable: true })
  facilityId: string | null;

  @ManyToOne(() => Facility, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "facility_id" })
  facility?: Facility | null;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 500 })
  summary: string;

  @Column({ name: "content_markdown", type: "text" })
  contentMarkdown: string;

  @Column({ type: "varchar", length: 50 })
  category: string;

  @Column({ type: "varchar", length: 50 })
  phase: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "created_by_user_id", type: "varchar", length: 255, nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => AuthUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_user_id" })
  createdByUser?: AuthUser | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
