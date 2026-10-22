import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientsController } from "./controllers/patients.controller.js";
import { PatientsService } from "./services/patients.service.js";
import { TreatmentPlan } from "./entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "./entities/patient-status-history.entity.js";
import { PmoAssignment } from "./entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../internal/rule-engine/entities/safety-evaluation.entity.js";
import { PushSubscription } from "../push/entities/push-subscription.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentPlan,
      PatientStatusHistory,
      PmoAssignment,
      DailyCheckIn,
      SafetyEvaluation,
      PushSubscription,
      AuthUser,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule],
})
export class PatientsModule {}
