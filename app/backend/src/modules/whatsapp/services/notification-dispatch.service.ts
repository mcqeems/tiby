import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTriggerEvent } from "../../../common/events/notification-trigger.event.js";
import { NotificationLog } from "../entities/notification-log.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
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
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    private readonly pushService: PushService,
    private readonly wahaClient: WahaClientService,
  ) {}

  @OnEvent("notification.trigger")
  async handleNotificationTrigger(event: NotificationTriggerEvent): Promise<void> {
    const { circumstance, treatmentPlanId, recipientRole, customMessage } = event;
    const { title, body } = getMessageForCircumstance(circumstance, customMessage);

    // Resolve target recipient user IDs
    const targetUserIds: string[] = [];

    if (event.recipientUserId) {
      targetUserIds.push(event.recipientUserId);
    } else if (recipientRole === "PASIEN") {
      const plan = await this.planRepo.findOneBy({ id: treatmentPlanId });
      if (plan?.patientUserId) {
        targetUserIds.push(plan.patientUserId);
      }
    } else if (recipientRole === "PMO") {
      const pmoAssignments = await this.pmoRepo.find({
        where: { treatmentPlanId, active: true },
      });
      for (const a of pmoAssignments) {
        targetUserIds.push(a.pmoUserId);
      }
    }

    // Deliver Web Push to all resolved recipients
    for (const userId of targetUserIds) {
      const pushResult = await this.pushService.sendNotificationToUser(userId, {
        title,
        body,
        data: {
          circumstance,
          treatmentPlanId,
        },
      });

      const deliveryStatus = pushResult.sent > 0 ? "DELIVERED" : pushResult.failed > 0 ? "FAILED" : "NO_SUBSCRIPTION";

      await this.logRepo.save(
        this.logRepo.create({
          treatmentPlanId,
          recipientUserId: userId,
          recipientRole,
          channel: "WEB_PUSH",
          targetAddress: null,
          triggerCircumstance: circumstance,
          deliveryStatus,
        }),
      );
    }

    // WhatsApp dispatch via WAHA (or skipped if disabled)
    const wahaEnabled = process.env.WAHA_ENABLED === "true";
    if (!wahaEnabled) {
      await this.logRepo.save(
        this.logRepo.create({
          treatmentPlanId,
          recipientUserId: event.recipientUserId ?? null,
          recipientFamilyContactId: event.recipientFamilyContactId ?? null,
          recipientRole,
          channel: "WHATSAPP",
          targetAddress: null,
          triggerCircumstance: circumstance,
          deliveryStatus: "SKIPPED_WAHA_DISABLED",
        }),
      );
    } else {
      for (const userId of targetUserIds) {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (user && user.whatsappVerified && user.whatsappChatId) {
          const wahaRes = await this.wahaClient.sendText(
            user.whatsappChatId,
            `*${title}*\n\n${body}`,
          );
          await this.logRepo.save(
            this.logRepo.create({
              treatmentPlanId,
              recipientUserId: userId,
              recipientRole,
              channel: "WHATSAPP",
              targetAddress: user.whatsappChatId,
              triggerCircumstance: circumstance,
              deliveryStatus: wahaRes.success ? "DELIVERED" : "FAILED",
              externalMessageId: wahaRes.messageId ?? null,
            }),
          );
        } else {
          await this.logRepo.save(
            this.logRepo.create({
              treatmentPlanId,
              recipientUserId: userId,
              recipientRole,
              channel: "WHATSAPP",
              targetAddress: null,
              triggerCircumstance: circumstance,
              deliveryStatus: "SKIPPED_UNVERIFIED",
            }),
          );
        }
      }
    }
  }
}
