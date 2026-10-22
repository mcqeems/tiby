import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PushController } from "./controllers/push.controller.js";
import { PushService } from "./services/push.service.js";
import { PushSubscription } from "./entities/push-subscription.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushSubscription,
      TreatmentPlan,
      PatientStatusHistory,
      AuthUser,
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
