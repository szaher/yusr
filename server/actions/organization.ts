"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createLevel,
  createClass,
  createGroup,
  updateLevel,
  updateClass,
  updateGroup,
  deleteLevel,
  deleteClass,
  deleteGroup,
  assignStudentToGroup,
} from "@/server/services/organization";
import {
  createLevelSchema,
  createClassSchema,
  createGroupSchema,
  updateLevelSchema,
  updateClassSchema,
  updateGroupSchema,
} from "@/lib/validations/organization";
import { assignStudentSchema } from "@/lib/validations/enrollment";
import { revalidatePath } from "next/cache";
import { logger } from "@/server/lib/logger";

export async function createLevelAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LEVELS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createLevelSchema.safeParse({
    ...raw,
    sortOrder: raw.sortOrder ? Number(raw.sortOrder) : 0,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    await createLevel(parsed.data, session.user.id);
    revalidatePath("/ar/admin/levels");
    revalidatePath("/en/admin/levels");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createLevelAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function createClassAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createClassSchema.safeParse({
    ...raw,
    capacity: raw.capacity ? Number(raw.capacity) : undefined,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    await createClass(parsed.data, session.user.id);
    revalidatePath("/ar/admin/classes");
    revalidatePath("/en/admin/classes");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createClassAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function createGroupAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createGroupSchema.safeParse({
    ...raw,
    moderatorId: raw.moderatorId || undefined,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    await createGroup(parsed.data, session.user.id);
    revalidatePath("/ar/admin/groups");
    revalidatePath("/en/admin/groups");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createGroupAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

// ============================================================
// Level Update / Delete
// ============================================================

export async function updateLevelAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LEVELS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateLevelSchema.safeParse({
    ...raw,
    sortOrder: raw.sortOrder ? Number(raw.sortOrder) : 0,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    const { id, ...data } = parsed.data;
    await updateLevel(id, data, session.user.id);
    revalidatePath("/ar/admin/levels");
    revalidatePath("/en/admin/levels");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateLevelAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function deleteLevelAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LEVELS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  if (!id) return { error: "validationError" };

  try {
    await deleteLevel(id, session.user.id);
    revalidatePath("/ar/admin/levels");
    revalidatePath("/en/admin/levels");
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "hasChildren") {
      return { error: "hasChildren" };
    }
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "deleteLevelAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

// ============================================================
// Class Update / Delete
// ============================================================

export async function updateClassAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateClassSchema.safeParse({
    ...raw,
    capacity: raw.capacity ? Number(raw.capacity) : undefined,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    const { id, ...data } = parsed.data;
    await updateClass(id, data, session.user.id);
    revalidatePath("/ar/admin/classes");
    revalidatePath("/en/admin/classes");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateClassAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function deleteClassAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  if (!id) return { error: "validationError" };

  try {
    await deleteClass(id, session.user.id);
    revalidatePath("/ar/admin/classes");
    revalidatePath("/en/admin/classes");
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "hasChildren") {
      return { error: "hasChildren" };
    }
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "deleteClassAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

// ============================================================
// Group Update / Delete
// ============================================================

export async function updateGroupAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateGroupSchema.safeParse({
    ...raw,
    moderatorId: raw.moderatorId || undefined,
  });
  if (!parsed.success) return { error: "validationError" };

  try {
    const { id, ...data } = parsed.data;
    await updateGroup(id, data, session.user.id);
    revalidatePath("/ar/admin/groups");
    revalidatePath("/en/admin/groups");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateGroupAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function deleteGroupAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  if (!id) return { error: "validationError" };

  try {
    await deleteGroup(id, session.user.id);
    revalidatePath("/ar/admin/groups");
    revalidatePath("/en/admin/groups");
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "hasChildren") {
      return { error: "hasChildren" };
    }
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "deleteGroupAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function assignStudentToGroupAction(formData: FormData) {
  await requirePermission(PERMISSIONS.STUDENTS_ASSIGN_GROUP);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = assignStudentSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) return { error: "validationError" };

  try {
    await assignStudentToGroup(
      parsed.data.userId,
      parsed.data.groupId,
      session.user.id
    );
    revalidatePath("/ar/admin/groups");
    revalidatePath("/en/admin/groups");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "assignStudentToGroupAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}
