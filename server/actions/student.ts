"use server";

import { auth } from "@/server/auth/config";
import { db } from "@/server/db/client";
import { updateStudentProfileSchema } from "@/lib/validations/student";
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
