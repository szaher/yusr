"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createLeaveRequest, reviewLeaveRequest } from "@/server/services/leave-request";
import { createLeaveRequestSchema, reviewLeaveRequestSchema } from "@/lib/validations/leave-request";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

export async function createLeaveRequestAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createLeaveRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return { error: "noStudentProfile" };
  }

  try {
    await createLeaveRequest(parsed.data, studentProfile.id, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/student/leave-requests");
  revalidatePath("/en/student/leave-requests");
  revalidatePath("/ar/moderator/leave-requests");
  revalidatePath("/en/moderator/leave-requests");
  return { success: true };
}

export async function reviewLeaveRequestAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LEAVE_REQUESTS_REVIEW);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = reviewLeaveRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await reviewLeaveRequest(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/student/leave-requests");
  revalidatePath("/en/student/leave-requests");
  revalidatePath("/ar/moderator/leave-requests");
  revalidatePath("/en/moderator/leave-requests");
  return { success: true };
}
