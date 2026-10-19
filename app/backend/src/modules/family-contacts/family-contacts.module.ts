import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FamilyContactsController } from "./family-contacts.controller.js";
import { FamilyContactsService } from "./family-contacts.service.js";
import { FamilyContact } from "./entities/family-contact.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FamilyContact,
      TreatmentPlan,
      PmoAssignment,
    ]),
  ],
  controllers: [FamilyContactsController],
  providers: [FamilyContactsService],
  exports: [FamilyContactsService],
})
export class FamilyContactsModule {}
