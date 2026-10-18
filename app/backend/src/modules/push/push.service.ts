import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import webpush from "web-push";
import { randomUUID } from "node:crypto";
import { PushSubscription } from "./entities/push-subscription.entity.js";
import { TreatmentPlan } from "../treatments/entities/treatment-plan.entity.js";
import { PatientStatusHistory } from "../treatments/entities/patient-status-history.entity.js";
import type {
  PushSubscriptionPayload,
  PushSubscriptionStatus,
  PushUnsubscribeDto,
  VapidPublicKeyResponse,
} from "@tiby/ts-shared";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushRepo: Repository<PushSubscription>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@tiby.health";

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigured = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to configure VAPID details: ${msg}`);
      }
    }
  }

  getVapidPublicKey(): VapidPublicKeyResponse {
    const publicKey = process.env.VAPID_PUBLIC_KEY || "";
    return { publicKey };
  }

  async subscribe(
    userId: string,
    dto: PushSubscriptionPayload,
    userAgent?: string,
  ): Promise<PushSubscriptionStatus> {
    let sub = await this.pushRepo.findOneBy({ endpoint: dto.endpoint });

    if (sub) {
      sub.userId = userId;
      sub.p256dh = dto.keys.p256dh;
      sub.auth = dto.keys.auth;
      sub.userAgent = userAgent ?? sub.userAgent;
    } else {
      sub = this.pushRepo.create({
        id: randomUUID(),
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      });
    }

    const saved = await this.pushRepo.save(sub);

    try {
      const plan = await this.planRepo.findOneBy({ patientUserId: userId });
      if (plan) {
        await this.historyRepo.save(
          this.historyRepo.create({
            treatmentPlanId: plan.id,
            eventType: "PUSH_SUBSCRIBED",
            previousState: plan.patientState,
            newState: plan.patientState,
            previousStreak: plan.currentStreak,
            newStreak: plan.currentStreak,
            actorUserId: userId,
            actorRole: "PASIEN",
            reasonOrSummary: "Browser push subscription registered",
            metadataJson: { endpoint: saved.endpoint },
          }),
        );
      }
    } catch {
      // Non-blocking: subscribe succeeds even if history logging fails
    }

    return {
      id: saved.id,
      endpoint: saved.endpoint,
      subscribed: true,
    };
  }

  async unsubscribe(
    userId: string,
    dto: PushUnsubscribeDto,
  ): Promise<{ unsubscribed: boolean }> {
    await this.pushRepo.delete({
      endpoint: dto.endpoint,
      userId,
    });
    return { unsubscribed: true };
  }

  async sendNotificationToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    if (!this.vapidConfigured) {
      this.logger.warn("VAPID not configured. Skipping push notification.");
      return { sent: 0, failed: 0 };
    }

    // Zero-Stigma Invariant: Strip any TBC/Tuberkulosis mention
    const cleanTitle = payload.title.replace(/\b(TBC|Tuberkulosis)\b/gi, "").trim();
    const cleanBody = payload.body.replace(/\b(TBC|Tuberkulosis)\b/gi, "").trim();

    const cleanPayload = {
      ...payload,
      title: cleanTitle,
      body: cleanBody,
    };

    const subscriptions = await this.pushRepo.findBy({ userId });
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(cleanPayload),
          );
          sent++;
        } catch (err: unknown) {
          failed++;
          const statusCode = err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Push failed for endpoint ${sub.endpoint}: ${statusCode || msg}`);
          // 410 Gone or 404 Not Found: subscription is expired or unregistered
          if (statusCode === 410 || statusCode === 404) {
            await this.pushRepo.delete({ id: sub.id });
            this.logger.log(`Pruned expired push subscription ${sub.id}`);
          }
        }
      }),
    );

    return { sent, failed };
  }
}
