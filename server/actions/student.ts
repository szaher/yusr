"use server";

import { auth } from "@/server/auth/config";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { updateStudentProfileSchema } from "@/lib/validations/student";
import { changePasswordSchema } from "@/lib/validations/auth";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { revalidatePath } from "next/cache";

export async function updateStudentProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateStudentProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return { error: "profileNotFound" };
  }

  await db.studentProfile.update({
    where: { id: profile.id },
    data: {
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
      currentQuranLevel: parsed.data.currentQuranLevel || null,
      currentTajweedLevel: parsed.data.currentTajweedLevel || null,
      preferredDay: parsed.data.preferredDay || null,
    },
  });

  revalidatePath("/ar/student/profile");
  revalidatePath("/en/student/profile");
  return { success: true };
}

export async function changePasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const session = await requireApprovedUser();
  const parsed = changePasswordSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) return { error: "validationError" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { error: "unknownError" };

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) return { error: "currentPasswordIncorrect" };

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash, tokenVersion: { increment: 1 } },
  });

  revalidatePath("/[locale]/student/profile", "page");
  return { success: true };
}
