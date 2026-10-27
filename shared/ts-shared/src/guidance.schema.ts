import { z } from "zod";

/**
 * Bridge contract for `POST /api/guidance`.
 *
 * Field names mirror the AI service's `/ai/guidance` payload verbatim
 * (snake_case included) so the bridge stays a pass-through and cannot drift
 * from the published contract.
 */
export const GuidanceRequestSchema = z.object({
  question: z.string().trim().min(1).max(3000),
  transcript: z.string().max(5000).nullable().optional(),
});
export type GuidanceRequest = z.infer<typeof GuidanceRequestSchema>;

export const GuidanceEvidenceSchema = z.object({
  citation_id: z.string(),
  text: z.string(),
});
export type GuidanceEvidence = z.infer<typeof GuidanceEvidenceSchema>;

export const GuidanceCitationSchema = z.object({
  citation_id: z.string(),
  document_id: z.string(),
  organization: z.enum(["WHO", "Kemenkes"]),
  title: z.string(),
  year: z.number().int().nullable(),
  page: z.number().int().nullable(),
  section: z.string().nullable(),
  source_url: z.string(),
});
export type GuidanceCitation = z.infer<typeof GuidanceCitationSchema>;

/** `answer: null` is a valid fail-closed answer, delivered with HTTP 200. */
export const GuidanceResponseSchema = z.object({
  answer: z.string().nullable(),
  grounded: z.boolean(),
  evidence: z.array(GuidanceEvidenceSchema),
  citations: z.array(GuidanceCitationSchema),
  limitations: z.array(z.string()),
});
export type GuidanceResponse = z.infer<typeof GuidanceResponseSchema>;
