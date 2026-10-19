import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientsController } from "./controllers/patients.controller.js";
import { PmoController } from "./controllers/pmo.controller.js";
import { PatientsService } from "./services/patients.service.js";
import { TreatmentPlan } from "./entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "./entities/patient-status-history.entity.js";
import { PmoAssignment } from "./entities/pmo-assignment.entity.js";
import { CheckInModule } from "../check-ins/check-ins.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentPlan,
      PatientStatusHistory,
      PmoAssignment,
    ]),
    CheckInModule,
  ],
  controllers: [PatientsController, PmoController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule],
})
export class PatientsModule {}
