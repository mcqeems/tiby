import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminNotificationsController } from "./controllers/admin-notifications.controller.js";
import { AdminNotificationsService } from "./services/admin-notifications.service.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { FacilityAlert } from "../alerts/entities/facility-alert.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";
import { PushModule } from "../push/push.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { WhatsappModule } from "../whatsapp/whatsapp.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthUser, FacilityAlert, AuditLog]),
    PushModule,
    NotificationsModule,
    WhatsappModule,
  ],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
