import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserNotification } from "../entities/user-notification.entity.js";
import type {
  ListNotificationsQuery,
  NotificationSeverity,
  NotificationTriggerCircumstance,
  UserNotificationList,
  UserNotification as UserNotificationDto,
} from "@tiby/ts-shared";

export interface CreateNotificationsPayload {
  treatmentPlanId: string | null;
  type: NotificationTriggerCircumstance;
  severity: NotificationSeverity;
  title: string;
  message: string;
}

function toDto(row: UserNotification): UserNotificationDto {
  return {
    id: row.id,
    treatmentPlanId: row.treatmentPlanId,
    type: row.type as NotificationTriggerCircumstance,
    severity: row.severity as NotificationSeverity,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepo: Repository<UserNotification>,
  ) {}

  async createMany(
    userIds: string[],
    payload: CreateNotificationsPayload,
  ): Promise<void> {
    const recipients = [...new Set(userIds)].filter(Boolean);
    if (recipients.length === 0) return;

    await this.notificationRepo.save(
      recipients.map((recipientUserId) =>
        this.notificationRepo.create({
          recipientUserId,
          treatmentPlanId: payload.treatmentPlanId,
          type: payload.type,
          severity: payload.severity,
          title: payload.title,
          message: payload.message,
          isRead: false,
          readAt: null,
        }),
      ),
    );
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { recipientUserId: userId, isRead: false },
    });
  }

  async list(
    userId: string,
    query: ListNotificationsQuery,
  ): Promise<UserNotificationList> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await this.notificationRepo.findAndCount({
      where: {
        recipientUserId: userId,
        ...(query.unreadOnly ? { isRead: false } : {}),
      },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map(toDto),
      total,
      page,
      limit,
    };
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<UserNotificationDto> {
    const row = await this.notificationRepo.findOneBy({
      id: notificationId,
      recipientUserId: userId,
    });

    if (!row) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Notification not found",
      });
    }

    if (!row.isRead) {
      row.isRead = true;
      row.readAt = new Date();
      await this.notificationRepo.save(row);
    }

    return toDto(row);
  }
}
