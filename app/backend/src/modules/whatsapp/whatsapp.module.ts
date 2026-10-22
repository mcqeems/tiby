import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationDispatchService } from "./services/notification-dispatch.service.js";
import { WhatsappConnectService } from "./services/whatsapp-connect.service.js";
import { WahaClientService } from "./services/waha-client.service.js";
import { WhatsappController } from "./controllers/whatsapp.controller.js";
import { NotificationLog } from "./entities/notification-log.entity.js";
import { WhatsappVerification } from "./entities/whatsapp-verification.entity.js";
import { TreatmentPlan } from "../patients/entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "../patients/entities/patient-status-history.entity.js";
import { AuditLog } from "../internal/audit/entities/audit-log.entity.js";
import { PmoAssignment } from "../patients/entities/pmo-assignment.entity.js";
import { AuthUser } from "../../auth/entities/auth-user.entity.js";
import { FamilyContact } from "../family-contacts/entities/family-contact.entity.js";
import { PushModule } from "../push/push.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationLog,
      WhatsappVerification,
      TreatmentPlan,
      PatientStatusHistory,
      AuditLog,
      PmoAssignment,
      AuthUser,
      FamilyContact,
    ]),
    PushModule,
  ],
  controllers: [WhatsappController],
  providers: [NotificationDispatchService, WhatsappConnectService, WahaClientService],
  exports: [NotificationDispatchService, WhatsappConnectService, WahaClientService],
})
export class WhatsappModule {}
