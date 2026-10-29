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
import { DemoModule } from "./modules/demo/demo.module.js";
import { OnboardingModule } from "./modules/onboarding/onboarding.module.js";
import { ConsentModule } from "./modules/consent/consent.module.js";
import { CheckInModule } from "./modules/check-ins/check-ins.module.js";
import { PushModule } from "./modules/push/push.module.js";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module.js";
import { TicketsModule } from "./modules/tickets/tickets.module.js";
import { AlertsModule } from "./modules/alerts/alerts.module.js";
import { PatientsModule } from "./modules/patients/patients.module.js";
import { FacilitiesModule } from "./modules/facilities/facilities.module.js";
import { FamilyContactsModule } from "./modules/family-contacts/family-contacts.module.js";
import { EscalationModule } from "./modules/internal/escalation/escalation.module.js";
import { ReminderModule } from "./modules/internal/reminder/reminder.module.js";
import { EducationModule } from "./modules/education/education.module.js";
import { AuditModule } from "./modules/internal/audit/audit.module.js";
import { StorageModule } from "./modules/internal/storage/storage.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { GuidanceModule } from "./modules/guidance/guidance.module.js";
import { StatsModule } from "./modules/stats/stats.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";

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
    StorageModule,
    OnboardingModule,
    ConsentModule,
    CheckInModule,
    PushModule,
    WhatsappModule,
    TicketsModule,
    AlertsModule,
    FacilitiesModule,
    PatientsModule,
    FamilyContactsModule,
    EscalationModule,
    ReminderModule,
    EducationModule,
    UsersModule,
    GuidanceModule,
    DemoModule,
    StatsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
