import { z } from "zod";

export const HealthSchema = z.object({
  status: z.literal("ok"),
});

export type Health = z.infer<typeof HealthSchema>;

export const ErrorCodes = ["INTERNAL", "NOT_FOUND", "BAD_REQUEST"] as const;
export type ErrorCode = (typeof ErrorCodes)[number];

export const ApiErrorSchema = z.object({
  code: z.enum(ErrorCodes),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
