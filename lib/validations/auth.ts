import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "invalidEmail" }),
  password: z.string().min(8, { message: "passwordTooShort" }),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, { message: "nameTooShort" }).max(100),
    email: z.string().email({ message: "invalidEmail" }),
    password: z.string().min(8, { message: "passwordTooShort" }).max(100),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    currentQuranLevel: z.string().optional(),
    currentTajweedLevel: z.string().optional(),
    previousBackground: z.string().optional(),
    parentContact: z.string().optional(),
    preferredDay: z.string().optional(),
    availabilityNotes: z.string().optional(),
    consent: z.literal(true, {
      message: "You must agree to the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMismatch",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: "passwordTooShort" }).max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMismatch",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
