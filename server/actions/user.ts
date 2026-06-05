"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createModerator,
  updateAccountStatus,
  promoteToModerator,
} from "@/server/services/user";
import {
  createModeratorSchema,
  updateAccountStatusSchema,
} from "@/lib/validations/user";
import { revalidatePath } from "next/cache";
import { logger } from "@/server/lib/logger";

export async function createModeratorAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MODERATORS_ASSIGN);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = createModeratorSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "validationError" };
  }

  try {
    await createModerator(parsed.data, session.user.id);
    revalidatePath("/ar/admin/users");
    revalidatePath("/en/admin/users");
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "Email already registered") {
      return { error: "emailExists" };
    }
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createModeratorAction" }, "Action failed");
    return { error: "unknownError" };
  }
}

export async function promoteToModeratorAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MODERATORS_ASSIGN);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "validationError" };

  try {
    await promoteToModerator(userId, session.user.id);
    revalidatePath("/ar/admin/users");
    revalidatePath("/en/admin/users");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function updateAccountStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_BAN);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = updateAccountStatusSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) return { error: "validationError" };

  await updateAccountStatus(
    parsed.data.userId,
    parsed.data.status,
    session.user.id
  );

  revalidatePath("/ar/admin/users");
  revalidatePath("/en/admin/users");
  return { success: true };
}
