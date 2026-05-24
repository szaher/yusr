import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentProgressSummary,
  getStudentMilestones,
  getReviewsByMonth,
  getCustomGoals,
} from "@/server/services/progress";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { MilestoneTimeline } from "@/components/progress/milestone-timeline";
import {
  getStudentBadges,
  getBadgeCatalog,
  getGroupLeaderboard,
} from "@/server/services/gamification";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");
  const tg = await getTranslations("gamification");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) notFound();

  const gamificationEnabled = await isFeatureEnabled("gamification");

  let badgeCatalog: Awaited<ReturnType<typeof getBadgeCatalog>> = [];
  let studentBadges: Awaited<ReturnType<typeof getStudentBadges>> = [];
  let leaderboard: Awaited<ReturnType<typeof getGroupLeaderboard>> = [];

  if (gamificationEnabled) {
    const group = await db.groupStudent.findFirst({
      where: { studentId: profile.id },
      select: { groupId: true },
    });

    [badgeCatalog, studentBadges] = await Promise.all([
      getBadgeCatalog(),
      getStudentBadges(profile.id),
    ]);

    if (group) {
      leaderboard = await getGroupLeaderboard(group.groupId);
    }
  }

  const summary = await getStudentProgressSummary(profile.id);

  if (!summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("myProgress")}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const [milestones, reviewsByMonth, goals] = await Promise.all([
    getStudentMilestones(profile.id),
    getReviewsByMonth(profile.id),
    getCustomGoals(summary.planId),
  ]);

  const activeGoals = goals.filter((g) => !g.completedAt);
  const completedGoals = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("myProgress")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("quranPercentage")}
          value={`${summary.quranPercentage}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("juzCompleted")}
          value={t("juzCount", { count: summary.juzCompleted })}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.longestStreak })}
          colorClass="text-purple-600"
        />
      </div>

      {gamificationEnabled && badgeCatalog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("myBadges")}</h2>
          <BadgeGrid catalog={badgeCatalog} earned={studentBadges} />
        </div>
      )}

      {(activeGoals.length > 0 || completedGoals.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("customGoals")}</h2>
          <div className="space-y-2">
            {activeGoals.map((goal) => (
              <div key={goal.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t("targetSurah")}: {goal.targetSurah.nameAr} — {t("targetAyah")}: {goal.targetAyahNumber}
                  {goal.deadline && ` — ${t("deadline")}: ${new Date(goal.deadline).toLocaleDateString()}`}
                </p>
              </div>
            ))}
            {completedGoals.map((goal) => (
              <div key={goal.id} className="rounded-md border p-3 opacity-60">
                <p className="text-sm font-medium">✓ {goal.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("milestones")}</h2>
          <MilestoneTimeline milestones={milestones} emptyMessage={t("noMilestones")} />
        </div>
        <LineChartCard title={t("monthlyReviews")} data={reviewsByMonth} color="#8b5cf6" />
      </div>

      {gamificationEnabled && leaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("groupLeaderboard")}</h2>
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
                {leaderboard.map((entry: typeof leaderboard[number]) => (
                  <TableRow
                    key={entry.studentId}
                    className={entry.studentId === profile.id ? "bg-primary/5" : ""}
                  >
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
