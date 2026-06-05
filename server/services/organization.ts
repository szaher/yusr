import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type {
  CreateLevelInput,
  CreateClassInput,
  CreateGroupInput,
} from "@/lib/validations/organization";

export async function getAllLevels() {
  return db.level.findMany({
    include: { _count: { select: { classes: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createLevel(input: CreateLevelInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const level = await tx.level.create({ data: input });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "level.created",
        entityType: "Level",
        entityId: level.id,
      },
    });

    return level;
  });
}

export async function getClassesByLevel(levelId: string) {
  return db.class.findMany({
    where: { levelId },
    include: {
      level: { select: { nameAr: true, nameEn: true } },
      _count: { select: { groups: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllClasses() {
  return db.class.findMany({
    include: {
      level: { select: { nameAr: true, nameEn: true } },
      _count: { select: { groups: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createClass(input: CreateClassInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const cls = await tx.class.create({ data: input });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "class.created",
        entityType: "Class",
        entityId: cls.id,
      },
    });

    return cls;
  });
}

export async function getAllModerators() {
  return db.moderatorProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getAllGroups() {
  return db.group.findMany({
    include: {
      class: {
        select: {
          name: true,
          level: { select: { nameAr: true } },
        },
      },
      moderator: {
        select: {
          user: { select: { name: true } },
        },
      },
      _count: { select: { students: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createGroup(input: CreateGroupInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const group = await tx.group.create({ data: input });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "group.created",
        entityType: "Group",
        entityId: group.id,
      },
    });

    return group;
  });
}

export async function getModeratorGroups(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    include: {
      groups: {
        include: {
          class: {
            include: { level: { select: { nameAr: true, nameEn: true } } },
          },
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return profile?.groups ?? [];
}

export async function getModeratorStudents(userId: string, search?: string) {
  const studentFilter = search
    ? {
        student: {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          },
        },
      }
    : {};

  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    include: {
      groups: {
        include: {
          students: {
            where: studentFilter,
            include: {
              student: {
                include: {
                  user: {
                    select: { name: true, nameAr: true, email: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) return [];

  return profile.groups.flatMap((group) =>
    group.students.map((gs) => ({
      studentProfile: gs.student,
      user: gs.student.user,
      groupName: group.name,
    }))
  );
}

// ============================================================
// Level CRUD
// ============================================================

export async function updateLevel(
  id: string,
  data: { nameAr: string; nameEn?: string; description?: string; sortOrder?: number },
  actorId: string
) {
  return db.$transaction(async (tx) => {
    const level = await tx.level.update({ where: { id }, data });
    await createAuditLog({
      actorId,
      action: "level.updated",
      entityType: "Level",
      entityId: id,
      metadata: data,
    });
    return level;
  });
}

export async function deleteLevel(id: string, actorId: string) {
  const childCount = await db.class.count({ where: { levelId: id } });
  if (childCount > 0) throw new Error("hasChildren");
  return db.$transaction(async (tx) => {
    await tx.level.delete({ where: { id } });
    await createAuditLog({
      actorId,
      action: "level.deleted",
      entityType: "Level",
      entityId: id,
    });
  });
}

// ============================================================
// Class CRUD
// ============================================================

export async function updateClass(
  id: string,
  data: { name: string; levelId: string; defaultDay?: string; timezone?: string; sessionTime?: string; capacity?: number; genderPolicy?: string },
  actorId: string
) {
  return db.$transaction(async (tx) => {
    const cls = await tx.class.update({ where: { id }, data });
    await createAuditLog({
      actorId,
      action: "class.updated",
      entityType: "Class",
      entityId: id,
      metadata: data,
    });
    return cls;
  });
}

export async function deleteClass(id: string, actorId: string) {
  const childCount = await db.group.count({ where: { classId: id } });
  if (childCount > 0) throw new Error("hasChildren");
  return db.$transaction(async (tx) => {
    await tx.class.delete({ where: { id } });
    await createAuditLog({
      actorId,
      action: "class.deleted",
      entityType: "Class",
      entityId: id,
    });
  });
}

// ============================================================
// Group CRUD
// ============================================================

export async function updateGroup(
  id: string,
  data: { name: string; classId: string; moderatorId?: string; weeklyDay?: string; weeklyTime?: string },
  actorId: string
) {
  return db.$transaction(async (tx) => {
    const group = await tx.group.update({ where: { id }, data });
    await createAuditLog({
      actorId,
      action: "group.updated",
      entityType: "Group",
      entityId: id,
      metadata: data,
    });
    return group;
  });
}

export async function deleteGroup(id: string, actorId: string) {
  const childCount = await db.groupStudent.count({ where: { groupId: id } });
  if (childCount > 0) throw new Error("hasChildren");
  return db.$transaction(async (tx) => {
    await tx.group.delete({ where: { id } });
    await createAuditLog({
      actorId,
      action: "group.deleted",
      entityType: "Group",
      entityId: id,
    });
  });
}

export async function assignStudentToGroup(
  userId: string,
  groupId: string,
  actorId: string
) {
  const studentProfile = await db.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile) throw new Error("Student profile not found");

  await db.$transaction(async (tx) => {
    await tx.groupStudent.create({
      data: {
        groupId,
        studentId: studentProfile.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "student.assigned_to_group",
        entityType: "GroupStudent",
        entityId: `${groupId}:${studentProfile.id}`,
        metadata: { userId, groupId },
      },
    });
  });
}
