import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TreatmentsController } from "./controllers/treatments.controller.js";
import { FamilyContactsController } from "./controllers/family-contacts.controller.js";
import { TreatmentsService } from "./services/treatments.service.js";
import { FamilyContactsService } from "./services/family-contacts.service.js";
import { TreatmentPlan } from "./entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "./entities/patient-status-history.entity.js";
import { FamilyContact } from "./entities/family-contact.entity.js";
import { PmoAssignment } from "./entities/pmo-assignment.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TreatmentPlan,
      PatientStatusHistory,
      FamilyContact,
      PmoAssignment,
    ]),
  ],
  controllers: [TreatmentsController, FamilyContactsController],
  providers: [TreatmentsService, FamilyContactsService],
  exports: [TreatmentsService, FamilyContactsService],
})
export class TreatmentsModule {}
