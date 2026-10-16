import { Module } from "@nestjs/common";
import { EducationController } from "./controllers/education.controller.js";

@Module({
  controllers: [EducationController],
})
export class EducationModule {}
