import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StatsController } from "./controllers/stats.controller.js";
import { StatsService } from "./services/stats.service.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { SafetyEvaluation } from "../internal/rule-engine/entities/safety-evaluation.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";
import { FacilityAlert } from "../alerts/entities/facility-alert.entity.js";
import { InterventionTicket } from "../tickets/entities/intervention-ticket.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { Facility } from "../facilities/entities/facilities.entity.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      TreatmentPlan,
      DailyCheckIn,
      SafetyEvaluation,
      PmoAssignment,
      FacilityAlert,
      InterventionTicket,
      AuthUser,
      Facility,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
