import { z } from "zod";

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.coerce.number().int().min(1).max(100),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.coerce.number().int().min(1).max(100),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const addQuestionSchema = z.object({
  templateId: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "RECITATION"]),
  text: z.string().min(1).max(2000),
  points: z.coerce.number().int().min(1).max(100),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  fromSurahNumber: z.coerce.number().int().optional(),
  fromAyah: z.coerce.number().int().optional(),
  toSurahNumber: z.coerce.number().int().optional(),
  toAyah: z.coerce.number().int().optional(),
});

export type AddQuestionInput = z.infer<typeof addQuestionSchema>;

export const deleteQuestionSchema = z.object({
  questionId: z.string().min(1),
  templateId: z.string().min(1),
});

export type DeleteQuestionInput = z.infer<typeof deleteQuestionSchema>;

export const assignToGroupsSchema = z.object({
  templateId: z.string().min(1),
  groupIds: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  sessionId: z.string().optional(),
});

export type AssignToGroupsInput = z.infer<typeof assignToGroupsSchema>;

export const changeInstanceStatusSchema = z.object({
  instanceId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED"]),
});

export type ChangeInstanceStatusInput = z.infer<typeof changeInstanceStatusSchema>;

export const customizeInstanceSchema = z.object({
  instanceId: z.string().min(1),
  customizations: z.string().min(1),
});

export type CustomizeInstanceInput = z.infer<typeof customizeInstanceSchema>;

export const saveAnswersSchema = z.object({
  instanceId: z.string().min(1),
  answers: z.string().min(1),
  submit: z.string().optional(),
});

export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  grades: z.string().min(1),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
