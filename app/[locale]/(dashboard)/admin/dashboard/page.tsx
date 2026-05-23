import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getAdminKPIs,
  getAttendanceTrend,
  getExamScoreDistribution,
  getMemorizationProgressByGroup,
  getGroupComparison,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { DistributionChartCard } from "@/components/charts/distribution-chart-card";
import { ProgressListCard } from "@/components/charts/progress-list-card";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("admin.dashboard");
  const analyticsEnabled = await isFeatureEnabled("analytics");

  const announcements = await getActiveAnnouncementsForUser(session.user.id);

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

      {analyticsEnabled ? (
        <AdminAnalytics />
      ) : (
        <AdminFallbackCards />
      )}
    </div>
  );
}

async function AdminAnalytics() {
  const at = await getTranslations("analytics");

  const [kpis, attendanceTrend, scoreDistribution, memProgress, groupComparison] =
    await Promise.all([
      getAdminKPIs(),
      getAttendanceTrend(),
      getExamScoreDistribution(),
      getMemorizationProgressByGroup(),
      getGroupComparison(),
    ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={at("activeStudents")}
          value={kpis.activeStudents}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={at("avgAttendance")}
          value={`${kpis.avgAttendance}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={at("avgSessionGrade")}
          value={`${kpis.avgSessionGrade}%`}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={at("examPassRate")}
          value={`${kpis.examPassRate}%`}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={at("pendingRegistrations")}
          value={kpis.pendingRegistrations}
          colorClass="text-rose-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={at("attendanceTrend")}
          data={attendanceTrend}
          dataKeys={[{ key: "rate", color: "#3b82f6", label: at("rate") }]}
          xAxisKey="label"
        />
        <DistributionChartCard
          title={at("examScoreDistribution")}
          data={scoreDistribution}
        />
        <ProgressListCard
          title={at("memorizationByGroup")}
          items={memProgress}
        />
        <BarChartCard
          title={at("groupComparison")}
          data={groupComparison}
          dataKeys={[
            { key: "attendance", color: "#3b82f6", label: at("attendance") },
            { key: "memorization", color: "#22c55e", label: at("memorization") },
            { key: "exams", color: "#a855f7", label: at("exams") },
          ]}
        />
      </div>
    </>
  );
}

async function AdminFallbackCards() {
  const t = await getTranslations("admin.dashboard");

  const [pendingCount, activeStudents, activeModerators, enrollmentSetting] =
    await Promise.all([
      db.enrollmentApplication.count({
        where: { registrationStatus: "PENDING_REVIEW" },
      }),
      db.user.count({
        where: {
          role: { name: "student" },
          accountStatus: "ACTIVE",
        },
      }),
      db.user.count({
        where: {
          role: { name: "moderator" },
          accountStatus: "ACTIVE",
        },
      }),
      db.systemSetting.findUnique({ where: { key: "enrollment_state" } }),
    ]);

  const cards = [
    { title: t("pendingRegistrations"), value: pendingCount },
    { title: t("activeStudents"), value: activeStudents },
    { title: t("activeModerators"), value: activeModerators },
    { title: t("enrollmentStatus"), value: enrollmentSetting?.value ?? "closed" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
