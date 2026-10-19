import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TicketsController } from "./controllers/tickets.controller.js";
import { TicketsService } from "./services/tickets.service.js";
import { InterventionTicket } from "./entities/intervention-ticket.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterventionTicket,
      AuthUser,
      PatientStatusHistory,
      TreatmentPlan,
      PmoAssignment,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
