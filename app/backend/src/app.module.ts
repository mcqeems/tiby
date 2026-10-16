import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { validateEnv } from "./config/env.schema.js";
import { entities } from "./database/entities.js";
import { auth } from "./auth/auth.config.js";
import { OnboardingModule } from "./modules/onboarding/onboarding.module.js";
import { CheckInModule } from "./modules/check-ins/check-ins.module.js";
import { PushModule } from "./modules/push/push.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { TicketsModule } from "./modules/tickets/tickets.module.js";
import { FacilitiesModule } from "./modules/facilities/facilities.module.js";
import { TreatmentsModule } from "./modules/treatments/treatments.module.js";
import { EscalationModule } from "./modules/escalation/escalation.module.js";
import { EducationModule } from "./modules/education/education.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>("DATABASE_URL"),
        entities,
        synchronize: config.get<string>("NODE_ENV") !== "production",
        logging: config.get<string>("NODE_ENV") === "development" ? ["error", "warn"] : false,
      }),
    }),
    AuthModule.forRoot({ auth }),
    AuditModule,
    OnboardingModule,
    CheckInModule,
    PushModule,
    NotificationsModule,
    TicketsModule,
    FacilitiesModule,
    TreatmentsModule,
    EscalationModule,
    EducationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
