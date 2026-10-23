import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository, type FindOptionsWhere } from "typeorm";
import { FacilityAlert } from "../entities/facility-alert.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import type {
  ListAlertsQuery,
  FacilityAlertList,
  FacilityAlertDto,
  FacilityAlertType,
  AlertSeverity,
} from "@tiby/ts-shared";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(FacilityAlert)
    private readonly alertRepo: Repository<FacilityAlert>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
  ) {}

  async listAlerts(
    nakesUserId: string,
    query: ListAlertsQuery,
  ): Promise<FacilityAlertList> {
    const nakes = await this.userRepo.findOneBy({ id: nakesUserId });
    const facilityId = nakes?.facilityId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // A NAKES without a facility must not page through every facility.
    if (!facilityId) {
      return { items: [], total: 0, page, limit };
    }

    // Filters are ANDed with the facility scope, never ORed.
    const base: FindOptionsWhere<FacilityAlert> = {
      facilityId,
      ...(query.unreadOnly ? { isRead: false } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };
    const term = query.search?.trim();
    const where: FindOptionsWhere<FacilityAlert>[] = term
      ? [
          { ...base, treatmentPlan: { patientUser: { name: ILike(`%${term}%`) } } },
          {
            ...base,
            treatmentPlan: { patientUser: { username: ILike(`%${term}%`) } },
          },
        ]
      : [base];

    const [alerts, total] = await this.alertRepo.findAndCount({
      where,
      relations: {
        treatmentPlan: {
          patientUser: true,
        },
      },
      // `id` tie-break keeps offset pages stable when createdAt ties.
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items: FacilityAlertDto[] = alerts.map((a) => ({
      id: a.id,
      facilityId: a.facilityId,
      treatmentPlanId: a.treatmentPlanId,
      patientName: a.treatmentPlan?.patientUser?.name || "Pasien",
      alertType: a.alertType as FacilityAlertType,
      severity: a.severity as AlertSeverity,
      title: a.title,
      message: a.message,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
      readAt: a.readAt ? a.readAt.toISOString() : null,
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async markAlertRead(
    alertId: string,
    nakesUserId: string,
  ): Promise<FacilityAlertDto> {
    const a = await this.alertRepo.findOne({
      where: { id: alertId },
      relations: {
        treatmentPlan: {
          patientUser: true,
        },
      },
    });

    if (!a) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Facility alert not found",
      });
    }

    a.isRead = true;
    a.readAt = new Date();
    a.readByNakesId = nakesUserId;
    await this.alertRepo.save(a);

    return {
      id: a.id,
      facilityId: a.facilityId,
      treatmentPlanId: a.treatmentPlanId,
      patientName: a.treatmentPlan?.patientUser?.name || "Pasien",
      alertType: a.alertType as FacilityAlertType,
      severity: a.severity as AlertSeverity,
      title: a.title,
      message: a.message,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
      readAt: a.readAt ? a.readAt.toISOString() : null,
    };
  }
}
