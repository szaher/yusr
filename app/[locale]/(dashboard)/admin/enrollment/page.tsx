import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllApplications } from "@/server/services/enrollment";
import { reviewApplicationAction } from "@/server/actions/enrollment";
import { StatusBadge } from "@/components/shared/status-badge";

const reviewAction = reviewApplicationAction as unknown as (formData: FormData) => void;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function AdminEnrollmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.enrollment");
  const tCommon = await getTranslations("common");
  const applications = await getAllApplications();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("applicantName")}</TableHead>
            <TableHead>{t("submittedAt")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>{app.user.name}</TableCell>
              <TableCell>
                {app.submittedAt
                  ? new Date(app.submittedAt).toLocaleDateString(locale)
                  : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={app.registrationStatus} />
              </TableCell>
              <TableCell>
                {app.registrationStatus === "PENDING_REVIEW" && (
                  <div className="flex gap-2">
                    <form action={reviewAction}>
                      <input
                        type="hidden"
                        name="applicationId"
                        value={app.id}
                      />
                      <input type="hidden" name="action" value="approve" />
                      <Button size="sm" variant="default">
                        {t("approve")}
                      </Button>
                    </form>
                    <form action={reviewAction}>
                      <input
                        type="hidden"
                        name="applicationId"
                        value={app.id}
                      />
                      <input type="hidden" name="action" value="reject" />
                      <Button size="sm" variant="destructive">
                        {t("reject")}
                      </Button>
                    </form>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
