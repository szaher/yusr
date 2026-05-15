import { z } from "zod";

export const reviewApplicationSchema = z.object({
  applicationId: z.string().cuid(),
  action: z.enum(["approve", "reject", "waitlist"]),
  reviewNote: z.string().optional(),
});

export const assignStudentSchema = z.object({
  userId: z.string().cuid(),
  groupId: z.string().cuid(),
});

export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
export type AssignStudentInput = z.infer<typeof assignStudentSchema>;
