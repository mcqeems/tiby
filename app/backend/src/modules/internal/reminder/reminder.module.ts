import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReminderService } from "./reminder.service.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { NotificationLog } from "../../whatsapp/entities/notification-log.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([TreatmentPlan, DailyCheckIn, NotificationLog])],
  providers: [ReminderService],
})
export class ReminderModule {}
