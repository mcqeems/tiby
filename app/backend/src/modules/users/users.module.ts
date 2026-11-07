import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./controllers/users.controller.js";
import { UsersService } from "./services/users.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { Facility } from "../facilities/entities/facilities.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../check-ins/entities/daily-check-in.entity.js";
import { UserNotification } from "../notifications/entities/user-notification.entity.js";
import { FamilyContact } from "../family-contacts/entities/family-contact.entity.js";
import { DemoModule } from "../demo/demo.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthUser,
      Facility,
      AuditLog,
      TreatmentPlan,
      DailyCheckIn,
      UserNotification,
      FamilyContact,
    ]),
    DemoModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
