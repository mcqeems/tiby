import { z } from "zod";

export const HealthSchema = z.object({
  status: z.literal("ok"),
});
export type Health = z.infer<typeof HealthSchema>;

export * from "./enums.js";
export * from "./error.js";
export * from "./push.schema.js";
export * from "./whatsapp.schema.js";
export * from "./check-in.schema.js";
export * from "./onboarding.schema.js";
export * from "./faskes.schema.js";
export * from "./tickets.schema.js";
