import { z } from "zod";

export const materialSchema = z.object({
  type: z.enum(["AUDIO_URL", "VIDEO_URL", "IFRAME_EMBED"]),
  url: z.string().url(),
  title: z.string().optional(),
});

const baseSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["QURAN_MEMORIZATION", "QURAN_REVISION", "TAJWEED", "HOMEWORK"]),
  targetType: z.enum(["GROUP", "CLASS", "LEVEL"]),
  targetId: z.string().min(1),
  dueDate: z.string().optional(),
  requiredRepetitions: z.coerce.number().int().min(1).max(100).default(1),
  materials: z.array(materialSchema).optional(),
});

export const createQuranAssignmentSchema = baseSchema.extend({
  type: z.literal("QURAN_MEMORIZATION").or(z.literal("QURAN_REVISION")),
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyahNumber: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyahNumber: z.coerce.number().int().min(1),
});

export const createTajweedAssignmentSchema = baseSchema.extend({
  type: z.literal("TAJWEED"),
  topicTitle: z.string().min(2),
  topicDescription: z.string().optional(),
  materialUrl: z.string().url().optional().or(z.literal("")),
});

export const createHomeworkAssignmentSchema = baseSchema.extend({
  type: z.literal("HOMEWORK"),
  instructions: z.string().min(2),
});

export const createAssignmentSchema = z.discriminatedUnion("type", [
  createQuranAssignmentSchema.extend({ type: z.literal("QURAN_MEMORIZATION") }),
  createQuranAssignmentSchema.extend({ type: z.literal("QURAN_REVISION") }),
  createTajweedAssignmentSchema,
  createHomeworkAssignmentSchema,
]);

export const confirmListeningSchema = z.object({
  studentAssignmentId: z.string().min(1),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type ConfirmListeningInput = z.infer<typeof confirmListeningSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
