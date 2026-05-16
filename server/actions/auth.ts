"use server";

import { signIn, signOut } from "@/server/auth/config";
import { registerStudent, getEnrollmentState } from "@/server/services/enrollment";
import { registerSchema, forgotPasswordSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { generateResetToken } from "@/server/auth/password";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    return { error: "invalidCredentials" };
  }

  redirect("/ar/student/dashboard");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/ar/login");
}

export async function registerAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const enrollmentState = await getEnrollmentState();

  if (enrollmentState === "closed" || enrollmentState === "paused") {
    return { error: "enrollmentClosed" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse({
    ...raw,
    consent: raw.consent === "on" || raw.consent === "true" ? true : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "validationError" };
  }

  try {
    await registerStudent(parsed.data);
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "Email already registered") {
      return { error: "emailExists" };
    }
    return { error: "unknownError" };
  }
}

export async function forgotPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const parsed = forgotPasswordSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!parsed.success) {
    return { error: "invalidEmail" };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always return success to prevent email enumeration
  if (!user) return { success: true };

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  // In MVP, log the link. Email provider abstraction ready but not wired.
  console.log(
    `[Password Reset] ${user.email}: /ar/reset-password/${token}`
  );

  return { success: true };
}
