import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getInstanceDetail } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { changeInstanceStatusAction, customizeInstanceAction } from "@/server/actions/exam";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const changeStatusFn = changeInstanceStatusAction as unknown as (formData: FormData) => void;
const customizeFn = customizeInstanceAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const SUBMISSION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  GRADED: "bg-green-100 text-green-800",
};

export default async function ModeratorExamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string }>;
}) {
  const { locale, instanceId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let instance;
  try {
    instance = await getInstanceDetail(instanceId);
  } catch {
    notFound();
  }

  if (instance.group.moderator?.userId !== session.user.id) {
    notFound();
  }

  const statusKey = instance.status === "IN_PROGRESS" ? "inProgress" : instance.status.toLowerCase();
  const recitationQuestions = instance.template.questions.filter((q) => q.type === "RECITATION");

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/moderator/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{instance.template.title}</h1>
        <Badge className={STATUS_COLORS[instance.status] || ""}>
          {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t("groupName")}: {instance.group.name}</p>
        <p>{t("dateRange")}: {new Date(instance.startDate).toLocaleDateString(locale)} — {new Date(instance.endDate).toLocaleDateString(locale)}</p>
        <p>{t("passingScore")}: {instance.template.passingScore}%</p>
      </div>

      {/* Status Actions */}
      <div className="flex gap-2">
        {instance.status === "DRAFT" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="PUBLISHED" />
            <Button type="submit" size="sm">{t("publish")}</Button>
          </form>
        )}
        {instance.status === "PUBLISHED" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="IN_PROGRESS" />
            <Button type="submit" size="sm">{t("start")}</Button>
          </form>
        )}
        {instance.status === "IN_PROGRESS" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="COMPLETED" />
            <Button type="submit" size="sm" variant="destructive">{t("complete")}</Button>
          </form>
        )}
      </div>

      {/* Recitation Customization */}
      {recitationQuestions.length > 0 && (instance.status === "DRAFT" || instance.status === "PUBLISHED") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("customizeRecitation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={customizeFn} className="space-y-4">
              <input type="hidden" name="instanceId" value={instance.id} />
              <textarea
                name="customizations"
                defaultValue={instance.customizations ? JSON.stringify(instance.customizations, null, 2) : "{}"}
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <Button type="submit" size="sm">{t("save")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Student Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("submissions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("submissionStatus")}</TableHead>
                <TableHead>{t("score")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instance.group.students.map((gs) => {
                const sub = instance.submissions.find(
                  (s) => s.student.user.id === gs.student.user.id
                );
                const subStatus = sub?.status ?? "NOT_STARTED";
                const subStatusKey = subStatus === "IN_PROGRESS" ? "inProgress" : subStatus === "NOT_STARTED" ? "notStarted" : subStatus.toLowerCase();

                return (
                  <TableRow key={gs.student.user.id}>
                    <TableCell className="font-medium">
                      {gs.student.user.nameAr || gs.student.user.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={SUBMISSION_COLORS[subStatus] || ""}>
                        {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub?.totalScore !== null && sub?.totalScore !== undefined ? (
                        <>
                          {Math.round(sub.totalScore)}%{" "}
                          <Badge className={sub.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {sub.passed ? t("passed") : t("failed")}
                          </Badge>
                        </>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {sub && sub.status === "SUBMITTED" && (
                        <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                          <Button variant="outline" size="sm">{t("grade")}</Button>
                        </Link>
                      )}
                      {sub && sub.status === "GRADED" && (
                        <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                          <Button variant="ghost" size="sm">{t("viewDetails")}</Button>
                        </Link>
                      )}
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
