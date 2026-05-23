import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUBMISSION_COLORS } from "@/lib/constants/status-colors";

export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <EmptyState
          icon={FileText}
          title={t("noExams")}
          description={t("noExamsDesc")}
        />
      </div>
    );
  }

  const instances = await getStudentInstances(studentProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {instances.length > 0 ? (
        <>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("examTitle")}</TableHead>
                <TableHead>{t("groupName")}</TableHead>
                <TableHead>{t("dateRange")}</TableHead>
                <TableHead>{t("submissionStatus")}</TableHead>
                <TableHead>{t("score")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((inst) => {
                const subStatusKey = inst.latestStatus === "IN_PROGRESS" ? "inProgress" : inst.latestStatus === "NOT_STARTED" ? "notStarted" : inst.latestStatus.toLowerCase();

                return (
                  <TableRow key={inst.id}>
                    <TableCell>
                      <Link href={`/${locale}/student/exams/${inst.id}`} className="font-medium hover:underline">
                        {inst.template.title}
                      </Link>
                      {inst.timeLimitMinutes && (
                        <span className="ms-2 text-xs text-muted-foreground">⏱ {inst.timeLimitMinutes}min</span>
                      )}
                    </TableCell>
                    <TableCell>{inst.group.name}</TableCell>
                    <TableCell>
                      {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <Badge className={SUBMISSION_COLORS[inst.latestStatus] || ""}>
                        {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {inst.bestScore !== null ? (
                        <>
                          {Math.round(inst.bestScore)}%{" "}
                          <Badge className={inst.bestPassed ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
                            {inst.bestPassed ? t("passed") : t("failed")}
                          </Badge>
                          {inst.maxAttempts && inst.totalAttempts > 0 && (
                            <span className="ms-2 text-xs text-muted-foreground">
                              ({inst.totalAttempts}/{inst.maxAttempts})
                            </span>
                          )}
                        </>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="space-y-3 md:hidden">
            {instances.map((inst) => {
              const subStatusKey = inst.latestStatus === "IN_PROGRESS" ? "inProgress" : inst.latestStatus === "NOT_STARTED" ? "notStarted" : inst.latestStatus.toLowerCase();

              return (
                <Link key={inst.id} href={`/${locale}/student/exams/${inst.id}`}>
                  <Card className="transition-colors hover:border-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{inst.template.title}</p>
                          <p className="text-sm text-muted-foreground">{inst.group.name}</p>
                        </div>
                        <Badge className={SUBMISSION_COLORS[inst.latestStatus] || ""}>
                          {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}</span>
                        {inst.timeLimitMinutes && <span>⏱ {inst.timeLimitMinutes}min</span>}
                      </div>
                      {inst.bestScore !== null && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-semibold">{Math.round(inst.bestScore)}%</span>
                          <Badge className={inst.bestPassed ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
                            {inst.bestPassed ? t("passed") : t("failed")}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title={t("noExams")}
          description={t("noExamsDesc")}
        />
      )}
    </div>
  );
}
