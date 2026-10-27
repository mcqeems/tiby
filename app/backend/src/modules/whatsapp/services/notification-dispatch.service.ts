import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTriggerEvent } from "../../../common/events/notification-trigger.event.js";
import { NotificationLog } from "../entities/notification-log.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { FamilyContact } from "../../family-contacts/entities/family-contact.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { PushService } from "../../push/services/push.service.js";
import { WahaClientService } from "./waha-client.service.js";

function getMessageForCircumstance(circumstance: string, custom?: string): { title: string; body: string } {
  switch (circumstance) {
    case "DAILY_REMINDER":
    case "REMINDER_SCHEDULED":
      return {
        title: "Waktunya Minum Obat Bersama Pandu",
        body: custom || "Halo! Mari minum obat tepat waktu agar senantiasa sehat.",
      };
    case "DOSE_INCOMPLETE_NUDGE":
      return {
        title: "Catatan Pengingat dari Pandu",
        body: custom || "Pandu mengingatkan untuk melengkapi obat hari ini ya.",
      };
    case "RED_FLAG_ALERT":
      return {
        title: "Perhatian dari Pandu",
        body: custom || "Laporan kesehatan Anda memerlukan perhatian medis. Petugas faskes telah diberitahu.",
      };
    case "INTENT_TO_STOP_ALERT":
      return {
        title: "Pandu Siap Mendampingi",
        body: custom || "Jangan cemas, silakan konsultasikan kendala Anda dengan faskes terdekat.",
      };
    case "SILENCE_H1_ESCALATION":
    case "SILENCE_H1":
      return {
        title: "Pandu Kangen Kabarmu",
        body: custom || "Sudahkah minum obat hari ini? Luangkan waktu sebentar untuk check-in ya.",
      };
    case "SILENCE_H2_ESCALATION":
    case "SILENCE_H2":
      return {
        title: "Pengingat Pendamping Obat",
        body: custom || "Pasien belum melapor kemarin. Mohon bantu dampingi dan ingatkan minum obat hari ini.",
      };
    case "SILENCE_H3_ESCALATION":
    case "SILENCE_H3":
      return {
        title: "Pemberitahuan Pendamping Obat",
        body: custom || "Pasien belum melapor selama 3 hari berturut-turut. Tim faskes telah membuka tindak lanjut.",
      };
    case "WHATSAPP_VERIFIED_ACK":
      return {
        title: "WhatsApp Terhubung",
        body: custom || "Nomor WhatsApp Anda sudah terhubung dengan Pandu. Pandu siap mendampingi!",
      };
    default:
      return {
        title: "Pesan dari Pandu",
        body: custom || "Halo, ada pesan baru dari pendamping kesehatan Anda.",
      };
  }
}

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
