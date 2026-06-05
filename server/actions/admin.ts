"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import { toggleFeatureFlag } from "@/server/services/feature-flag";
import { db } from "@/server/db/client";
import { createAuditLog } from "@/server/services/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/server/lib/logger";

const toggleFeatureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.enum(["true", "false"]),
});

export async function toggleFeatureFlagAction(formData: FormData) {
  await requirePermission(PERMISSIONS.FEATURE_FLAGS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = toggleFeatureFlagSchema.safeParse({
    key: formData.get("key"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const key = parsed.data.key;
  const enabled = parsed.data.enabled === "true";

  try {
    await toggleFeatureFlag(key, enabled, session.user.id);
    revalidatePath("/ar/admin/feature-flags");
    revalidatePath("/en/admin/feature-flags");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "toggleFeatureFlagAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function updateSystemSettingAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const key = formData.get("key") as string;
  const value = formData.get("value") as string;

  try {
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
    revalidatePath("/en/admin/settings");
    return { success: true };
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateSystemSettingAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}
