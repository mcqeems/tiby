import { z } from "zod";
import { UserRoleSchema } from "./enums.js";
import { PaginationQuerySchema } from "./faskes.schema.js";

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username may only contain letters, numbers, underscores, and dashes",
    ),
  email: z.email().max(50).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
  role: UserRoleSchema,
  facilityId: z.uuid().optional(),
  whatsappNumber: z.string().min(4).max(30).optional(),
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

export const UpdateUserSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    email: z.email().max(50).optional(),
    whatsappNumber: z.string().min(4).max(30).nullable().optional(),
    role: UserRoleSchema.optional(),
    facilityId: z.uuid().nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const UserSummarySchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.email().optional(),
  name: z.string(),
  role: z.string(),
  image: z.string().nullable().optional(),
  whatsappNumber: z.string().optional(),
  facilityId: z.string().nullable().optional(),
  facility: z.string().nullable().optional(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  /** Comma-separated roles, e.g. `role=NAKES,ADMIN`. */
  role: z
    .string()
    .transform((value) => value.split(",").map((r) => r.trim()))
    .pipe(z.array(UserRoleSchema))
    .optional(),
  search: z.string().optional(),
  /** ADMIN only: restrict the list to one facility. */
  facilityId: z.uuid().optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const UserListResponseSchema = z.object({
  items: z.array(UserSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

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

export const UploadProfilePictureResponseSchema = z.object({
  imageUrl: z.string(),
});
export type UploadProfilePictureResponse = z.infer<
  typeof UploadProfilePictureResponseSchema
>;
