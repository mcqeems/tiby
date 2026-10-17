import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service.js';
import type { Health } from '@tiby/ts-shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['', 'health'])
  @AllowAnonymous()
  async getHealth(): Promise<Health> {
    return this.appService.checkHealth();
  }
}
