import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { TreatmentPlan } from "../../treatments/entities/treatment-plan.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { EncryptedColumnTransformer } from "../../../database/transformers/encrypted-column.transformer.js";

@Index("uq_daily_checkin_dose_fulfilled", ["treatmentPlanId", "checkInDate"], {
  unique: true,
  where: "is_dose_fulfilled = true",
})
@Entity("daily_check_ins")
export class DailyCheckIn {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("idx_daily_check_ins_plan")
  @Column({ name: "treatment_plan_id", type: "uuid" })
  treatmentPlanId: string;

  @ManyToOne(() => TreatmentPlan, { onDelete: "CASCADE" })
  @JoinColumn({ name: "treatment_plan_id" })
  treatmentPlan: TreatmentPlan;

  @Column({ name: "check_in_date", type: "date" })
  checkInDate: string;

  @Column({ name: "attempt_number", type: "int", default: 1 })
  attemptNumber: number;

  @Column({ name: "reported_by_user_id", type: "varchar", length: 255 })
  reportedByUserId: string;

  @ManyToOne(() => AuthUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reported_by_user_id" })
  reportedByUser: AuthUser;

  @Column({ name: "reported_by_role", type: "varchar", length: 50 })
  reportedByRole: string;

  @Column({ name: "input_mode", type: "varchar", length: 50, default: "VOICE_STT" })
  inputMode: string;

  @Column({
    name: "raw_transcript_encrypted",
    type: "text",
    nullable: true,
    transformer: new EncryptedColumnTransformer(),
  })
  rawTranscriptEncrypted: string | null;

  @Column({ name: "stt_confidence", type: "float", nullable: true })
  sttConfidence: number | null;

  @Column({ name: "medication_status", type: "varchar", length: 50 })
  medicationStatus: string;

  @Column({ name: "pills_taken_count", type: "int", nullable: true })
  pillsTakenCount: number | null;

  @Column({ name: "is_dose_fulfilled", type: "boolean", default: false })
  isDoseFulfilled: boolean;

  @Column({ name: "extracted_facts_json", type: "jsonb", nullable: true })
  extractedFactsJson: Record<string, unknown> | null;

  @CreateDateColumn({ name: "submitted_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  submittedAt: Date;
}
