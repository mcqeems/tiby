import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "./entities/audit-log.entity.js";

export interface LogAuditParams {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  targetEntity: string;
  targetId: string;
  metadataJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: LogAuditParams): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      actorUserId: params.actorUserId ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      metadataJson: params.metadataJson ?? null,
      ipAddress: params.ipAddress ?? null,
    });
    return this.auditRepo.save(entry);
  }
}
