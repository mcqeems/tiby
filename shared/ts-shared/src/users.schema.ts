import { z } from "zod";
import { UserRoleSchema } from "./enums.js";

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and dashes"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
  role: UserRoleSchema,
  facilityId: z.string().uuid().optional(),
  whatsappNumber: z.string().min(8).max(20).optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const ChangeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
export type ChangeOwnPasswordDto = z.infer<typeof ChangeOwnPasswordSchema>;

export const ResetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
export type ResetUserPasswordDto = z.infer<typeof ResetUserPasswordSchema>;

export const UserSummarySchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  name: z.string(),
  role: z.string(),
  facilityId: z.string().nullable().optional(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;
