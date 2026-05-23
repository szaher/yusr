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

import { STATUS_COLORS, SUBMISSION_COLORS } from "@/lib/constants/status-colors";

const changeStatusFn = changeInstanceStatusAction as unknown as (formData: FormData) => void;
const customizeFn = customizeInstanceAction as unknown as (formData: FormData) => void;

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

      {(instance.timeLimitMinutes || instance.shuffleQuestions || instance.maxAttempts || instance.poolConfig) && (
        <div className="text-sm text-muted-foreground space-y-1">
          {instance.timeLimitMinutes && <p>{t("timeLimitMinutes")}: {instance.timeLimitMinutes}</p>}
          {instance.shuffleQuestions && <p>{t("shuffleQuestions")}: ✓</p>}
          {instance.maxAttempts && <p>{t("maxAttempts")}: {instance.maxAttempts}</p>}
          {instance.poolConfig && (
            <p>{t("pickQuestions")}: {(instance.poolConfig as { pick: number }).pick} {t("questionsFromPool")}</p>
          )}
        </div>
      )}

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
                {instance.maxAttempts && <TableHead>{t("attempt")}</TableHead>}
                <TableHead>{t("submissionStatus")}</TableHead>
                <TableHead>{t("score")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instance.group.students.map((gs) => {
                const studentSubs = instance.submissions
                  .filter((s) => s.student.user.id === gs.student.user.id)
                  .sort((a, b) => a.attemptNumber - b.attemptNumber);
                const bestSub = studentSubs
                  .filter((s) => s.status === "GRADED")
                  .reduce<typeof studentSubs[0] | null>(
                    (best, s) => (!best || (s.totalScore ?? 0) > (best.totalScore ?? 0) ? s : best),
                    null
                  );

                if (studentSubs.length === 0) {
                  return (
                    <TableRow key={gs.student.user.id}>
                      <TableCell className="font-medium">
                        {gs.student.user.nameAr || gs.student.user.name}
                      </TableCell>
                      {instance.maxAttempts && <TableCell>—</TableCell>}
                      <TableCell>
                        <Badge className={SUBMISSION_COLORS["NOT_STARTED"]}>
                          {t("notStarted")}
                        </Badge>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }

                return studentSubs.map((sub) => {
                  const subStatusKey = sub.status === "IN_PROGRESS" ? "inProgress" : sub.status === "NOT_STARTED" ? "notStarted" : sub.status.toLowerCase();
                  const isBest = bestSub?.id === sub.id;

                  return (
                    <TableRow key={sub.id} className={isBest ? "bg-green-50 dark:bg-green-950/20" : ""}>
                      <TableCell className="font-medium">
                        {sub.attemptNumber === 1
                          ? (gs.student.user.nameAr || gs.student.user.name)
                          : ""}
                      </TableCell>
                      {instance.maxAttempts && (
                        <TableCell>
                          {sub.attemptNumber}/{instance.maxAttempts}
                          {isBest && <Badge className="ms-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs">{t("bestScore")}</Badge>}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={SUBMISSION_COLORS[sub.status] || ""}>
                          {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.totalScore !== null && sub.totalScore !== undefined ? (
                          <>
                            {Math.round(sub.totalScore)}%{" "}
                            <Badge className={sub.passed ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
                              {sub.passed ? t("passed") : t("failed")}
                            </Badge>
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {sub.status === "SUBMITTED" && (
                          <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                            <Button variant="outline" size="sm">{t("grade")}</Button>
                          </Link>
                        )}
                        {sub.status === "GRADED" && (
                          <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                            <Button variant="ghost" size="sm">{t("viewDetails")}</Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
