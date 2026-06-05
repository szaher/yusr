"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { updateNotificationPreference } from "@/server/services/notification";
import { revalidatePath } from "next/cache";

export async function updatePreferenceAction(formData: FormData) {
  const session = await requireApprovedUser();
  const type = formData.get("type") as string;
  const field = formData.get("field") as "inApp" | "push";
  const enabled = formData.get("enabled") === "true";

  if (!type || !field) return { error: "validationError" };

  await updateNotificationPreference(session.user.id, type, { [field]: enabled });
  revalidatePath("/[locale]/student/notifications/preferences", "page");
  return { success: true };
}
