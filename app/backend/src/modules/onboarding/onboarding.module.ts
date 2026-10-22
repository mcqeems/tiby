import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OnboardingController } from "./controllers/onboarding.controller.js";
import { OnboardingService } from "./services/onboarding.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../family-contacts/entities/family-contact.entity.js";
import { Facility } from "../../entities/facility.entity.js";
import { FacilityAlert } from "../alerts/entities/facility-alert.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthUser,
      TreatmentPlan,
      PmoAssignment,
      FamilyContact,
      Facility,
      FacilityAlert,
      PatientStatusHistory,
      AuditLog,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
