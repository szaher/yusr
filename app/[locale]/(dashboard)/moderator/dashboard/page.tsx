import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorGroups } from "@/server/services/organization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getModeratorKPIs,
  getStudentAttendanceGrid,
  getSessionGradeTrend,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { AttendanceGrid } from "@/components/charts/attendance-grid";
import { LineChartCard } from "@/components/charts/line-chart-card";

export default async function ModeratorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("moderator.dashboard");
  const analyticsEnabled = await isFeatureEnabled("analytics");

  const groups = await getModeratorGroups(session.user.id);
  const announcements = await getActiveAnnouncementsForUser(session.user.id);
  const totalStudents = groups.reduce((sum, g) => sum + g._count.students, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-50"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroups")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {analyticsEnabled && (
            <ModeratorAnalytics userId={session.user.id} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("myGroups")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{groups.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("totalStudents")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{group.class.name} — {group.class.level.nameAr}</p>
                  <p>
                    {t("totalStudents")}: {group._count.students}
                  </p>
                  {group.weeklyDay && (
                    <p>
                      {group.weeklyDay} {group.weeklyTime ? `• ${group.weeklyTime}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function ModeratorAnalytics({ userId }: { userId: string }) {
  const at = await getTranslations("analytics");

  const [kpis, attendanceGrid, gradeTrend] = await Promise.all([
    getModeratorKPIs(userId),
    getStudentAttendanceGrid(userId),
    getSessionGradeTrend(userId),
  ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title={at("attendanceRate")}
          value={`${kpis.attendanceRate}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={at("avgSessionGrade")}
          value={`${kpis.avgGrade}%`}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={at("pendingGradings")}
          value={kpis.pendingGradings}
          colorClass="text-blue-600"
        />
      </div>

      <AttendanceGrid
        title={at("studentAttendance")}
        rows={attendanceGrid}
        statusLabels={{
          present: at("present"),
          absent: at("absent"),
          late: at("late"),
          excused: at("excused"),
          none: "—",
        }}
      />

      <LineChartCard
        title={at("sessionGradeTrend")}
        data={gradeTrend}
        color="#f59e0b"
        yAxisLabel={at("grade")}
      />
    </>
  );
}
