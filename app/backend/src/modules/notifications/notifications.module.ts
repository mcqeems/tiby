import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsController } from "./controllers/notifications.controller.js";
import { NotificationsService } from "./services/notifications.service.js";
import { UserNotification } from "./entities/user-notification.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([UserNotification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
