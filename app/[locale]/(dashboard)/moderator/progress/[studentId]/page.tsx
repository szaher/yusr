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
import { CustomGoalForm } from "@/components/progress/custom-goal-form";
import Link from "next/link";

export default async function ModeratorStudentProgressPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");

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

  const summary = await getStudentProgressSummary(studentId);

  if (!summary) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/moderator/progress`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupProgress")}
        </Link>
        <h1 className="text-2xl font-bold">{student.user.name}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const [milestones, reviewsByMonth, goals] = await Promise.all([
    getStudentMilestones(studentId),
    getReviewsByMonth(studentId),
    getCustomGoals(summary.planId),
  ]);

  const surahs = await db.quranSurah.findMany({
    select: { number: true, nameAr: true, nameEn: true, ayahCount: true },
    orderBy: { number: "asc" },
  });

  const serializedGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetSurahNumber: g.targetSurahNumber,
    targetAyahNumber: g.targetAyahNumber,
    deadline: g.deadline?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    targetSurah: g.targetSurah,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/moderator/progress`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupProgress")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{student.user.name}</h1>
        {student.groupStudents[0] && (
          <p className="text-sm text-muted-foreground">
            {student.groupStudents[0].group.name} — {summary.quranPercentage}%
          </p>
        )}
      </div>

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

      <CustomGoalForm planId={summary.planId} goals={serializedGoals} surahs={surahs} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("milestones")}</h2>
          <MilestoneTimeline milestones={milestones} emptyMessage={t("noMilestones")} />
        </div>
        <LineChartCard title={t("monthlyReviews")} data={reviewsByMonth} color="#8b5cf6" />
      </div>
    </div>
  );
}
