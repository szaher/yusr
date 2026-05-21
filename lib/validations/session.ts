import { z } from "zod";

export const createSessionSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

const sessionStatusEnum = z.enum([
  "SCHEDULED",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const updateSessionStatusSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusEnum,
});

export type UpdateSessionStatusInput = z.infer<typeof updateSessionStatusSchema>;

export const updateMeetingLinkSchema = z.object({
  sessionId: z.string().min(1),
  meetingLink: z.string().url().or(z.literal("")),
});

export type UpdateMeetingLinkInput = z.infer<typeof updateMeetingLinkSchema>;

const attendanceEnum = z.enum([
  "PENDING",
  "PRESENT",
  "ABSENT",
  "EXCUSED_ABSENCE",
  "LATE",
]);

const recitationResultEnum = z.enum([
  "NOT_GRADED",
  "EXCELLENT",
  "GOOD",
  "NEEDS_REVIEW",
  "INCOMPLETE",
  "NOT_RECITED",
]);

const reviewRangeSchema = z.object({
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyahNumber: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyahNumber: z.coerce.number().int().min(1),
  note: z.string().optional(),
});

export const gradeStudentSchema = z.object({
  sessionStudentId: z.string().min(1),
  attendance: attendanceEnum,
  recitationResult: recitationResultEnum,
  numericGrade: z.coerce.number().min(0).max(100).optional().nullable(),
  mistakeCount: z.coerce.number().int().min(0).optional().nullable(),
  tajweedNotes: z.string().optional(),
  memorizationNotes: z.string().optional(),
  fluencyNotes: z.string().optional(),
  comment: z.string().optional(),
  voiceNoteUrl: z.string().url().optional().or(z.literal("")),
  reviewRanges: z.array(reviewRangeSchema).optional(),
});

export type GradeStudentInput = z.infer<typeof gradeStudentSchema>;
export type ReviewRangeInput = z.infer<typeof reviewRangeSchema>;
