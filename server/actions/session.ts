"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createSession,
  updateSessionStatus,
  updateMeetingLink,
  gradeStudent,
} from "@/server/services/session";
import {
  createSessionSchema,
  updateSessionStatusSchema,
  updateMeetingLinkSchema,
  gradeStudentSchema,
} from "@/lib/validations/session";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";

export async function createSessionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  if (session.user.role === "moderator") {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (!groupIds.includes(parsed.data.groupId)) {
      return { error: "notAuthorized" };
    }
  }

  await createSession(parsed.data, session.user.id);

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/admin/sessions");
  revalidatePath("/en/admin/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  return { success: true };
}

export async function updateSessionStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_START);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSessionStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  if (session.user.role === "moderator") {
    const weeklySession = await db.weeklySession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { group: { select: { moderatorId: true } } },
    });
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (weeklySession?.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  try {
    await updateSessionStatus(parsed.data.sessionId, parsed.data.status, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/admin/sessions");
  revalidatePath("/en/admin/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  return { success: true };
}

export async function updateMeetingLinkAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateMeetingLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  if (session.user.role === "moderator") {
    const weeklySession = await db.weeklySession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { group: { select: { moderatorId: true } } },
    });
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (weeklySession?.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  await updateMeetingLink(parsed.data.sessionId, parsed.data.meetingLink, session.user.id);

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  return { success: true };
}

export async function gradeStudentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_GRADE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const reviewRanges: Array<{
    fromSurahNumber: number;
    fromAyahNumber: number;
    toSurahNumber: number;
    toAyahNumber: number;
    note?: string;
  }> = [];
  let i = 0;
  while (raw[`reviewRanges.${i}.fromSurahNumber`]) {
    reviewRanges.push({
      fromSurahNumber: Number(raw[`reviewRanges.${i}.fromSurahNumber`]),
      fromAyahNumber: Number(raw[`reviewRanges.${i}.fromAyahNumber`]),
      toSurahNumber: Number(raw[`reviewRanges.${i}.toSurahNumber`]),
      toAyahNumber: Number(raw[`reviewRanges.${i}.toAyahNumber`]),
      note: (raw[`reviewRanges.${i}.note`] as string) || undefined,
    });
    i++;
  }

  const input = {
    sessionStudentId: raw.sessionStudentId as string,
    attendance: raw.attendance as string,
    recitationResult: raw.recitationResult as string,
    numericGrade: raw.numericGrade ? Number(raw.numericGrade) : undefined,
    mistakeCount: raw.mistakeCount ? Number(raw.mistakeCount) : undefined,
    tajweedNotes: (raw.tajweedNotes as string) || undefined,
    memorizationNotes: (raw.memorizationNotes as string) || undefined,
    fluencyNotes: (raw.fluencyNotes as string) || undefined,
    comment: (raw.comment as string) || undefined,
    voiceNoteUrl: (raw.voiceNoteUrl as string) || undefined,
    reviewRanges: reviewRanges.length > 0 ? reviewRanges : undefined,
  };

  const parsed = gradeStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  if (session.user.role === "moderator") {
    const sessionStudent = await db.sessionStudent.findUnique({
      where: { id: parsed.data.sessionStudentId },
      select: { session: { select: { group: { select: { moderatorId: true } } } } },
    });
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (sessionStudent?.session.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  try {
    await gradeStudent(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  revalidatePath("/ar/student/grades");
  revalidatePath("/en/student/grades");
  return { success: true };
}
