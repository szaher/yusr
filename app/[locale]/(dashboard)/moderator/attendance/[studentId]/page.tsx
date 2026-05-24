import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentAttendanceStats,
  getAttendanceByMonth,
  getStudentAttendanceLog,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function StudentAttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; studentId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");
  const sp = await searchParams;
  const currentPage = sp.page ? parseInt(sp.page, 10) : 1;

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      user: { select: { name: true } },
      groupStudents: {
        select: { group: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  const [stats, monthlyData, log] = await Promise.all([
    getStudentAttendanceStats(studentId),
    getAttendanceByMonth("student", studentId),
    getStudentAttendanceLog(studentId, currentPage),
  ]);

  const statusBadge: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    PRESENT: { variant: "default", label: t("present") },
    ABSENT: { variant: "destructive", label: t("absent") },
    LATE: { variant: "secondary", label: t("late") },
    EXCUSED_ABSENCE: { variant: "outline", label: t("excusedAbsence") },
    PENDING: { variant: "outline", label: t("pending") },
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/moderator/attendance`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupOverview")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{student.user.name}</h1>
        {student.groupStudents[0] && (
          <p className="text-sm text-muted-foreground">
            {student.groupStudents[0].group.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("consecutiveDays", { count: stats.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("consecutiveDays", { count: stats.longestStreak })}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={t("sessionsAttended")}
          value={`${stats.attended} / ${stats.totalSessions}`}
          colorClass="text-amber-600"
        />
      </div>

      <StackedBarChartCard
        title={t("monthlyBreakdown")}
        data={monthlyData}
        layers={[
          { key: "present", color: "#22c55e", label: t("present") },
          { key: "late", color: "#eab308", label: t("late") },
          { key: "excused", color: "#3b82f6", label: t("excusedAbsence") },
          { key: "absent", color: "#ef4444", label: t("absent") },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("sessionLog")}</h2>
        {log.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("sessionTime")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.records.map((r, i) => {
                    const badge = statusBadge[r.attendance] ?? statusBadge.PENDING;
                    return (
                      <TableRow key={i}>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.startTime ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {log.pages > 1 && (
              <div className="flex items-center justify-between pt-3">
                {currentPage > 1 ? (
                  <Link href={`?page=${currentPage - 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {log.pages}
                </span>
                {currentPage < log.pages ? (
                  <Link href={`?page=${currentPage + 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
