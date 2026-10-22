import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FacilitiesController } from "./controllers/facilities.controller.js";
import { FacilitiesService } from "./services/facilities.service.js";
import { Facility } from "./entities/facilities.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([Facility])],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
