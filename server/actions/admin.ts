"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import { toggleFeatureFlag } from "@/server/services/feature-flag";
import { db } from "@/server/db/client";
import { createAuditLog } from "@/server/services/audit-log";
import { revalidatePath } from "next/cache";

export async function toggleFeatureFlagAction(formData: FormData) {
  await requirePermission(PERMISSIONS.FEATURE_FLAGS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const key = formData.get("key") as string;
  const enabled = formData.get("enabled") === "true";

  await toggleFeatureFlag(key, enabled, session.user.id);
  revalidatePath("/ar/admin/feature-flags");
  return { success: true };
}

export async function updateSystemSettingAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const key = formData.get("key") as string;
  const value = formData.get("value") as string;

  await db.systemSetting.update({
    where: { key },
    data: { value },
  });

  await createAuditLog({
    actorId: session.user.id,
    action: "setting.updated",
    entityType: "SystemSetting",
    entityId: key,
    metadata: { value },
  });

  revalidatePath("/ar/admin/settings");
  return { success: true };
}
