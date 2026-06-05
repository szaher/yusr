import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotificationPreferences } from "@/server/services/notification";
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS } from "@/lib/constants/notification-types";
import { updatePreferenceAction } from "@/server/actions/notification-preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PreferenceToggle } from "./preference-toggle";

export default async function NotificationPreferencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const prefs = await getNotificationPreferences(session.user.id);

  const types = Object.values(NOTIFICATION_TYPES);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("preferencesTitle")}</h1>
      <p className="text-muted-foreground">{t("preferencesDesc")}</p>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("notificationType")}</TableHead>
                <TableHead className="text-center">{t("inApp")}</TableHead>
                <TableHead className="text-center">{t("pushNotifications")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => {
                const label = NOTIFICATION_TYPE_LABELS[type];
                const pref = prefs[type];
                const inApp = pref?.inApp ?? true;
                const push = pref?.push ?? true;

                return (
                  <TableRow key={type}>
                    <TableCell className="font-medium">
                      {locale === "ar" ? label?.ar : label?.en}
                    </TableCell>
                    <TableCell className="text-center">
                      <PreferenceToggle
                        type={type}
                        field="inApp"
                        checked={inApp}
                        action={updatePreferenceAction}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <PreferenceToggle
                        type={type}
                        field="push"
                        checked={push}
                        action={updatePreferenceAction}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
