import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentLeaveRequests, getUpcomingSessionsForStudent } from "@/server/services/leave-request";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createLeaveRequestAction } from "@/server/actions/leave-request";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarOff } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Label } from "@/components/ui/label";
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

const createLeaveRequest = createLeaveRequestAction as unknown as (formData: FormData) => void;

export default async function StudentLeaveRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("leave_requests");
  if (!enabled) notFound();

  const t = await getTranslations("leaveRequests");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <EmptyState
          icon={CalendarOff}
          title={t("noRequests")}
          description={t("noRequestsDesc")}
        />
      </div>
    );
  }

  const [requests, upcomingSessions] = await Promise.all([
    getStudentLeaveRequests(studentProfile.id),
    getUpcomingSessionsForStudent(studentProfile.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("requestLeave")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
          ) : (
            <form action={createLeaveRequest} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("selectSession")}</Label>
                <select
                  name="sessionId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {upcomingSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString(locale)} — {s.group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("reason")}</Label>
                <textarea
                  name="reason"
                  required
                  placeholder={t("reasonPlaceholder")}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton>{t("submit")}</SubmitButton>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("sessionDate")}</TableHead>
                <TableHead>{t("groupName")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("submittedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    {new Date(req.session.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{req.session.group.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[req.status] || ""}>
                      {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(req.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-3 md:hidden">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{req.session.group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(req.session.date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[req.status] || ""}>
                      {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{req.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {requests.length === 0 && (
        <EmptyState
          icon={CalendarOff}
          title={t("noRequests")}
          description={t("noRequestsDesc")}
        />
      )}
    </div>
  );
}
