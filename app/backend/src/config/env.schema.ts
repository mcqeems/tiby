import { z } from "zod";

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().default("http://localhost:3001"),

  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),

  PII_ENCRYPTION_KEY: z
    .string()
    .length(64, "PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
    .default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),

  AI_SERVICE_URL: z.string().default("http://localhost:8000"),

  WAHA_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  WAHA_BASE_URL: z.string().default("http://localhost:3008"),
  WAHA_SESSION: z.string().default("default"),
  WAHA_API_KEY: z.string().optional().default(""),
  WAHA_BOT_PHONE_NUMBER: z.string().optional().default(""),
  WAHA_WEBHOOK_SECRET: z.string().optional().default(""),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Config validation error: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
    );
  }
  return result.data;
}
