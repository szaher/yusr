import { db } from "@/server/db/client";

export async function createNotification(params: {
  recipientId: string;
  type: string;
  title: string;
  body?: string;
}) {
  return db.notification.create({ data: params });
}

export async function getUnreadNotifications(userId: string) {
  return db.notification.findMany({
    where: { recipientId: userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function markNotificationRead(notificationId: string) {
  return db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { recipientId: userId, read: false },
  });
}

export async function getNotifications(userId: string, limit: number = 50) {
  return db.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}

export async function createBulkNotifications(
  recipientIds: string[],
  type: string,
  title: string,
  body?: string
) {
  if (recipientIds.length === 0) return;

  return db.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      type,
      title,
      body: body || null,
    })),
  });
}
