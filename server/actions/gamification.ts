"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { awardBadge, revokeBadge } from "@/server/services/gamification";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { z } from "zod";

const awardBadgeSchema = z.object({
  studentId: z.string().min(1),
  badgeId: z.string().min(1),
});

const revokeBadgeSchema = z.object({
  studentBadgeId: z.string().min(1),
});

export async function awardBadgeAction(
  studentId: string,
  badgeId: string,
  note?: string,
) {
  const parsed = awardBadgeSchema.safeParse({ studentId, badgeId });
  if (!parsed.success) throw new Error("Invalid input: studentId and badgeId are required");

  const session = await requireApprovedUser();

  const student = await db.studentProfile.findFirst({
    where: {
      id: studentId,
      groupStudents: {
        some: {
          group: { moderator: { userId: session.user.id } },
        },
      },
    },
  });
  if (!student) throw new Error("Unauthorized");

  await awardBadge(studentId, badgeId, session.user.id, note);

  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  revalidatePath("/[locale]/student/dashboard", "page");
  return { success: true };
}

export async function revokeBadgeAction(studentBadgeId: string) {
  const parsed = revokeBadgeSchema.safeParse({ studentBadgeId });
  if (!parsed.success) throw new Error("Invalid input: studentBadgeId is required");

  const session = await requireApprovedUser();

  const studentBadge = await db.studentBadge.findFirst({
    where: {
      id: studentBadgeId,
      student: {
        groupStudents: {
          some: {
            group: { moderator: { userId: session.user.id } },
          },
        },
      },
    },
  });
  if (!studentBadge) throw new Error("Unauthorized");

  await revokeBadge(studentBadgeId, session.user.id);

  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  revalidatePath("/[locale]/student/dashboard", "page");
  return { success: true };
}
