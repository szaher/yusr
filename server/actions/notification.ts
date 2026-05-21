"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { markNotificationRead, markAllNotificationsRead } from "@/server/services/notification";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(formData: FormData) {
  await requireApprovedUser();

  const notificationId = formData.get("notificationId") as string;
  if (!notificationId) {
    return { error: "missingId" };
  }

  await markNotificationRead(notificationId);
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await requireApprovedUser();

  await markAllNotificationsRead(session.user.id);

  revalidatePath("/ar");
  revalidatePath("/en");
  return { success: true };
}
