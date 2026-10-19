import { z } from "zod";
import { UserRoleSchema } from "./enums.js";

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and dashes"),
  email: z.email().max(50).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
  role: UserRoleSchema,
  facilityId: z.uuid().optional(),
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
  email: z.email().optional(),
  name: z.string(),
  role: z.string(),
  facilityId: z.string().nullable().optional(),
  facility: z.string().nullable().optional()
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const SignInSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.identifier || data.username || data.email), {
    message: "Either identifier, username, or email is required",
    path: ["identifier"],
  });
export type SignInDto = z.infer<typeof SignInSchema>;
