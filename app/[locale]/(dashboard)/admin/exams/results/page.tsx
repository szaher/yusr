import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAllInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";
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
import { STATUS_COLORS } from "@/lib/constants/status-colors";

export default async function AdminExamResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ALL);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const showAll = filter === "all";
  const instances = await getAllInstances(showAll ? "all" : "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("results")}</h1>
        <a href={showAll ? `/${locale}/admin/exams/results` : `/${locale}/admin/exams/results?filter=all`}>
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissions")}</TableHead>
              <TableHead>{t("averageScore")}</TableHead>
              <TableHead>{t("passRate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const statusKey = inst.status === "IN_PROGRESS" ? "inProgress" : inst.status.toLowerCase();
              const graded = inst.submissions.filter((s: { status: string }) => s.status === "GRADED");
              const studentBestScores = new Map<string, { totalScore: number; passed: boolean }>();
              for (const s of graded) {
                const key = s.studentId;
                const existing = studentBestScores.get(key);
                if (!existing || (s.totalScore ?? 0) > existing.totalScore) {
                  studentBestScores.set(key, { totalScore: s.totalScore ?? 0, passed: s.passed ?? false });
                }
              }
              const bestScores = Array.from(studentBestScores.values());
              const avgScore = bestScores.length > 0
                ? Math.round(bestScores.reduce((sum, s) => sum + s.totalScore, 0) / bestScores.length)
                : null;
              const passCount = bestScores.filter((s) => s.passed).length;
              const passRate = bestScores.length > 0 ? Math.round((passCount / bestScores.length) * 100) : null;

              return (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.template.title}</TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[inst.status] || ""}>
                      {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{graded.length}/{inst._count.submissions}</TableCell>
                  <TableCell>{avgScore !== null ? `${avgScore}%` : "—"}</TableCell>
                  <TableCell>{passRate !== null ? `${passRate}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={BarChart3}
          title={t("noInstances")}
          description={t("noResultsDesc")}
        />
      )}
    </div>
  );
}
