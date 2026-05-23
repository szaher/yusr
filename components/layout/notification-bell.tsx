"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import Link from "next/link";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string, t: ReturnType<typeof useTranslations>) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  if (diffHr < 24) return t("hoursAgo", { count: diffHr });
  return t("daysAgo", { count: diffDay });
}

export function NotificationBell({
  unreadCount,
  notifications,
  role,
}: {
  unreadCount: number;
  notifications: NotificationItem[];
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const t = useTranslations("notifications");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (notificationId: string) => {
    const formData = new FormData();
    formData.set("notificationId", notificationId);
    await markNotificationReadAction(formData);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">{t("title")}</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {t("noNotifications")}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`block w-full border-b px-4 py-3 text-start text-sm hover:bg-accent ${
                    !n.read ? "bg-accent/50" : ""
                  }`}
                >
                  <p className={`${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(n.createdAt, t)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="border-t px-4 py-2 text-center">
            <Link
              href={`/${locale}/${role}/notifications`}
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
