import { Module } from "@nestjs/common";
import { GuidanceController } from "./controllers/guidance.controller.js";
import { GuidanceService } from "./services/guidance.service.js";
import { AiClientModule } from "../internal/ai-client/ai-client.module.js";

@Module({
  imports: [AiClientModule],
  controllers: [GuidanceController],
  providers: [GuidanceService],
})
export class GuidanceModule {}
