import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateAssignmentInput, MaterialInput } from "@/lib/validations/assignment";

export async function createAssignment(
  input: CreateAssignmentInput,
  materials: MaterialInput[],
  actorId: string
) {
  const assignment = await db.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        targetType: input.targetType,
        targetId: input.targetId,
        createdById: actorId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        requiredRepetitions: input.requiredRepetitions,
      },
    });

    if (input.type === "QURAN_MEMORIZATION" || input.type === "QURAN_REVISION") {
      await tx.quranAssignment.create({
        data: {
          assignmentId: assignment.id,
          fromSurahNumber: input.fromSurahNumber,
          fromAyahNumber: input.fromAyahNumber,
          toSurahNumber: input.toSurahNumber,
          toAyahNumber: input.toAyahNumber,
        },
      });
    } else if (input.type === "TAJWEED") {
      await tx.tajweedAssignment.create({
        data: {
          assignmentId: assignment.id,
          topicTitle: input.topicTitle,
          topicDescription: input.topicDescription || null,
          materialUrl: input.materialUrl || null,
        },
      });
    } else if (input.type === "HOMEWORK") {
      await tx.homeworkAssignment.create({
        data: {
          assignmentId: assignment.id,
          instructions: input.instructions,
        },
      });
    }

    if (materials.length > 0) {
      await tx.assignmentMaterial.createMany({
        data: materials.map((m, i) => ({
          assignmentId: assignment.id,
          type: m.type,
          url: m.url,
          title: m.title || null,
          sortOrder: i,
        })),
      });
    }

    const studentIds = await resolveTargetStudents(tx, input.targetType, input.targetId);

    if (studentIds.length > 0) {
      await tx.studentAssignment.createMany({
        data: studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        })),
      });
    }

    return assignment;
  });

  await createAuditLog({
    actorId,
    action: "assignment.created",
    entityType: "Assignment",
    entityId: assignment.id,
    metadata: { type: input.type, targetType: input.targetType, targetId: input.targetId },
  });

  return assignment;
}

async function resolveTargetStudents(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  targetType: string,
  targetId: string
): Promise<string[]> {
  if (targetType === "GROUP") {
    const gs = await tx.groupStudent.findMany({
      where: { groupId: targetId },
      select: { studentId: true },
    });
    return gs.map((g) => g.studentId);
  }

  if (targetType === "CLASS") {
    const groups = await tx.group.findMany({
      where: { classId: targetId },
      select: { id: true },
    });
    const gs = await tx.groupStudent.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { studentId: true },
    });
    return [...new Set(gs.map((g) => g.studentId))];
  }

  if (targetType === "LEVEL") {
    const classes = await tx.class.findMany({
      where: { levelId: targetId },
      select: { id: true },
    });
    const groups = await tx.group.findMany({
      where: { classId: { in: classes.map((c) => c.id) } },
      select: { id: true },
    });
    const gs = await tx.groupStudent.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { studentId: true },
    });
    return [...new Set(gs.map((g) => g.studentId))];
  }

  return [];
}

export async function getModeratorAssignments(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true, name: true } } },
  });
  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.assignment.findMany({
    where: {
      targetType: "GROUP",
      targetId: { in: groupIds },
    },
    include: {
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true } },
          toSurah: { select: { nameAr: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      _count: { select: { studentAssignments: true } },
      studentAssignments: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminAssignments() {
  return db.assignment.findMany({
    include: {
      createdBy: { select: { name: true } },
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true } },
          toSurah: { select: { nameAr: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      _count: { select: { studentAssignments: true } },
      studentAssignments: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentAssignments(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  return db.studentAssignment.findMany({
    where: { studentId: profile.id },
    include: {
      assignment: {
        include: {
          quranAssignment: {
            include: {
              fromSurah: { select: { nameAr: true } },
              toSurah: { select: { nameAr: true } },
            },
          },
          tajweedAssignment: true,
          homeworkAssignment: true,
        },
      },
      _count: { select: { confirmations: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function getAssignmentDetail(assignmentId: string) {
  return db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true, nameEn: true } },
          toSurah: { select: { nameAr: true, nameEn: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      materials: { orderBy: { sortOrder: "asc" } },
      studentAssignments: {
        include: {
          student: {
            include: {
              user: { select: { name: true, nameAr: true } },
            },
          },
          _count: { select: { confirmations: true } },
        },
      },
    },
  });
}

export async function getStudentAssignmentDetail(studentAssignmentId: string) {
  return db.studentAssignment.findUnique({
    where: { id: studentAssignmentId },
    include: {
      assignment: {
        include: {
          quranAssignment: {
            include: {
              fromSurah: { select: { nameAr: true, nameEn: true } },
              toSurah: { select: { nameAr: true, nameEn: true } },
            },
          },
          tajweedAssignment: true,
          homeworkAssignment: true,
          materials: { orderBy: { sortOrder: "asc" } },
        },
      },
      confirmations: { orderBy: { confirmedAt: "desc" } },
    },
  });
}

export async function confirmListening(studentAssignmentId: string, userId: string) {
  const sa = await db.studentAssignment.findUnique({
    where: { id: studentAssignmentId },
    include: {
      student: { select: { userId: true } },
      assignment: { select: { requiredRepetitions: true } },
      _count: { select: { confirmations: true } },
    },
  });

  if (!sa) throw new Error("StudentAssignment not found");
  if (sa.student.userId !== userId) throw new Error("Not authorized");
  if (sa.status === "COMPLETED") throw new Error("Already completed");

  const newCount = sa._count.confirmations + 1;
  const isComplete = newCount >= sa.assignment.requiredRepetitions;

  await db.$transaction(async (tx) => {
    await tx.listeningConfirmation.create({
      data: { studentAssignmentId },
    });

    await tx.studentAssignment.update({
      where: { id: studentAssignmentId },
      data: {
        status: isComplete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isComplete ? new Date() : undefined,
      },
    });
  });

  return { newCount, required: sa.assignment.requiredRepetitions, isComplete };
}

export async function getStudentEligibility(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { total: 0, completed: 0, eligible: true };

  const assignments = await db.studentAssignment.findMany({
    where: {
      studentId: profile.id,
      assignment: { active: true },
    },
    select: { status: true },
  });

  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "COMPLETED").length;

  return { total, completed, eligible: total === 0 || completed === total };
}

export async function deleteAssignment(assignmentId: string, actorId: string) {
  await db.assignment.delete({ where: { id: assignmentId } });

  await createAuditLog({
    actorId,
    action: "assignment.deleted",
    entityType: "Assignment",
    entityId: assignmentId,
  });
}
