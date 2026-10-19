import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CheckInController } from "./controllers/check-in.controller.js";
import { CheckInService } from "./services/check-in.service.js";
import { DailyCheckIn } from "./entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../rule-engine/entities/safety-evaluation.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";
import { InterventionTicket } from "../tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../alerts/entities/facility-alert.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../audit/entities/audit-log.entity.js";
import { AiClientModule } from "../ai-client/ai-client.module.js";
import { RuleEngineModule } from "../rule-engine/rule-engine.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyCheckIn,
      SafetyEvaluation,
      TreatmentPlan,
      PmoAssignment,
      InterventionTicket,
      FacilityAlert,
      PatientStatusHistory,
      AuditLog,
    ]),
    AiClientModule,
    RuleEngineModule,
  ],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService],
})
export class CheckInModule {}
