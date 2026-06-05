import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotifications } from "@/server/services/notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const markRead = markNotificationReadAction as unknown as (formData: FormData) => void;
const markAllRead = markAllNotificationsReadAction as unknown as () => void;

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const notifications = await getNotifications(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm">{t("markAllRead")}</Button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={t("noNotifications")}
          description={t("noNotificationsDesc")}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale)}{" "}
                    {new Date(n.createdAt).toLocaleTimeString(locale)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {t("new")}
                      </Badge>

                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
