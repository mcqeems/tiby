import { z } from "zod";

export const FacilityItemSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  district: z.string(),
  emergencyPhone: z.string(),
  createdAt: z.string(),
});
export type FacilityItem = z.infer<typeof FacilityItemSchema>;

export const FacilityListResponseSchema = z.object({
  items: z.array(FacilityItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type FacilityListResponse = z.infer<typeof FacilityListResponseSchema>;

export const CreateFacilitySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(2).max(255),
  district: z.string().min(2).max(255),
  emergencyPhone: z.string().min(5).max(50),
});
export type CreateFacilityDto = z.infer<typeof CreateFacilitySchema>;

export const UpdateFacilitySchema = CreateFacilitySchema.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: "At least one field must be provided" },
);
export type UpdateFacilityDto = z.infer<typeof UpdateFacilitySchema>;
