import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import {
  getSchoolProgressStats,
  getMilestonesByMonth,
  getGroupProgressComparison,
  getTopPerformers,
} from "@/server/services/progress";
import {
  getSchoolLeaderboard,
  getBadgesAwardedThisMonth,
} from "@/server/services/gamification";
import { StatsCard } from "@/components/charts/stats-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

export default async function AdminProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");
  const tg = await getTranslations("gamification");

  const [stats, milestonesByMonth, groupComparison, topPerformers] = await Promise.all([
    getSchoolProgressStats(),
    getMilestonesByMonth(),
    getGroupProgressComparison(),
    getTopPerformers(),
  ]);

  const gamificationEnabled = await isFeatureEnabled("gamification");

  let badgesThisMonth = 0;
  let schoolLeaderboard: Awaited<ReturnType<typeof getSchoolLeaderboard>> = [];

  if (gamificationEnabled) {
    [badgesThisMonth, schoolLeaderboard] = await Promise.all([
      getBadgesAwardedThisMonth(),
      getSchoolLeaderboard(),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("schoolProgress")}</h1>
        <a href="/api/export/progress" download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 me-2" />
            {t("exportCsv")}
          </Button>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("milestonesThisMonth")}
          value={stats.milestonesThisMonth}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={t("studentsWithPlans")}
          value={stats.studentsWithActivePlans}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("avgQuranPercentage")}
          value={`${stats.avgQuranPercentage}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("topStreak")}
          value={t("weeksStreak", { count: stats.topStreak })}
          colorClass="text-purple-600"
        />
        {gamificationEnabled && (
          <StatsCard
            title={tg("badgesThisMonth")}
            value={badgesThisMonth}
            colorClass="text-pink-600"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StackedBarChartCard
          title={t("milestonesByMonth")}
          data={milestonesByMonth}
          layers={[
            { key: "juz", color: "#f59e0b", label: t("milestone_JUZ_COMPLETE") },
            { key: "surah", color: "#22c55e", label: t("milestone_SURAH_COMPLETE") },
            { key: "hizb", color: "#3b82f6", label: t("milestone_HIZB_COMPLETE") },
            { key: "custom", color: "#8b5cf6", label: t("milestone_CUSTOM_GOAL") },
          ]}
        />
        <BarChartCard
          title={t("groupComparison")}
          data={groupComparison}
          dataKeys={[{ key: "value", color: "#3b82f6", label: t("quranPercentage") }]}
        />
      </div>

      {topPerformers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("topPerformers")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentName")}</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("quranPercentage")}</TableHead>
                  <TableHead>{t("milestones")}</TableHead>
                  <TableHead>{t("currentStreak")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerformers.map((p) => (
                  <TableRow key={p.studentId}>
                    <TableCell className="font-medium">{p.studentName}</TableCell>
                    <TableCell>{p.groupName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.quranPercentage}%</Badge>
                    </TableCell>
                    <TableCell>{p.milestoneCount}</TableCell>
                    <TableCell>{t("weeksStreak", { count: p.currentStreak })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {gamificationEnabled && schoolLeaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("schoolLeaderboard")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg("rank")}</TableHead>
                  <TableHead>{tg("studentName")}</TableHead>
                  <TableHead>{tg("milestones")}</TableHead>
                  <TableHead>{tg("quranPercentage")}</TableHead>
                  <TableHead>{tg("streak")}</TableHead>
                  <TableHead>{tg("badges")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolLeaderboard.map((entry: typeof schoolLeaderboard[number]) => (
                  <TableRow key={entry.studentId}>
                    <TableCell className="font-bold">{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.studentName}</TableCell>
                    <TableCell>{entry.milestoneCount}</TableCell>
                    <TableCell>{entry.quranPercentage}%</TableCell>
                    <TableCell>{t("weeksStreak", { count: entry.currentStreak })}</TableCell>
                    <TableCell>{entry.badgeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
