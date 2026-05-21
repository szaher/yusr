import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getModeratorLeaveRequests } from "@/server/services/leave-request";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { reviewLeaveRequestAction } from "@/server/actions/leave-request";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const reviewLeaveRequest = reviewLeaveRequestAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default async function ModeratorLeaveRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.LEAVE_REQUESTS_REVIEW);

  const enabled = await isFeatureEnabled("leave_requests");
  if (!enabled) notFound();

  const t = await getTranslations("leaveRequests");

  const showAll = filter === "all";
  const requests = await getModeratorLeaveRequests(
    session.user.id,
    showAll ? undefined : "PENDING"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/moderator/leave-requests` : `/${locale}/moderator/leave-requests?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showPending") : t("showAll")}
          </Button>
        </a>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noRequests")}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("sessionDate")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
              <TableHead>{t("submittedAt")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const studentName = req.student.user.nameAr || req.student.user.name;
              return (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{studentName}</TableCell>
                  <TableCell>{req.session.group.name}</TableCell>
                  <TableCell>
                    {new Date(req.session.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                  <TableCell>
                    {new Date(req.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[req.status] || ""}>
                      {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {req.status === "PENDING" && (
                      <div className="flex gap-1">
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="APPROVED" />
                          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                            {t("approve")}
                          </Button>
                        </form>
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="REJECTED" />
                          <Button type="submit" size="sm" variant="destructive">
                            {t("reject")}
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
