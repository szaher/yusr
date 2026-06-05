"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createAssignment,
  confirmListening,
  deleteAssignment,
} from "@/server/services/assignment";
import {
  createAssignmentSchema,
  confirmListeningSchema,
  materialSchema,
} from "@/lib/validations/assignment";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db/client";
import { logger } from "@/server/lib/logger";

export async function createAssignmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSIGNMENTS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const materialsRaw: z.infer<typeof materialSchema>[] = [];
  let i = 0;
  while (raw[`materials.${i}.url`]) {
    materialsRaw.push({
      type: raw[`materials.${i}.type`] as "AUDIO_URL" | "VIDEO_URL" | "IFRAME_EMBED",
      url: raw[`materials.${i}.url`] as string,
      title: (raw[`materials.${i}.title`] as string) || undefined,
    });
    i++;
  }

  const input = {
    title: raw.title as string,
    description: (raw.description as string) || undefined,
    type: raw.type as string,
    targetType: raw.targetType as string,
    targetId: raw.targetId as string,
    dueDate: (raw.dueDate as string) || undefined,
    requiredRepetitions: raw.requiredRepetitions ? Number(raw.requiredRepetitions) : 1,
    ...(raw.type === "QURAN_MEMORIZATION" || raw.type === "QURAN_REVISION"
      ? {
          fromSurahNumber: Number(raw.fromSurahNumber),
          fromAyahNumber: Number(raw.fromAyahNumber),
          toSurahNumber: Number(raw.toSurahNumber),
          toAyahNumber: Number(raw.toAyahNumber),
        }
      : {}),
    ...(raw.type === "TAJWEED"
      ? {
          topicTitle: raw.topicTitle as string,
          topicDescription: (raw.topicDescription as string) || undefined,
          materialUrl: (raw.materialUrl as string) || undefined,
        }
      : {}),
    ...(raw.type === "HOMEWORK"
      ? { instructions: raw.instructions as string }
      : {}),
  };

  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const role = session.user.role;
  if (role === "moderator") {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (parsed.data.targetType === "GROUP" && !groupIds.includes(parsed.data.targetId)) {
      return { error: "notAuthorized" };
    }
  }

  await createAssignment(parsed.data, materialsRaw, session.user.id);

  revalidatePath("/ar/moderator/assignments");
  revalidatePath("/en/moderator/assignments");
  revalidatePath("/ar/admin/assignments");
  revalidatePath("/en/admin/assignments");
  revalidatePath("/ar/student/assignments");
  revalidatePath("/en/student/assignments");
  return { success: true };
}

export async function confirmListeningAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = confirmListeningSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  try {
    const result = await confirmListening(parsed.data.studentAssignmentId, session.user.id);
    revalidatePath("/ar/student/assignments");
    revalidatePath("/en/student/assignments");
    return { success: true, ...result };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "confirmListeningAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function deleteAssignmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSIGNMENTS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const assignmentId = formData.get("assignmentId") as string;
  if (!assignmentId) return { error: "validationError" };

  const role = session.user.role;
  if (role === "moderator") {
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: { createdById: true, targetId: true },
    });
    if (!assignment) return { error: "notFound" };

    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];

    if (assignment.createdById !== session.user.id && !groupIds.includes(assignment.targetId)) {
      return { error: "notAuthorized" };
    }
  }

  await deleteAssignment(assignmentId, session.user.id);

  revalidatePath("/ar/moderator/assignments");
  revalidatePath("/en/moderator/assignments");
  revalidatePath("/ar/admin/assignments");
  revalidatePath("/en/admin/assignments");
  return { success: true };
}
