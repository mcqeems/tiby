import { Module } from "@nestjs/common";
import { EducationController } from "./controllers/education.controller.js";
import { EducationService } from "./services/education.service.js";

@Module({
  controllers: [EducationController],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
