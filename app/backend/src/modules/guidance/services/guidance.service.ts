import { Injectable } from "@nestjs/common";
import { AiClientService } from "../../internal/ai-client/ai-client.service.js";
import type { GuidanceRequest, GuidanceResponse } from "@tiby/ts-shared";

/**
 * Thin bridge: no clinical logic and no answer rewriting. The AI service owns
 * retrieval, the fail-closed decision, and the citations; the backend only
 * enforces auth and the request/response contract.
 */
@Injectable()
export class GuidanceService {
  constructor(private readonly aiClientService: AiClientService) {}

  ask(dto: GuidanceRequest): Promise<GuidanceResponse> {
    return this.aiClientService.askGuidance(dto.question, dto.transcript);
  }
}
