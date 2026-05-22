import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification } from "./notification";
import type { CreateLeaveRequestInput, ReviewLeaveRequestInput } from "@/lib/validations/leave-request";

export async function createLeaveRequest(input: CreateLeaveRequestInput, studentProfileId: string, actorId: string) {
  const session = await db.weeklySession.findUniqueOrThrow({
    where: { id: input.sessionId },
    include: {
      group: {
        include: {
          moderator: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  const request = await db.leaveRequest.create({
    data: {
      studentId: studentProfileId,
      sessionId: input.sessionId,
      reason: input.reason,
      status: "PENDING",
    },
  });

  const student = await db.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { name: true, nameAr: true },
  });

  if (session.group.moderator?.user?.id) {
    const sessionDate = session.date.toISOString().split("T")[0];
    await createNotification({
      recipientId: session.group.moderator.user.id,
      type: "LEAVE_SUBMITTED",
      title: `${student.nameAr || student.name} requested leave for ${sessionDate}`,
    });
  }

  await createAuditLog({
    actorId,
    action: "leave_request.create",
    entityType: "LeaveRequest",
    entityId: request.id,
    metadata: { sessionId: input.sessionId, reason: input.reason },
  });

  return request;
}

export async function reviewLeaveRequest(input: ReviewLeaveRequestInput, actorId: string) {
  const request = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.leaveRequestId },
    include: {
      student: { include: { user: { select: { id: true } } } },
      session: true,
    },
  });

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: input.leaveRequestId },
      data: {
        status: input.action,
        reviewedById: actorId,
        reviewNote: input.reviewNote || null,
      },
    });

    if (input.action === "APPROVED") {
      await tx.sessionStudent.upsert({
        where: {
          sessionId_studentId: {
            sessionId: request.sessionId,
            studentId: request.studentId,
          },
        },
        update: { attendance: "EXCUSED_ABSENCE" },
        create: {
          sessionId: request.sessionId,
          studentId: request.studentId,
          attendance: "EXCUSED_ABSENCE",
        },
      });
    }

    return result;
  });

  const sessionDate = request.session.date.toISOString().split("T")[0];
  const notifType = input.action === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED";
  const notifTitle = input.action === "APPROVED"
    ? `Your leave request for ${sessionDate} has been approved`
    : `Your leave request for ${sessionDate} has been rejected`;

  await createNotification({
    recipientId: request.student.user.id,
    type: notifType,
    title: notifTitle,
    body: input.reviewNote || undefined,
  });

  await createAuditLog({
    actorId,
    action: `leave_request.${input.action.toLowerCase()}`,
    entityType: "LeaveRequest",
    entityId: input.leaveRequestId,
    metadata: { action: input.action, reviewNote: input.reviewNote },
  });

  return updated;
}

export async function getStudentLeaveRequests(studentProfileId: string) {
  return db.leaveRequest.findMany({
    where: { studentId: studentProfileId },
    include: {
      session: {
        select: { date: true, group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getModeratorLeaveRequests(userId: string, statusFilter?: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true } } },
  });

  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.leaveRequest.findMany({
    where: {
      session: { groupId: { in: groupIds } },
      ...(statusFilter ? { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    },
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      session: {
        select: { date: true, group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllLeaveRequests() {
  return db.leaveRequest.findMany({
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      session: {
        select: { date: true, group: { select: { name: true } } },
      },
      reviewedBy: { select: { name: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUpcomingSessionsForStudent(studentProfileId: string) {
  const groupStudents = await db.groupStudent.findMany({
    where: { studentId: studentProfileId },
    select: { groupId: true },
  });

  const groupIds = groupStudents.map((gs) => gs.groupId);

  return db.weeklySession.findMany({
    where: {
      groupId: { in: groupIds },
      date: { gte: new Date() },
      status: { in: ["SCHEDULED", "OPEN"] },
    },
    include: {
      group: { select: { name: true } },
    },
    orderBy: { date: "asc" },
    take: 20,
  });
}
