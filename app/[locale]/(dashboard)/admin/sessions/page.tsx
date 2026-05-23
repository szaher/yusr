import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminSessions } from "@/server/services/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_COLORS } from "@/lib/constants/status-colors";

const STATUS_KEYS: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

export default async function AdminSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireApprovedUser();
  const t = await getTranslations("sessions");

  const sessions = await getAdminSessions();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noSessions")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("startTime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("students")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const moderatorName =
                    locale === "ar"
                      ? session.moderator.user.nameAr || session.moderator.user.name
                      : session.moderator.user.name;

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {moderatorName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(session.date).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>{session.startTime || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[session.status]}>
                          {t(STATUS_KEYS[session.status] as any)}
                        </Badge>
                      </TableCell>
                      <TableCell>{session._count.students}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
