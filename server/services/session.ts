import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateSessionInput, GradeStudentInput, ReviewRangeInput } from "@/lib/validations/session";

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

export async function createSession(input: CreateSessionInput, actorId: string) {
  const group = await db.group.findUnique({
    where: { id: input.groupId },
    select: {
      id: true,
      moderatorId: true,
      students: { select: { studentId: true } },
    },
  });

  if (!group) throw new Error("Group not found");

  return db.$transaction(async (tx) => {
    const session = await tx.weeklySession.create({
      data: {
        groupId: input.groupId,
        moderatorId: group.moderatorId!,
        date: new Date(input.date),
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        meetingLink: input.meetingLink || null,
        notes: input.notes || null,
      },
    });

    if (group.students.length > 0) {
      await tx.sessionStudent.createMany({
        data: group.students.map((gs) => ({
          sessionId: session.id,
          studentId: gs.studentId,
        })),
      });
    }

    await createAuditLog({
      actorId,
      action: "session.create",
      entityType: "WeeklySession",
      entityId: session.id,
      metadata: { groupId: input.groupId, date: input.date },
    });

    return session;
  });
}

export async function getModeratorSessions(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { id: true, groups: { select: { id: true } } },
  });

  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.weeklySession.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { students: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getStudentSessions(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return [];

  const sessionStudents = await db.sessionStudent.findMany({
    where: { studentId: profile.id },
    include: {
      session: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  return sessionStudents;
}

export async function getAdminSessions() {
  return db.weeklySession.findMany({
    include: {
      group: {
        select: {
          id: true,
          name: true,
          class: { select: { name: true, level: { select: { nameAr: true } } } },
        },
      },
      moderator: {
        select: { user: { select: { name: true, nameAr: true } } },
      },
      _count: { select: { students: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getSessionDetail(sessionId: string) {
  return db.weeklySession.findUnique({
    where: { id: sessionId },
    include: {
      group: { select: { id: true, name: true } },
      moderator: { select: { user: { select: { name: true, nameAr: true } } } },
      students: {
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              user: { select: { name: true, nameAr: true } },
            },
          },
          reviewRanges: {
            include: {
              fromSurah: { select: { nameAr: true, nameEn: true } },
              toSurah: { select: { nameAr: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
}

export async function updateSessionStatus(
  sessionId: string,
  newStatus: string,
  actorId: string
) {
  const session = await db.weeklySession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!session) throw new Error("Session not found");

  const allowed = VALID_TRANSITIONS[session.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${session.status} to ${newStatus}`);
  }

  const updated = await db.weeklySession.update({
    where: { id: sessionId },
    data: { status: newStatus as any },
  });

  await createAuditLog({
    actorId,
    action: "session.status_change",
    entityType: "WeeklySession",
    entityId: sessionId,
    metadata: { from: session.status, to: newStatus },
  });

  return updated;
}

export async function updateMeetingLink(
  sessionId: string,
  meetingLink: string,
  actorId: string
) {
  return db.weeklySession.update({
    where: { id: sessionId },
    data: { meetingLink: meetingLink || null },
  });
}

export async function gradeStudent(
  input: GradeStudentInput,
  actorId: string
) {
  const sessionStudent = await db.sessionStudent.findUnique({
    where: { id: input.sessionStudentId },
    select: { id: true, sessionId: true },
  });

  if (!sessionStudent) throw new Error("Session student record not found");

  return db.$transaction(async (tx) => {
    await tx.reviewRange.deleteMany({
      where: { sessionStudentId: input.sessionStudentId },
    });

    const updated = await tx.sessionStudent.update({
      where: { id: input.sessionStudentId },
      data: {
        attendance: input.attendance as any,
        recitationResult: input.recitationResult as any,
        numericGrade: input.numericGrade ?? null,
        mistakeCount: input.mistakeCount ?? null,
        tajweedNotes: input.tajweedNotes || null,
        memorizationNotes: input.memorizationNotes || null,
        fluencyNotes: input.fluencyNotes || null,
        comment: input.comment || null,
        voiceNoteUrl: input.voiceNoteUrl || null,
        gradedAt: new Date(),
      },
    });

    if (input.reviewRanges && input.reviewRanges.length > 0) {
      await tx.reviewRange.createMany({
        data: input.reviewRanges.map((rr) => ({
          sessionStudentId: input.sessionStudentId,
          fromSurahNumber: rr.fromSurahNumber,
          fromAyahNumber: rr.fromAyahNumber,
          toSurahNumber: rr.toSurahNumber,
          toAyahNumber: rr.toAyahNumber,
          note: rr.note || null,
        })),
      });
    }

    await createAuditLog({
      actorId,
      action: "session.grade_student",
      entityType: "SessionStudent",
      entityId: input.sessionStudentId,
      metadata: {
        sessionId: sessionStudent.sessionId,
        attendance: input.attendance,
        recitationResult: input.recitationResult,
      },
    });

    return updated;
  });
}

export async function getStudentGrades(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return [];

  return db.sessionStudent.findMany({
    where: {
      studentId: profile.id,
      session: { status: "COMPLETED" },
      recitationResult: { not: "NOT_GRADED" },
    },
    include: {
      session: {
        select: {
          id: true,
          date: true,
          group: { select: { name: true } },
        },
      },
      reviewRanges: {
        include: {
          fromSurah: { select: { nameAr: true, nameEn: true } },
          toSurah: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });
}
