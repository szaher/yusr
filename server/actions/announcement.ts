"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requireApprovedUser } from "@/server/auth/session";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/server/services/announcement";
import { createAnnouncementSchema, updateAnnouncementSchema } from "@/lib/validations/announcement";
import { revalidatePath } from "next/cache";
import { logger } from "@/server/lib/logger";

export async function createAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createAnnouncementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createAnnouncement(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "createAnnouncementAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  revalidatePath("/ar/admin/dashboard");
  revalidatePath("/en/admin/dashboard");
  revalidatePath("/ar/moderator/dashboard");
  revalidatePath("/en/moderator/dashboard");
  revalidatePath("/ar/student/dashboard");
  revalidatePath("/en/student/dashboard");
  revalidatePath("/ar/support/dashboard");
  revalidatePath("/en/support/dashboard");
  return { success: true };
}

export async function updateAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateAnnouncementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateAnnouncement(parsed.data, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "updateAnnouncementAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  return { success: true };
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const announcementId = formData.get("announcementId") as string;
  if (!announcementId) {
    return { error: "missingId" };
  }

  try {
    await deleteAnnouncement(announcementId, session.user.id);
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), action: "deleteAnnouncementAction" }, "Action failed");
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  return { success: true };
}
