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
  const level = await db.level.create({ data: input });

  await createAuditLog({
    actorId,
    action: "level.created",
    entityType: "Level",
    entityId: level.id,
  });

  return level;
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
  const cls = await db.class.create({ data: input });

  await createAuditLog({
    actorId,
    action: "class.created",
    entityType: "Class",
    entityId: cls.id,
  });

  return cls;
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
  const group = await db.group.create({ data: input });

  await createAuditLog({
    actorId,
    action: "group.created",
    entityType: "Group",
    entityId: group.id,
  });

  return group;
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

  await db.groupStudent.create({
    data: {
      groupId,
      studentId: studentProfile.id,
    },
  });

  await createAuditLog({
    actorId,
    action: "student.assigned_to_group",
    entityType: "GroupStudent",
    entityId: `${groupId}:${studentProfile.id}`,
    metadata: { userId, groupId },
  });
}
