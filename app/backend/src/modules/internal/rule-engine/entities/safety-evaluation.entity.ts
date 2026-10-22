import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { DailyCheckIn } from "../../../check-ins/entities/daily-check-in.entity.js";

@Entity("safety_evaluations")
export class SafetyEvaluation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index("uq_safety_evaluations_check_in_id", { unique: true })
  @Column({ name: "check_in_id", type: "uuid", unique: true })
  checkInId: string;

  @OneToOne(() => DailyCheckIn, { onDelete: "CASCADE" })
  @JoinColumn({ name: "check_in_id" })
  checkIn: DailyCheckIn;

  @Column({ type: "varchar", length: 50 })
  verdict: string;

  @Column({ name: "is_valid_completion", type: "boolean", default: false })
  isValidCompletion: boolean;

  @Column({ name: "matched_rule_codes", type: "text", array: true, default: "{}" })
  matchedRuleCodes: string[];

  @Column({ name: "fail_safe_triggered", type: "boolean", default: false })
  failSafeTriggered: boolean;

  @Column({ name: "fail_safe_reason", type: "varchar", length: 255, nullable: true })
  failSafeReason: string | null;

  @Column({ name: "response_message_id", type: "text" })
  responseMessageId: string;

  @Column({ name: "tts_audio_url", type: "varchar", length: 255, nullable: true })
  ttsAudioUrl: string | null;

  @CreateDateColumn({ name: "evaluated_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  evaluatedAt: Date;
}
