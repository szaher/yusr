"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { checkAttendanceAlerts, upsertAlertConfig } from "@/server/services/attendance";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const markQuickAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.string().min(1),
  })),
});

export async function markQuickAttendanceAction(
  sessionId: string,
  records: { studentId: string; status: string }[]
) {
  const parsed = markQuickAttendanceSchema.safeParse({ sessionId, records });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const session = await requireApprovedUser();

  const weeklySession = await db.weeklySession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      group: { select: { moderatorId: true } },
    },
  });

  if (!weeklySession) return { error: "sessionNotFound" };
  if (weeklySession.status !== "SCHEDULED" && weeklySession.status !== "OPEN") {
    return { error: "sessionNotMarkable" };
  }

  if (session.user.role === "moderator") {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (weeklySession.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  const validStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED_ABSENCE"];

  await db.$transaction(
    records
      .filter((r) => validStatuses.includes(r.status))
      .map((r) =>
        db.sessionStudent.updateMany({
          where: { sessionId, studentId: r.studentId },
          data: { attendance: r.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED_ABSENCE" },
        })
      )
  );

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "ATTENDANCE_QUICK_MARK",
      entityType: "WeeklySession",
      entityId: sessionId,
      metadata: { studentCount: records.length },
    },
  });

  await checkAttendanceAlerts(sessionId);

  revalidatePath("/ar/moderator/attendance");
  revalidatePath("/en/moderator/attendance");
  revalidatePath("/ar/admin/attendance");
  revalidatePath("/en/admin/attendance");

  return { success: true };
}

export async function updateAlertConfigAction(
  groupId: string | null,
  data: {
    consecutiveAbsenceThreshold: number;
    attendanceRateThreshold: number;
    notifyModerator: boolean;
    notifyAdmin: boolean;
  }
) {
  const session = await requireApprovedUser();

  if (groupId === null && session.user.role !== "admin") {
    return { error: "notAuthorized" };
  }

  if (session.user.role === "moderator" && groupId) {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (!groupIds.includes(groupId)) {
      return { error: "notAuthorized" };
    }
  }

  const oldConfig = await db.attendanceAlertConfig.findFirst({
    where: { groupId },
  });

  await upsertAlertConfig(groupId, data);

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "ATTENDANCE_CONFIG_UPDATE",
      entityType: "AttendanceAlertConfig",
      entityId: groupId ?? "school-default",
      metadata: {
        oldValues: oldConfig
          ? {
              consecutiveAbsenceThreshold: oldConfig.consecutiveAbsenceThreshold,
              attendanceRateThreshold: oldConfig.attendanceRateThreshold,
            }
          : null,
        newValues: data,
      },
    },
  });

  revalidatePath("/ar/moderator/attendance");
  revalidatePath("/en/moderator/attendance");
  revalidatePath("/ar/admin/attendance");
  revalidatePath("/en/admin/attendance");

  return { success: true };
}
