import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { FacilityAlert } from "../../alerts/entities/facility-alert.entity.js";
import { AuditLog } from "../../internal/audit/entities/audit-log.entity.js";
import { PushService } from "../../push/services/push.service.js";
import { NotificationsService } from "../../notifications/services/notifications.service.js";
import { WahaClientService } from "../../whatsapp/services/waha-client.service.js";
import { listNotificationTemplates } from "../../../common/notifications/notification-templates.js";
import type {
  NotificationTemplateList,
  SendSimulatedNotificationDto,
  SendSimulatedNotificationResponse,
  SimulationChannel,
  SimulationChannelResult,
  SimulationRecipientResult,
} from "@tiby/ts-shared";

interface Delivery {
  channel: SimulationChannel;
  status: SimulationChannelResult["status"];
  detail: string | null;
}

function ok(channel: SimulationChannel, detail: string | null = null): Delivery {
  return { channel, status: "DELIVERED", detail };
}

function skip(
  channel: SimulationChannel,
  status: SimulationChannelResult["status"],
  detail: string,
): Delivery {
  return { channel, status, detail };
}

/**
 * Admin-only notification simulator. One send fans out to every requested
 * channel independently: a failed push must not stop the WhatsApp or bell
 * delivery for the same recipient.
 */
@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly pushService: PushService,
    private readonly wahaClient: WahaClientService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listTemplates(): NotificationTemplateList {
    return { items: listNotificationTemplates() };
  }

  async send(
    caller: { id: string; role: string },
    dto: SendSimulatedNotificationDto,
  ): Promise<SendSimulatedNotificationResponse> {
    const recipientIds = [...new Set(dto.recipientUserIds)];
    const users = await this.userRepo.findBy({ id: In(recipientIds) });

    if (users.length !== recipientIds.length) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "One or more recipients no longer exist",
      });
    }

    // Keep the admin's selection order so the result list matches the form.
    const byId = new Map(users.map((user) => [user.id, user]));
    const ordered = recipientIds
      .map((id) => byId.get(id))
      .filter((user): user is AuthUser => Boolean(user));

    // Recipients fan out in parallel; channels within one recipient stay
    // sequential so a slow gateway only delays that person's other channels.
    const results: SimulationRecipientResult[] = await Promise.all(
      ordered.map(async (user) => {
        const deliveries: Delivery[] = [];
        for (const channel of new Set(dto.channels)) {
          try {
            deliveries.push(await this.deliver(user, channel, dto));
          } catch {
            deliveries.push(skip(channel, "FAILED", "Pengiriman gagal"));
          }
        }
        return {
          userId: user.id,
          username: user.username,
          name: user.name,
          role: user.role as SimulationRecipientResult["role"],
          channels: deliveries,
        };
      }),
    );

    const all = results.flatMap((result) => result.channels);
    const summary = {
      recipients: results.length,
      delivered: all.filter((d) => d.status === "DELIVERED").length,
      skipped: all.filter(
        (d) => d.status !== "DELIVERED" && d.status !== "FAILED",
      ).length,
      failed: all.filter((d) => d.status === "FAILED").length,
    };

    await this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: caller.id,
        actorRole: caller.role,
        action: "ADMIN_SIMULATED_NOTIFICATION",
        targetEntity: "users",
        targetId: recipientIds[0],
        metadataJson: {
          recipientUserIds: recipientIds,
          channels: dto.channels,
          templateKey: dto.templateKey ?? null,
          title: dto.title,
          summary,
        },
      }),
    );

    return { summary, results };
  }

  private async deliver(
    user: AuthUser,
    channel: SimulationChannel,
    dto: SendSimulatedNotificationDto,
  ): Promise<Delivery> {
    switch (channel) {
      case "PUSH":
        return this.deliverPush(user, dto);
      case "WHATSAPP":
        return this.deliverWhatsapp(user, dto);
      case "ALERT":
        return this.deliverAlert(user, dto);
    }
  }

  private async deliverPush(
    user: AuthUser,
    dto: SendSimulatedNotificationDto,
  ): Promise<Delivery> {
    if (!this.pushService.isConfigured()) {
      return skip(
        "PUSH",
        "NO_SUBSCRIPTION",
        "Notifikasi push belum dikonfigurasi di server",
      );
    }

    try {
      const res = await this.pushService.sendNotificationToUser(user.id, {
        title: dto.title,
        body: dto.message,
        data: { adminSimulation: true },
      });
      if (res.sent > 0) return ok("PUSH", `${res.sent} perangkat`);
      if (res.failed > 0) {
        return skip("PUSH", "FAILED", `${res.failed} perangkat gagal`);
      }
      return skip("PUSH", "NO_SUBSCRIPTION", "Pengguna belum berlangganan push");
    } catch {
      return skip("PUSH", "FAILED", "Pengiriman push gagal");
    }
  }

  private async deliverWhatsapp(
    user: AuthUser,
    dto: SendSimulatedNotificationDto,
  ): Promise<Delivery> {
    if (process.env.WAHA_ENABLED !== "true") {
      return skip("WHATSAPP", "SKIPPED_WAHA_DISABLED", "Gerbang WhatsApp nonaktif");
    }
    if (!user.whatsappVerified || !user.whatsappChatId) {
      return skip(
        "WHATSAPP",
        "SKIPPED_UNVERIFIED",
        "Nomor WhatsApp belum terverifikasi",
      );
    }

    const res = await this.wahaClient.sendText(
      user.whatsappChatId,
      `*${dto.title}*\n\n${dto.message}`,
    );
    return res.success
      ? ok("WHATSAPP")
      : skip("WHATSAPP", "FAILED", "Gerbang WhatsApp menolak pesan");
  }

  private async deliverAlert(
    user: AuthUser,
    dto: SendSimulatedNotificationDto,
  ): Promise<Delivery> {
    if (user.role === "PASIEN" || user.role === "PMO") {
      await this.notificationsService.createMany([user.id], {
        treatmentPlanId: null,
        type: "ADMIN_SIMULATION",
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
      });
      return ok("ALERT", "Masuk ke lonceng notifikasi pengguna");
    }

    if (user.role === "NAKES") {
      if (!user.facilityId) {
        return skip(
          "ALERT",
          "NOT_APPLICABLE",
          "Nakes belum terhubung ke faskes",
        );
      }
      await this.alertRepo.save(
        this.alertRepo.create({
          facilityId: user.facilityId,
          treatmentPlanId: null,
          alertType: "ADMIN_SIMULATION",
          severity: dto.severity,
          title: dto.title,
          message: dto.message,
        }),
      );
      return ok("ALERT", "Masuk ke pusat notifikasi faskes");
    }

    return skip(
      "ALERT",
      "NOT_APPLICABLE",
      "Admin tidak memiliki kotak masuk notifikasi",
    );
  }
}
