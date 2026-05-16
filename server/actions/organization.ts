"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createLevel,
  createClass,
  createGroup,
  assignStudentToGroup,
} from "@/server/services/organization";
import {
  createLevelSchema,
  createClassSchema,
  createGroupSchema,
} from "@/lib/validations/organization";
import { assignStudentSchema } from "@/lib/validations/enrollment";
import { revalidatePath } from "next/cache";

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

  await createLevel(parsed.data, session.user.id);
  revalidatePath("/ar/admin/levels");
  return { success: true };
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

  await createClass(parsed.data, session.user.id);
  revalidatePath("/ar/admin/classes");
  return { success: true };
}

export async function createGroupAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = createGroupSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) return { error: "validationError" };

  await createGroup(parsed.data, session.user.id);
  revalidatePath("/ar/admin/groups");
  return { success: true };
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
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}
