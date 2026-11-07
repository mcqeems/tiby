import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTriggerEvent } from "../../../common/events/notification-trigger.event.js";
import {
  getMessageForCircumstance,
  getSeverity,
} from "../../../common/notifications/notification-templates.js";
import { NotificationLog } from "../entities/notification-log.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../../family-contacts/entities/family-contact.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { PushService } from "../../push/services/push.service.js";
import { WahaClientService } from "./waha-client.service.js";
import { NotificationsService } from "../../notifications/services/notifications.service.js";

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(FamilyContact)
    private readonly familyRepo: Repository<FamilyContact>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    private readonly pushService: PushService,
    private readonly wahaClient: WahaClientService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent("notification.trigger")
  async handleNotificationTrigger(event: NotificationTriggerEvent): Promise<void> {
    try {
      await this.deliver(event);
    } catch (err: unknown) {
      // EventEmitter2 does not await listeners; an unhandled rejection here
      // would silently drop every recipient after the failure.
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Notification dispatch failed for ${event.circumstance}: ${msg}`);
    }
  }

  private async deliver(event: NotificationTriggerEvent): Promise<void> {
    const { circumstance, treatmentPlanId, recipientRole, customMessage } = event;
    const { title, body } = getMessageForCircumstance(circumstance, customMessage);
    const wahaEnabled = process.env.WAHA_ENABLED === "true";
    const text = `*${title}*\n\n${body}`;

    // Family contacts have no login, so they only get WhatsApp.
    if (recipientRole === "KELUARGA") {
      const contacts = await this.resolveFamilyContacts(event);
      for (const contact of contacts) {
        if (!wahaEnabled) {
          await this.log(treatmentPlanId, {
            recipientFamilyContactId: contact.id,
            recipientRole,
            channel: "WHATSAPP",
            targetAddress: null,
            deliveryStatus: "SKIPPED_WAHA_DISABLED",
            triggerCircumstance: circumstance,
          });
          continue;
        }
        if (!contact.whatsappVerified || !contact.whatsappChatId) {
          await this.log(treatmentPlanId, {
            recipientFamilyContactId: contact.id,
            recipientRole,
            channel: "WHATSAPP",
            targetAddress: null,
            deliveryStatus: "SKIPPED_UNVERIFIED",
            triggerCircumstance: circumstance,
          });
          continue;
        }
        const res = await this.wahaClient.sendText(contact.whatsappChatId, text);
        await this.log(treatmentPlanId, {
          recipientFamilyContactId: contact.id,
          recipientRole,
          channel: "WHATSAPP",
          targetAddress: contact.whatsappChatId,
          deliveryStatus: res.success ? "DELIVERED" : "FAILED",
          externalMessageId: res.messageId ?? null,
          triggerCircumstance: circumstance,
        });
      }
      return;
    }

    const userIds = await this.resolveUserIds(event);
    if (userIds.length === 0) return;

    if (recipientRole === "PASIEN" || recipientRole === "PMO") {
      await this.notificationsService.createMany(userIds, {
        treatmentPlanId,
        type: circumstance,
        severity: getSeverity(circumstance),
        title,
        message: body,
      });
    }

    for (const userId of userIds) {
      let deliveryStatus = "FAILED";
      try {
        const pushResult = await this.pushService.sendNotificationToUser(userId, {
          title,
          body,
          data: { circumstance, treatmentPlanId },
        });
        deliveryStatus =
          pushResult.sent > 0 ? "DELIVERED" : pushResult.failed > 0 ? "FAILED" : "NO_SUBSCRIPTION";
      } catch (err: unknown) {
        // One bad subscription must not skip every WhatsApp recipient.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Web Push failed for ${userId}: ${msg}`);
      }

      await this.log(treatmentPlanId, {
        recipientUserId: userId,
        recipientRole,
        channel: "WEB_PUSH",
        targetAddress: null,
        deliveryStatus,
        triggerCircumstance: circumstance,
      });
    }

    for (const userId of userIds) {
      if (!wahaEnabled) {
        await this.log(treatmentPlanId, {
          recipientUserId: userId,
          recipientRole,
          channel: "WHATSAPP",
          targetAddress: null,
          deliveryStatus: "SKIPPED_WAHA_DISABLED",
          triggerCircumstance: circumstance,
        });
        continue;
      }

      const user = await this.userRepo.findOneBy({ id: userId });
      if (user?.whatsappVerified && user.whatsappChatId) {
        const res = await this.wahaClient.sendText(user.whatsappChatId, text);
        await this.log(treatmentPlanId, {
          recipientUserId: userId,
          recipientRole,
          channel: "WHATSAPP",
          targetAddress: user.whatsappChatId,
          deliveryStatus: res.success ? "DELIVERED" : "FAILED",
          externalMessageId: res.messageId ?? null,
          triggerCircumstance: circumstance,
        });
      } else {
        await this.log(treatmentPlanId, {
          recipientUserId: userId,
          recipientRole,
          channel: "WHATSAPP",
          targetAddress: null,
          deliveryStatus: "SKIPPED_UNVERIFIED",
          triggerCircumstance: circumstance,
        });
      }
    }
  }

  private async resolveUserIds(event: NotificationTriggerEvent): Promise<string[]> {
    if (event.recipientUserId) return [event.recipientUserId];

    if (event.recipientRole === "PASIEN") {
      const plan = await this.planRepo.findOneBy({ id: event.treatmentPlanId });
      return plan?.patientUserId ? [plan.patientUserId] : [];
    }

    if (event.recipientRole === "PMO") {
      const assignments = await this.pmoRepo.find({
        where: { treatmentPlanId: event.treatmentPlanId, active: true },
      });
      return assignments.map((a) => a.pmoUserId);
    }

    return [];
  }

  private async resolveFamilyContacts(event: NotificationTriggerEvent): Promise<FamilyContact[]> {
    if (event.recipientFamilyContactId) {
      const contact = await this.familyRepo.findOneBy({
        id: event.recipientFamilyContactId,
      });
      return contact ? [contact] : [];
    }

    return this.familyRepo.find({
      where: {
        treatmentPlanId: event.treatmentPlanId,
        notifyOnEscalation: true,
      },
    });
  }

  private async log(
    treatmentPlanId: string,
    fields: {
      recipientUserId?: string | null;
      recipientFamilyContactId?: string | null;
      recipientRole: string;
      channel: string;
      targetAddress: string | null;
      deliveryStatus: string;
      externalMessageId?: string | null;
      triggerCircumstance?: string;
    },
  ): Promise<void> {
    const { triggerCircumstance, ...rest } = fields;
    await this.logRepo.save(
      this.logRepo.create({
        treatmentPlanId,
        recipientUserId: rest.recipientUserId ?? null,
        recipientFamilyContactId: rest.recipientFamilyContactId ?? null,
        recipientRole: rest.recipientRole,
        channel: rest.channel,
        targetAddress: rest.targetAddress,
        deliveryStatus: rest.deliveryStatus,
        externalMessageId: rest.externalMessageId ?? null,
        triggerCircumstance: triggerCircumstance ?? "",
      }),
    );
  }
}
