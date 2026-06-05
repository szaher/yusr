import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorSessions } from "@/server/services/session";
import { getModeratorGroups } from "@/server/services/organization";
import { createSessionAction } from "@/server/actions/session";
import Link from "next/link";

const createSession = createSessionAction as unknown as (formData: FormData) => void;

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants/status-colors";

export default async function ModeratorSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("sessions");
  const [sessions, groups] = await Promise.all([
    getModeratorSessions(session.user.id).then((r) => r.items),
    getModeratorGroups(session.user.id),
  ]);

  const upcomingSessions = sessions.filter(
    (s) => s.status !== "COMPLETED" && s.status !== "CANCELLED"
  );
  const pastSessions = sessions.filter(
    (s) => s.status === "COMPLETED" || s.status === "CANCELLED"
  );

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      SCHEDULED: t("statusScheduled"),
      OPEN: t("statusOpen"),
      IN_PROGRESS: t("statusInProgress"),
      COMPLETED: t("statusCompleted"),
      CANCELLED: t("statusCancelled"),
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createSession")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSession} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupId">{t("group")}</Label>
              <select
                id="groupId"
                name="groupId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.class?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">{t("date")}</Label>
                <Input id="date" name="date" type="date" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">{t("startTime")}</Label>
                <Input id="startTime" name="startTime" type="time" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">{t("endTime")}</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">{t("meetingLink")}</Label>
              <Input id="meetingLink" name="meetingLink" type="url" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Button type="submit">{t("createSession")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {upcomingSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{t("upcomingSessions")}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("group")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("startTime")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("studentCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingSessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/sessions/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.group.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {new Date(s.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{s.startTime || "—"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[s.status]}>
                      {getStatusText(s.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{s._count.students}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pastSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{t("pastSessions")}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("group")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("studentCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastSessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/sessions/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.group.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {new Date(s.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[s.status]}>
                      {getStatusText(s.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{s._count.students}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {sessions.length === 0 && (
        <EmptyState
          icon={Calendar}
          title={t("noSessions")}
          description={t("noSessionsDesc")}
        />
      )}
    </div>
  );
}
