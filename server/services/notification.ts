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
