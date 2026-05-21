import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  leaveRequestId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;
