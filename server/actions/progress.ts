"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { createCustomGoal, deleteCustomGoal } from "@/server/services/progress";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";

export async function createCustomGoalAction(
  planId: string,
  data: { title: string; targetSurahNumber: number; targetAyahNumber: number; deadline?: string },
) {
  const session = await requireApprovedUser();

  const plan = await db.studentMemorizationPlan.findFirst({
    where: {
      id: planId,
      group: { moderator: { userId: session.user.id } },
    },
  });
  if (!plan) throw new Error("Unauthorized");

  await createCustomGoal(planId, data, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}

export async function deleteCustomGoalAction(goalId: string) {
  const session = await requireApprovedUser();

  const goal = await db.customGoal.findFirst({
    where: {
      id: goalId,
      plan: { group: { moderator: { userId: session.user.id } } },
    },
  });
  if (!goal) throw new Error("Unauthorized");

  await deleteCustomGoal(goalId, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}
