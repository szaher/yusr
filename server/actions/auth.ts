"use server";

import { signIn, signOut, auth } from "@/server/auth/config";
import { registerStudent, getEnrollmentState } from "@/server/services/enrollment";
import { registerSchema, forgotPasswordSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/server/db/client";
import { generateResetToken } from "@/server/auth/password";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";
import { logger } from "@/server/lib/logger";

export async function loginAction(formData: FormData) {
  const ip = await getClientIp();
  const rl = rateLimit(`login:${ip}`, 5, 60_000);
  if (!rl.success) {
    return { error: "rateLimited", retryAfter: rl.retryAfter };
  }

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

  const session = await auth();
  const role = session?.user?.role ?? "student";
  const locale = session?.user?.locale ?? "ar";
  const roleRedirects: Record<string, string> = {
    admin: `/${locale}/admin/dashboard`,
    moderator: `/${locale}/moderator/dashboard`,
    student: `/${locale}/student/dashboard`,
    support: `/${locale}/support/dashboard`,
  };

  redirect(roleRedirects[role] ?? `/${locale}/student/dashboard`);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "ar";
  await signOut({ redirect: false });
  redirect(`/${locale}/login`);
}

export async function registerAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const ip = await getClientIp();
  const rl = rateLimit(`register:${ip}`, 3, 3600_000);
  if (!rl.success) {
    return { error: "rateLimited", retryAfter: rl.retryAfter };
  }

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
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "registerAction" }, "Action failed");
    return { error: "unknownError" };
  }
}

export async function forgotPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const ip = await getClientIp();
  const rl = rateLimit(`forgot:${ip}`, 3, 3600_000);
  if (!rl.success) {
    return { error: "rateLimited", retryAfter: rl.retryAfter };
  }

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

  // Delete any existing tokens for this user before creating a new one
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Password Reset] ${user.email}: /ar/reset-password/${token}`
    );
  }

  return { success: true };
}
