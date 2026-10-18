import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TicketsController } from "./controllers/tickets.controller.js";
import { TicketsService } from "./services/tickets.service.js";
import { InterventionTicket } from "./entities/intervention-ticket.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { PatientStatusHistory } from "../treatments/entities/patient-status-history.entity.js";
import { TreatmentPlan } from "../treatments/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../treatments/entities/pmo-assignment.entity.js";

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
