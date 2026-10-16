import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OnboardingController } from "./controllers/onboarding.controller.js";
import { ConsentController } from "./controllers/consent.controller.js";
import { OnboardingService } from "./services/onboarding.service.js";
import { ConsentService } from "./services/consent.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { ConsentRecord } from "./entities/consent-record.entity.js";
import { TreatmentPlan } from "../treatments/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../treatments/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../treatments/entities/family-contact.entity.js";
import { Facility } from "../facilities/entities/facility.entity.js";
import { FacilityAlert } from "../facilities/entities/facility-alert.entity.js";
import { PatientStatusHistory } from "../treatments/entities/patient-status-history.entity.js";
import { AuditLog } from "../audit/entities/audit-log.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { PushSubscription } from "../push/entities/push-subscription.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthUser,
      ConsentRecord,
      TreatmentPlan,
      PmoAssignment,
      FamilyContact,
      Facility,
      FacilityAlert,
      PatientStatusHistory,
      AuditLog,
      DailyCheckIn,
      PushSubscription,
    ]),
  ],
  controllers: [OnboardingController, ConsentController],
  providers: [OnboardingService, ConsentService],
  exports: [OnboardingService, ConsentService],
})
export class OnboardingModule {}
