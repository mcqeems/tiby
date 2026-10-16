import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FacilitiesController } from "./controllers/facilities.controller.js";
import { FacilitiesService } from "./services/facilities.service.js";
import { Facility } from "./entities/facility.entity.js";
import { FacilityAlert } from "./entities/facility-alert.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityAlert, AuthUser])],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
