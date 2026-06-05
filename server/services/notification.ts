import { db } from "@/server/db/client";
import { sendPush, sendPushToMany } from "./push-notification";
import { logger } from "@/server/lib/logger";

export async function createNotification(params: {
  recipientId: string;
  type: string;
  title: string;
  body?: string;
}) {
  // Check user notification preferences
  const prefs = await db.notificationPreference.findUnique({
    where: { userId_type: { userId: params.recipientId, type: params.type } },
  });

  // If inApp is disabled, skip creating the in-app notification but still try push
  if (prefs && !prefs.inApp) {
    if (prefs.push) {
      sendPush(params.recipientId, { title: params.title, body: params.body, url: "/" }).catch((err) => {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Background task failed");
      });
    }
    return null;
  }

  const notification = await db.notification.create({ data: params });

  // Only send push if preferences allow (default: send push)
  if (!prefs || prefs.push) {
    sendPush(params.recipientId, { title: params.title, body: params.body, url: "/" }).catch((err) => {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Background task failed");
    });
  }

  return notification;
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

export async function getNotificationPreferences(userId: string) {
  const prefs = await db.notificationPreference.findMany({ where: { userId } });
  const map: Record<string, { inApp: boolean; push: boolean }> = {};
  for (const p of prefs) {
    map[p.type] = { inApp: p.inApp, push: p.push };
  }
  return map;
}

export async function updateNotificationPreference(
  userId: string,
  type: string,
  data: { inApp?: boolean; push?: boolean }
) {
  return db.notificationPreference.upsert({
    where: { userId_type: { userId, type } },
    update: data,
    create: { userId, type, inApp: data.inApp ?? true, push: data.push ?? true },
  });
}

export async function createBulkNotifications(
  recipientIds: string[],
  type: string,
  title: string,
  body?: string
) {
  if (recipientIds.length === 0) return;

  const result = await db.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      type,
      title,
      body: body || null,
    })),
  });
  sendPushToMany(recipientIds, { title, body, url: "/" }).catch((err) => { logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Background task failed"); });
  return result;
}
