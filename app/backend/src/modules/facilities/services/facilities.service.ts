import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FacilityAlert } from "../entities/facility-alert.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import type {
  ListAlertsQuery,
  FacilityAlertList,
  FacilityAlertDto,
} from "@tiby/ts-shared";

@Injectable()
export class FacilitiesService {
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

    const qb = this.alertRepo
      .createQueryBuilder("alert")
      .leftJoinAndSelect("alert.treatmentPlan", "plan")
      .leftJoinAndSelect("plan.patientUser", "patient");

    if (facilityId) {
      qb.andWhere("alert.facilityId = :facilityId", { facilityId });
    }

    if (query.unreadOnly) {
      qb.andWhere("alert.isRead = false");
    }

    if (query.severity) {
      qb.andWhere("alert.severity = :severity", { severity: query.severity });
    }

    qb.orderBy("alert.createdAt", "DESC");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [alerts, total] = await qb.getManyAndCount();

    const items: FacilityAlertDto[] = alerts.map((a) => ({
      id: a.id,
      facilityId: a.facilityId,
      treatmentPlanId: a.treatmentPlanId,
      patientName: a.treatmentPlan?.patientUser?.name || "Pasien",
      alertType: a.alertType as any,
      severity: a.severity as any,
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
      alertType: a.alertType as any,
      severity: a.severity as any,
      title: a.title,
      message: a.message,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
      readAt: a.readAt ? a.readAt.toISOString() : null,
    };
  }
}
