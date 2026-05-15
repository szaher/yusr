import { z } from "zod";

export const createModeratorSchema = z.object({
  name: z.string().min(2).max(100),
  nameAr: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const updateAccountStatusSchema = z.object({
  userId: z.string().cuid(),
  status: z.enum(["ACTIVE", "DEACTIVATED", "BANNED", "EXPELLED"]),
});

export type CreateModeratorInput = z.infer<typeof createModeratorSchema>;
export type UpdateAccountStatusInput = z.infer<
  typeof updateAccountStatusSchema
>;
