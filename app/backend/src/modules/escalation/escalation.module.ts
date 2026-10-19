import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SilenceDetectorService } from "./services/silence-detector.service.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { InterventionTicket } from "../tickets/entities/intervention-ticket.entity.js";
import { FacilityAlert } from "../alerts/entities/facility-alert.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentPlan,
      DailyCheckIn,
      PatientStatusHistory,
      InterventionTicket,
      FacilityAlert,
    ]),
  ],
  providers: [SilenceDetectorService],
  exports: [SilenceDetectorService],
})
export class EscalationModule {}
