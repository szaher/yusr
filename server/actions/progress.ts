"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { createCustomGoal, deleteCustomGoal } from "@/server/services/progress";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { z } from "zod";

const createCustomGoalSchema = z.object({
  planId: z.string().min(1),
  data: z.object({
    title: z.string().min(1),
    targetSurahNumber: z.number().int().positive(),
    targetAyahNumber: z.number().int().positive(),
    deadline: z.string().optional(),
  }),
});

const deleteCustomGoalSchema = z.object({
  goalId: z.string().min(1),
});

export async function createCustomGoalAction(
  planId: string,
  data: { title: string; targetSurahNumber: number; targetAyahNumber: number; deadline?: string },
) {
  const parsed = createCustomGoalSchema.safeParse({ planId, data });
  if (!parsed.success) throw new Error("Invalid input");

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
  const parsed = deleteCustomGoalSchema.safeParse({ goalId });
  if (!parsed.success) throw new Error("Invalid input: goalId is required");

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
