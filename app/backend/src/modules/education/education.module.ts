import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EducationController } from "./controllers/education.controller.js";
import { EducationService } from "./services/education.service.js";
import { EducationCard } from "./entities/education-card.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([EducationCard])],
  controllers: [EducationController],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
