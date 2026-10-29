import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DemoService } from "./demo.service.js";

@Injectable()
export class DemoCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoCleanupService.name);

  constructor(private readonly demoService: DemoService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    try {
      const result = await this.demoService.cleanupExpired();
      this.logger.log(`Startup demo cleanup: removed ${result.cleaned}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Startup demo cleanup failed: ${msg}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDemoExpiryCron(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    const result = await this.demoService.cleanupExpired();
    if (result.cleaned > 0) {
      this.logger.log(`Expired demo cleanup: removed ${result.cleaned}`);
    }
  }
}
