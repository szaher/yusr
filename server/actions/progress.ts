"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { createCustomGoal, deleteCustomGoal } from "@/server/services/progress";
import { revalidatePath } from "next/cache";

export async function createCustomGoalAction(
  planId: string,
  data: { title: string; targetSurahNumber: number; targetAyahNumber: number; deadline?: string },
) {
  const session = await requireApprovedUser();
  await createCustomGoal(planId, data, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "page");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}

export async function deleteCustomGoalAction(goalId: string) {
  const session = await requireApprovedUser();
  await deleteCustomGoal(goalId, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "page");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}
