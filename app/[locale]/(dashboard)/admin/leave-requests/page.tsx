import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllLeaveRequests } from "@/server/services/leave-request";
import { reviewLeaveRequestAction } from "@/server/actions/leave-request";

const reviewRequest = reviewLeaveRequestAction as unknown as (formData: FormData) => void;

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string) {
  switch (status) {
    case "APPROVED": return "default" as const;
    case "REJECTED": return "destructive" as const;
    case "CANCELLED": return "secondary" as const;
    default: return "outline" as const;
  }
}

export default async function AdminLeaveRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("leaveRequests");
  const { items: requests } = await getAllLeaveRequests();

  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("pendingRequests")} ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("sessionDate")}</TableHead>
                <TableHead>{t("groupName")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead>{t("submittedAt")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("noRequests")}
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.student.user.nameAr || req.student.user.name}
                    </TableCell>
                    <TableCell>
                      {new Date(req.session.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>{req.session.group.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString(locale)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <form action={reviewRequest}>
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="APPROVED" />
                          <Button type="submit" size="sm">{t("approve")}</Button>
                        </form>
                        <form action={reviewRequest} className="flex gap-1">
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="REJECTED" />
                          <Input name="reviewNote" placeholder={t("reviewNotePlaceholder")} className="h-8 w-32" />
                          <Button type="submit" size="sm" variant="destructive">{t("reject")}</Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("reviewedRequests")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("sessionDate")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("reviewedBy")}</TableHead>
                <TableHead>{t("reviewNote")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.student.user.nameAr || req.student.user.name}
                  </TableCell>
                  <TableCell>
                    {new Date(req.session.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(req.status)}>
                      {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {req.reviewedBy?.nameAr || req.reviewedBy?.name || "—"}
                  </TableCell>
                  <TableCell>{req.reviewNote ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
