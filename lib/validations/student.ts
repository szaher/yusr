import { z } from "zod";

export const updateStudentProfileSchema = z.object({
  phone: z.string().optional(),
  country: z.string().optional(),
  currentQuranLevel: z.string().optional(),
  currentTajweedLevel: z.string().optional(),
  preferredDay: z.string().optional(),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;
