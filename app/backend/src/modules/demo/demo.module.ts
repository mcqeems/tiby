import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DemoController } from "./controllers/demo.controller.js";
import { DemoService } from "./services/demo.service.js";
import { DemoCleanupService } from "./services/demo-cleanup.service.js";
import { DemoSession } from "./entities/demo-session.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { Facility } from "../facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { ConsentRecord } from "../consent/entities/consent-record.entity.js";
import { UserNotification } from "../notifications/entities/user-notification.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DemoSession,
      AuthUser,
      Facility,
      TreatmentPlan,
      PmoAssignment,
      DailyCheckIn,
      ConsentRecord,
      UserNotification,
      AuditLog,
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoService, DemoCleanupService],
  exports: [DemoService],
})
export class DemoModule {}
