"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createPlan,
  updatePlan,
  setNextOverride,
  clearNextOverride,
} from "@/server/services/memorization-plan";
import { createReview } from "@/server/services/memorization-review";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/server/services/memorization-plan-template";
import {
  createTajweedCategory,
  updateTajweedCategory,
  toggleTajweedCategoryActive,
} from "@/server/services/tajweed-category";
import {
  createPlanSchema,
  updatePlanSchema,
  createReviewSchema,
  tajweedCategorySchema,
  updateGroupCadenceSchema,
  createTemplateSchema,
  updateTemplateSchema,
  setOverrideSchema,
} from "@/lib/validations/memorization";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { createAuditLog } from "@/server/services/audit-log";
import { logger } from "@/server/lib/logger";

export async function createPlanAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  // Moderator ownership check: verify the group belongs to this moderator
  if (session.user.role !== "admin") {
    const group = await db.group.findFirst({
      where: { id: parsed.data.groupId, moderator: { userId: session.user.id } },
    });
    if (!group) throw new Error("Unauthorized");
  }

  try {
    await createPlan(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createPlanAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function updatePlanAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  // Moderator ownership check: verify the plan's group belongs to this moderator
  if (session.user.role !== "admin") {
    const plan = await db.studentMemorizationPlan.findFirst({
      where: { id: parsed.data.planId, group: { moderator: { userId: session.user.id } } },
    });
    if (!plan) throw new Error("Unauthorized");
  }

  try {
    await updatePlan(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updatePlanAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function createReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_REVIEW);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const tajweedScores: Array<{ categoryId: string; score: number; notes?: string }> = [];
  let i = 0;
  while (raw[`tajweedScores.${i}.categoryId`]) {
    tajweedScores.push({
      categoryId: raw[`tajweedScores.${i}.categoryId`] as string,
      score: Number(raw[`tajweedScores.${i}.score`]),
      notes: (raw[`tajweedScores.${i}.notes`] as string) || undefined,
    });
    i++;
  }

  const mistakes: Array<{ category: string; notes: string }> = [];
  let j = 0;
  while (raw[`mistakes.${j}.category`]) {
    mistakes.push({
      category: raw[`mistakes.${j}.category`] as string,
      notes: raw[`mistakes.${j}.notes`] as string,
    });
    j++;
  }

  const input = {
    planId: raw.planId as string,
    sessionId: (raw.sessionId as string) || undefined,
    fromSurahNumber: Number(raw.fromSurahNumber),
    fromAyah: Number(raw.fromAyah),
    toSurahNumber: Number(raw.toSurahNumber),
    toAyah: Number(raw.toAyah),
    recitationResult: raw.recitationResult as string,
    grade: Number(raw.grade),
    notes: (raw.notes as string) || undefined,
    voiceNoteUrl: (raw.voiceNoteUrl as string) || undefined,
    nextFromSurahNumber: Number(raw.nextFromSurahNumber),
    nextFromAyah: Number(raw.nextFromAyah),
    nextToSurahNumber: Number(raw.nextToSurahNumber),
    nextToAyah: Number(raw.nextToAyah),
    tajweedScores: tajweedScores.length > 0 ? tajweedScores : undefined,
    mistakes: mistakes.length > 0 ? mistakes : undefined,
  };

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  // Moderator ownership check: verify the plan's group belongs to this moderator
  if (session.user.role !== "admin") {
    const plan = await db.studentMemorizationPlan.findFirst({
      where: { id: parsed.data.planId, group: { moderator: { userId: session.user.id } } },
    });
    if (!plan) throw new Error("Unauthorized");
  }

  try {
    await createReview(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createReviewAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  revalidatePath("/ar/student/grades");
  revalidatePath("/en/student/grades");
  return { success: true };
}

export async function createTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = tajweedCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  await createTajweedCategory(parsed.data, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function updateTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData.entries());
  const parsed = tajweedCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  await updateTajweedCategory(id, parsed.data, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function toggleTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  await toggleTajweedCategoryActive(id, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function updateGroupCadenceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateGroupCadenceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  // Moderator ownership check: verify the group belongs to this moderator
  if (session.user.role !== "admin") {
    const group = await db.group.findFirst({
      where: { id: parsed.data.groupId, moderator: { userId: session.user.id } },
    });
    if (!group) throw new Error("Unauthorized");
  }

  await db.group.update({
    where: { id: parsed.data.groupId },
    data: {
      meetingCadence: parsed.data.meetingCadence,
      customCadenceDays: parsed.data.customCadenceDays || null,
      memorizationPlansEnabled: parsed.data.memorizationPlansEnabled,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    action: "group.update_cadence",
    entityType: "Group",
    entityId: parsed.data.groupId,
    metadata: {
      meetingCadence: parsed.data.meetingCadence,
      memorizationPlansEnabled: parsed.data.memorizationPlansEnabled,
    },
  });

  revalidatePath("/ar/moderator/groups");
  revalidatePath("/en/moderator/groups");
  revalidatePath("/ar/admin/groups");
  revalidatePath("/en/admin/groups");
  return { success: true };
}

export async function createTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createTemplate(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createTemplateAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateTemplate(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateTemplateAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function deleteTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;

  try {
    await deleteTemplate(id, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "deleteTemplateAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function setOverrideAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = setOverrideSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  // Moderator ownership check: verify the plan's group belongs to this moderator
  if (session.user.role !== "admin") {
    const plan = await db.studentMemorizationPlan.findFirst({
      where: { id: parsed.data.planId, group: { moderator: { userId: session.user.id } } },
    });
    if (!plan) throw new Error("Unauthorized");
  }

  try {
    await setNextOverride(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "setOverrideAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function clearOverrideAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const planId = formData.get("planId") as string;

  // Moderator ownership check: verify the plan's group belongs to this moderator
  if (session.user.role !== "admin") {
    const plan = await db.studentMemorizationPlan.findFirst({
      where: { id: planId, group: { moderator: { userId: session.user.id } } },
    });
    if (!plan) throw new Error("Unauthorized");
  }

  try {
    await clearNextOverride(planId, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "clearOverrideAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}
