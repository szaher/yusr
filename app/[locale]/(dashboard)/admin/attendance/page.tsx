import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import {
  getSchoolAttendanceStats,
  getAttendanceByWeek,
  getAttendanceByMonth,
  getAttendanceGroupComparison,
  getStudentsAtRisk,
  getMostAbsentGroup,
  getAlertConfig,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { AlertConfigForm } from "@/components/attendance/alert-config-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");

  const [stats, weeklyTrend, monthlyData, groupComparison, atRisk, worstGroup, alertConfig] =
    await Promise.all([
      getSchoolAttendanceStats(),
      getAttendanceByWeek("school"),
      getAttendanceByMonth("school"),
      getAttendanceGroupComparison(),
      getStudentsAtRisk(),
      getMostAbsentGroup(),
      getAlertConfig(null),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatsCard
          title={t("mostAbsentGroup")}
          value={worstGroup ? `${worstGroup.label} (${worstGroup.rate}%)` : t("na")}
          colorClass="text-amber-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard title={t("weeklyTrend")} data={weeklyTrend} color="#22c55e" />
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
        <BarChartCard
          title={t("groupComparison")}
          data={groupComparison}
          dataKeys={[{ key: "rate", color: "#3b82f6", label: t("attendanceRate") }]}
        />
      </div>

      {atRisk.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("atRiskStudents")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentName")}</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("attendanceRate")}</TableHead>
                  <TableHead>{t("consecutiveAbsences")}</TableHead>
                  <TableHead>{t("lastSession")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRisk.map((s) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="font-medium">{s.studentName}</TableCell>
                    <TableCell>{s.groupName}</TableCell>
                    <TableCell>
                      <Badge variant={s.attendanceRate < 75 ? "destructive" : "secondary"}>
                        {s.attendanceRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>{s.consecutiveAbsences}</TableCell>
                    <TableCell>
                      {s.lastSessionDate
                        ? new Date(s.lastSessionDate).toLocaleDateString()
                        : t("na")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertConfigForm
        groupId={null}
        initialConfig={{
          consecutiveAbsenceThreshold: alertConfig.consecutiveAbsenceThreshold,
          attendanceRateThreshold: alertConfig.attendanceRateThreshold,
          notifyModerator: alertConfig.notifyModerator,
          notifyAdmin: alertConfig.notifyAdmin,
        }}
        isOverride={false}
        label={t("schoolDefault")}
      />
    </div>
  );
}
