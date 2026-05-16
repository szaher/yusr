"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  approveApplication,
  rejectApplication,
  waitlistApplication,
  setEnrollmentState,
} from "@/server/services/enrollment";
import { reviewApplicationSchema } from "@/lib/validations/enrollment";
import { revalidatePath } from "next/cache";

export async function reviewApplicationAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_APPROVE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = reviewApplicationSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) return { error: "validationError" };

  const { applicationId, action, reviewNote } = parsed.data;

  switch (action) {
    case "approve":
      await approveApplication(applicationId, session.user.id, reviewNote);
      break;
    case "reject":
      await rejectApplication(applicationId, session.user.id, reviewNote);
      break;
    case "waitlist":
      await waitlistApplication(applicationId, session.user.id, reviewNote);
      break;
  }

  revalidatePath("/ar/admin/enrollment");
  return { success: true };
}

export async function updateEnrollmentStateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const state = formData.get("state") as string;
  if (!["open", "closed", "paused", "waitlist_only"].includes(state)) {
    return { error: "invalidState" };
  }

  await setEnrollmentState(state, session.user.id);
  revalidatePath("/ar/admin/settings");
  return { success: true };
}
