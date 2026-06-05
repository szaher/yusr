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

export const updateLevelSchema = createLevelSchema.extend({ id: z.string().min(1) });
export const updateClassSchema = createClassSchema.extend({ id: z.string().min(1) });
export const updateGroupSchema = createGroupSchema.extend({ id: z.string().min(1) });

export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
