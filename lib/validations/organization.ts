import { z } from "zod";

export const createLevelSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const createClassSchema = z.object({
  name: z.string().min(1).max(200),
  levelId: z.string().cuid(),
  defaultDay: z.string().optional(),
  timezone: z.string().default("UTC"),
  sessionTime: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  genderPolicy: z.string().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(200),
  classId: z.string().cuid(),
  moderatorId: z.string().cuid().optional(),
  weeklyDay: z.string().optional(),
  weeklyTime: z.string().optional(),
});

export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
