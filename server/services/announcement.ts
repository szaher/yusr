import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createBulkNotifications } from "./notification";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "@/lib/validations/announcement";

export async function createAnnouncement(input: CreateAnnouncementInput, actorId: string) {
  const announcement = await db.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      priority: input.priority || "normal",
      targetType: input.targetType || "ALL",
      targetId: input.targetId || null,
      publishDate: input.publishDate || new Date(),
      expiryDate: input.expiryDate || null,
      createdById: actorId,
    },
  });

  const recipientIds = await resolveTargetUsers(input.targetType || "ALL", input.targetId);
  if (recipientIds.length > 0) {
    await createBulkNotifications(recipientIds, "ANNOUNCEMENT", input.title, input.body);
  }

  await createAuditLog({
    actorId,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: input.title, targetType: input.targetType, targetId: input.targetId },
  });

  return announcement;
}

export async function updateAnnouncement(input: UpdateAnnouncementInput, actorId: string) {
  const announcement = await db.announcement.update({
    where: { id: input.announcementId },
    data: {
      title: input.title,
      body: input.body,
      priority: input.priority || "normal",
      targetType: input.targetType || "ALL",
      targetId: input.targetId || null,
      publishDate: input.publishDate || new Date(),
      expiryDate: input.expiryDate || null,
    },
  });

  await createAuditLog({
    actorId,
    action: "announcement.update",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: input.title },
  });

  return announcement;
}

export async function deleteAnnouncement(announcementId: string, actorId: string) {
  await db.announcement.update({ where: { id: announcementId }, data: { deletedAt: new Date() } });

  await createAuditLog({
    actorId,
    action: "announcement.delete",
    entityType: "Announcement",
    entityId: announcementId,
    metadata: {},
  });
}

export async function listAnnouncements(page = 1, limit = 50) {
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    db.announcement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { name: true, nameAr: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.announcement.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getActiveAnnouncementsForUser(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { select: { name: true } },
      studentProfile: {
        include: {
          groupStudents: { select: { groupId: true } },
        },
      },
    },
  });

  const now = new Date();
  const roleName = user.role.name;
  const groupIds = user.studentProfile?.groupStudents.map((gs) => gs.groupId) ?? [];

  return db.announcement.findMany({
    where: {
      deletedAt: null,
      publishDate: { lte: now },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: now } },
      ],
      AND: {
        OR: [
          { targetType: null },
          { targetType: "ALL" },
          { targetType: "ROLE", targetId: roleName },
          ...(groupIds.length > 0
            ? [{ targetType: "GROUP", targetId: { in: groupIds } }]
            : []),
        ],
      },
    },
    orderBy: { publishDate: "desc" },
    take: 5,
  });
}

async function resolveTargetUsers(targetType: string, targetId?: string): Promise<string[]> {
  if (targetType === "ALL") {
    const users = await db.user.findMany({
      where: { accountStatus: "ACTIVE" },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (targetType === "ROLE" && targetId) {
    const users = await db.user.findMany({
      where: { accountStatus: "ACTIVE", role: { name: targetId } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (targetType === "GROUP" && targetId) {
    const group = await db.group.findUnique({
      where: { id: targetId },
      include: {
        students: {
          include: {
            student: {
              include: { user: { select: { id: true } } },
            },
          },
        },
        moderator: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!group) return [];

    const ids: string[] = group.students.map((gs) => gs.student.user.id);
    if (group.moderator?.user?.id) {
      ids.push(group.moderator.user.id);
    }
    return ids;
  }

  return [];
}
