import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PatientStatusHistory } from "../entities/patient-status-history.entity.js";
import type {
  PatientStatusHistoryList,
  PatientStatusHistoryItem,
  PatientStatusEventType,
} from "@tiby/ts-shared";

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(PatientStatusHistory)
    private readonly historyRepo: Repository<PatientStatusHistory>,
  ) {}

  async getPatientHistory(
    treatmentPlanId: string,
    page = 1,
    limit = 50,
  ): Promise<PatientStatusHistoryList> {
    const [records, total] = await this.historyRepo.findAndCount({
      where: { treatmentPlanId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items: PatientStatusHistoryItem[] = records.map((r) => ({
      id: r.id,
      treatmentPlanId: r.treatmentPlanId,
      eventType: r.eventType as PatientStatusEventType,
      previousState: r.previousState,
      newState: r.newState,
      previousStreak: r.previousStreak,
      newStreak: r.newStreak,
      actorRole: r.actorRole,
      reasonOrSummary: r.reasonOrSummary,
      metadata: r.metadataJson,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
