import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PushController } from "./push.controller.js";
import { PushService } from "./push.service.js";
import { PushSubscription } from "./entities/push-subscription.entity.js";
import { TreatmentPlan } from "../treatments/entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "../treatments/entities/patient-status-history.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, TreatmentPlan, PatientStatusHistory])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
