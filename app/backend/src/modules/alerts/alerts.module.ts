import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertsController } from "./controllers/alerts.controller.js";
import { AlertsService } from "./services/alerts.service.js";
import { FacilityAlert } from "./entities/facility-alert.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([FacilityAlert, AuthUser])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
