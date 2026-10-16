import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TreatmentsController } from "./controllers/treatments.controller.js";
import { TreatmentsService } from "./services/treatments.service.js";
import { TreatmentPlan } from "./entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "./entities/patient-status-history.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([TreatmentPlan, PatientStatusHistory])],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
