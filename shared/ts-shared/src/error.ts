import { z } from "zod";

export const ErrorCodes = [
  "INTERNAL",
  "NOT_FOUND",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "CHECK_IN_ALREADY_LOCKED",
  "CONSENT_REQUIRED",
  "INVALID_TOKEN",
] as const;
export const ErrorCodeSchema = z.enum(ErrorCodes);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.array(ApiErrorDetailSchema).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
