import { auth } from "@/server/auth/config";
import { LocaleSwitcher } from "./locale-switcher";
import { logoutAction } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { getUnreadCount, getUnreadNotifications } from "@/server/services/notification";
import { NotificationBell } from "./notification-bell";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "./theme-toggle";

export async function Header({
  role,
  enabledFlags,
}: {
  role?: string;
  enabledFlags?: string[];
}) {
  const session = await auth();
  const t = await getTranslations("auth");

  if (!session?.user) return null;

  const roleLabels: Record<string, string> = {
    admin: "مدير",
    moderator: "مشرف",
    student: "طالب",
    support: "دعم",
  };

  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(session.user.id),
    getUnreadNotifications(session.user.id),
  ]);

  const serializedNotifications = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        {role && <MobileSidebar role={role} enabledFlags={enabledFlags} />}
        <span className="text-sm font-medium">{session.user.name}</span>
        <Badge variant="secondary">
          {roleLabels[session.user.role] ?? session.user.role}
        </Badge>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <LocaleSwitcher />
        <NotificationBell
          unreadCount={unreadCount}
          notifications={serializedNotifications}
          role={session.user.role}
        />
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            {t("logout")}
          </Button>
        </form>
      </div>
    </header>
  );
}
