import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getGroupAttendanceStats,
  getAttendanceByWeek,
  getStudentsAtRisk,
  getStudentAttendanceStats,
  getAlertConfig,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { QuickMarkForm } from "@/components/attendance/quick-mark-form";
import { AlertConfigForm } from "@/components/attendance/alert-config-form";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ModeratorAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");
  const sp = await searchParams;

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      groups: {
        where: { active: true },
        select: { id: true, name: true },
      },
    },
  });

  const groups = profile?.groups ?? [];
  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("noSessions")}</p>
      </div>
    );
  }

  const selectedGroupId = sp.group && groups.some((g) => g.id === sp.group)
    ? sp.group
    : groups[0].id;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId)!;

  const [stats, weeklyTrend, atRisk, alertConfig] = await Promise.all([
    getGroupAttendanceStats(selectedGroupId),
    getAttendanceByWeek("group", selectedGroupId),
    getStudentsAtRisk(selectedGroupId),
    getAlertConfig(selectedGroupId),
  ]);

  const recentSessions = await db.weeklySession.findMany({
    where: {
      groupId: selectedGroupId,
      status: { in: ["SCHEDULED", "OPEN"] },
    },
    orderBy: { date: "desc" },
    take: 5,
    select: { id: true, date: true, startTime: true },
  });

  const groupStudents = await db.groupStudent.findMany({
    where: { groupId: selectedGroupId },
    select: {
      student: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  const studentList = groupStudents.map((gs) => ({
    id: gs.student.id,
    name: gs.student.user.name ?? "—",
  }));

  const studentStats = await Promise.all(
    studentList.map(async (s) => {
      const stats = await getStudentAttendanceStats(s.id);
      const recent = await db.sessionStudent.findFirst({
        where: { studentId: s.id },
        orderBy: { session: { date: "desc" } },
        select: { attendance: true },
      });
      return {
        ...s,
        rate: stats.overallRate,
        consecutiveAbsences: stats.totalSessions - stats.attended,
        lastStatus: recent?.attendance ?? "PENDING",
      };
    })
  );

  const hasOverride = !!(await db.attendanceAlertConfig.findUnique({
    where: { groupId: selectedGroupId },
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <a key={g.id} href={`?group=${g.id}`}>
              <Badge
                variant={g.id === selectedGroupId ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("sessionsThisMonth")}
          value={stats.sessionsThisMonth}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("studentsAtRisk")}
          value={atRisk.length}
          colorClass="text-red-600"
        />
      </div>

      <QuickMarkForm
        sessions={recentSessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          startTime: s.startTime,
        }))}
        students={studentList}
      />

      <LineChartCard title={t("weeklyTrend")} data={weeklyTrend} color="#22c55e" />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("groupOverview")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("attendanceRate")}</TableHead>
                <TableHead>{t("lastSession")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentStats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/attendance/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {s.rate != null ? (
                      <Badge variant={s.rate < 75 ? "destructive" : "secondary"}>
                        {s.rate}%
                      </Badge>
                    ) : (
                      t("na")
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(s.lastStatus.toLowerCase() === "excused_absence" ? "excusedAbsence" : s.lastStatus.toLowerCase())}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertConfigForm
        groupId={selectedGroupId}
        initialConfig={{
          consecutiveAbsenceThreshold: alertConfig.consecutiveAbsenceThreshold,
          attendanceRateThreshold: alertConfig.attendanceRateThreshold,
          notifyModerator: alertConfig.notifyModerator,
          notifyAdmin: alertConfig.notifyAdmin,
        }}
        isOverride={hasOverride}
        label={selectedGroup.name}
      />
    </div>
  );
}
