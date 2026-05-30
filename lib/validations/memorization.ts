import { z } from "zod";

const paceUnitEnum = z.enum(["RUB", "HIZB", "PAGE_COUNT"]);
const meetingCadenceEnum = z.enum(["WEEKLY", "BIWEEKLY", "TWICE_WEEKLY", "CUSTOM"]);
const recitationResultEnum = z.enum([
  "EXCELLENT",
  "GOOD",
  "ACCEPTABLE",
  "NEEDS_IMPROVEMENT",
  "FAILED",
]);
const mistakeCategoryEnum = z.enum([
  "TAJWEED_ERROR",
  "WRONG_WORD",
  "HESITATION",
  "SKIPPED_AYAH",
  "REPEATED_AYAH",
  "OTHER",
]);

export const createPlanSchema = z
  .object({
    studentId: z.string().min(1),
    groupId: z.string().min(1),
    surahNumber: z.coerce.number().int().min(1).max(114),
    ayahNumber: z.coerce.number().int().min(1),
    paceUnit: paceUnitEnum,
    paceValue: z.coerce.number().min(1),
    meetingCadence: meetingCadenceEnum.optional(),
    customCadenceDays: z.coerce.number().int().min(1).optional(),
    templateId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paceUnit === "PAGE_COUNT" && data.paceValue < 1.5) return false;
      return true;
    },
    { message: "Page count pace must be at least 1.5", path: ["paceValue"] }
  );

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z
  .object({
    planId: z.string().min(1),
    paceUnit: paceUnitEnum.optional(),
    paceValue: z.coerce.number().min(1).optional(),
    meetingCadence: meetingCadenceEnum.nullable().optional(),
    customCadenceDays: z.coerce.number().int().min(1).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.paceUnit === "PAGE_COUNT" && data.paceValue != null && data.paceValue < 1.5) return false;
      return true;
    },
    { message: "Page count pace must be at least 1.5", path: ["paceValue"] }
  );

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

const tajweedScoreSchema = z.object({
  categoryId: z.string().min(1),
  score: z.coerce.number().int().min(1).max(10),
  notes: z.string().optional(),
});

const mistakeSchema = z.object({
  category: mistakeCategoryEnum,
  notes: z.string().min(1),
});

export const createReviewSchema = z.object({
  planId: z.string().min(1),
  sessionId: z.string().optional(),
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyah: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyah: z.coerce.number().int().min(1),
  recitationResult: recitationResultEnum,
  grade: z.coerce.number().int().min(0).max(100),
  notes: z.string().optional(),
  voiceNoteUrl: z.string().url().optional().or(z.literal("")),
  nextFromSurahNumber: z.coerce.number().int().min(1).max(114),
  nextFromAyah: z.coerce.number().int().min(1),
  nextToSurahNumber: z.coerce.number().int().min(1).max(114),
  nextToAyah: z.coerce.number().int().min(1),
  tajweedScores: z.array(tajweedScoreSchema).optional(),
  mistakes: z.array(mistakeSchema).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type TajweedScoreInput = z.infer<typeof tajweedScoreSchema>;
export type MistakeInput = z.infer<typeof mistakeSchema>;

export const tajweedCategorySchema = z.object({
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0),
});

export type TajweedCategoryInput = z.infer<typeof tajweedCategorySchema>;

export const updateGroupCadenceSchema = z.object({
  groupId: z.string().min(1),
  meetingCadence: meetingCadenceEnum,
  customCadenceDays: z.coerce.number().int().min(1).optional(),
  memorizationPlansEnabled: z.coerce.boolean(),
});

export type UpdateGroupCadenceInput = z.infer<typeof updateGroupCadenceSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  paceUnit: paceUnitEnum,
  paceValue: z.coerce.number().min(0.5),
  description: z.string().max(500).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().min(1).max(100).optional(),
  paceUnit: paceUnitEnum.optional(),
  paceValue: z.coerce.number().min(0.5).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const setOverrideSchema = z.object({
  planId: z.string().min(1),
  paceUnit: paceUnitEnum,
  paceValue: z.coerce.number().min(0.5),
  note: z.string().max(500).optional(),
});

export type SetOverrideInput = z.infer<typeof setOverrideSchema>;
