import { db } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getStudentEligibility } from "@/server/services/assignment";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { getRecentBadges } from "@/server/services/gamification";
import {
  getStudentKPIs,
  getStudentGradeHistory,
  getStudentMemorizationProgress,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { Trophy, Star, Flame, BookOpen, Mic, TrendingUp, Users, Heart, Crown } from "lucide-react";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("student.dashboard");

  const application = await db.enrollmentApplication.findUnique({
    where: { userId: session.user.id },
  });

  if (!application || application.registrationStatus !== "APPROVED") {
    const regT = await getTranslations("registration");
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold">{regT("pendingReview")}</h2>
            <p className="mt-2 text-muted-foreground">
              {regT("pendingReviewDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analyticsEnabled = await isFeatureEnabled("analytics");
  const gamificationEnabled = await isFeatureEnabled("gamification");
  const announcements = await getActiveAnnouncementsForUser(session.user.id);

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      groupStudents: {
        include: {
          group: {
            include: {
              class: {
                include: {
                  level: true,
                },
              },
              moderator: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const groupAssignment = studentProfile?.groupStudents[0];
  const eligibility = await getStudentEligibility(session.user.id);

  let recentBadges: Awaited<ReturnType<typeof getRecentBadges>> = [];
  if (gamificationEnabled && studentProfile) {
    recentBadges = await getRecentBadges(studentProfile.id);
  }
  const tg = await getTranslations("gamification");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2 mb-6">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-500/10 dark:border-red-800 dark:bg-red-500/10"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-500/10 dark:border-amber-800 dark:bg-amber-500/10"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      {!groupAssignment ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroupAssigned")}</p>
          </CardContent>
        </Card>
      ) : analyticsEnabled ? (
        <StudentAnalytics
          studentProfileId={studentProfile!.id}
          groupAssignment={groupAssignment}
          eligibility={eligibility}
          t={{
            myLevel: t("myLevel"),
            myClass: t("myClass"),
            myGroup: t("myGroup"),
            myModerator: t("myModerator"),
            assignments: t("assignments"),
            assignmentsCompleted: t("assignmentsCompleted"),
          }}
        />
      ) : (
        <StudentFallbackCards
          groupAssignment={groupAssignment}
          eligibility={eligibility}
          t={{
            myLevel: t("myLevel"),
            myClass: t("myClass"),
            myGroup: t("myGroup"),
            myModerator: t("myModerator"),
            assignmentsCompleted: t("assignmentsCompleted"),
          }}
        />
      )}

      {recentBadges.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">{tg("recentBadges")}</h2>
            <a
              href={`/${locale}/student/progress`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {tg("viewAll")} →
            </a>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentBadges.map((sb) => {
              const iconMap: Record<string, React.ElementType> = {
                trophy: Trophy, star: Star, flame: Flame,
                "book-open": BookOpen, mic: Mic, "trending-up": TrendingUp,
                users: Users, heart: Heart, crown: Crown,
              };
              const Icon = iconMap[sb.badge.icon] ?? Trophy;
              return (
                <div
                  key={sb.id}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <Icon className="size-4" style={{ color: sb.badge.color }} />
                  <span className="text-xs font-medium">{tg(`badge_${sb.badge.key}`)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

async function StudentAnalytics({
  studentProfileId,
  groupAssignment,
  eligibility,
  t,
}: {
  studentProfileId: string;
  groupAssignment: {
    group: {
      name: string;
      class: { name: string; level: { nameAr: string; nameEn?: string | null } };
      moderator: { user: { name: string | null } } | null;
    };
  };
  eligibility: { completed: number; total: number; eligible: boolean };
  t: { myLevel: string; myClass: string; myGroup: string; myModerator: string; assignments: string; assignmentsCompleted: string };
}) {
  const at = await getTranslations("analytics");

  const [kpis, gradeHistory, memProgress] = await Promise.all([
    getStudentKPIs(studentProfileId),
    getStudentGradeHistory(studentProfileId),
    getStudentMemorizationProgress(studentProfileId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          <strong>{t.myLevel}:</strong> {groupAssignment.group.class.level.nameAr}
        </span>
        <span>
          <strong>{t.myClass}:</strong> {groupAssignment.group.class.name}
        </span>
        <span>
          <strong>{t.myGroup}:</strong> {groupAssignment.group.name}
        </span>
        <span>
          <strong>{t.myModerator}:</strong>{" "}
          {groupAssignment.group.moderator?.user?.name ?? "—"}
        </span>
        <span>
          <strong>{t.assignments}:</strong>{" "}
          <span className={eligibility.eligible ? "text-green-600" : "text-yellow-600"}>
            {eligibility.completed}/{eligibility.total}
          </span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.memorizationProgress !== null && (
          <StatsCard
            title={at("memorizationProgress")}
            value={`${kpis.memorizationProgress}%`}
            colorClass="text-green-600"
          />
        )}
        <StatsCard
          title={at("avgExamScore")}
          value={`${kpis.avgExamScore}%`}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={at("attendanceStreak")}
          value={`${kpis.attendanceStreak} ${at("sessions")}`}
          colorClass="text-blue-600"
        />
      </div>

      <LineChartCard
        title={at("gradeHistory")}
        data={gradeHistory}
        color="#3b82f6"
        yAxisLabel={at("grade")}
      />

      {memProgress.length > 0 && (
        <LineChartCard
          title={at("memorizationReviews")}
          data={memProgress}
          color="#22c55e"
          yAxisLabel={at("grade")}
        />
      )}
    </div>
  );
}

function StudentFallbackCards({
  groupAssignment,
  eligibility,
  t,
}: {
  groupAssignment: {
    group: {
      name: string;
      class: { name: string; level: { nameAr: string; nameEn?: string | null } };
      moderator: { user: { name: string | null } } | null;
    };
  };
  eligibility: { completed: number; total: number; eligible: boolean };
  t: { myLevel: string; myClass: string; myGroup: string; myModerator: string; assignmentsCompleted: string };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myLevel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.class.level.nameAr}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myClass}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.class.name}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myGroup}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.name}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myModerator}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.moderator?.user?.name ?? "-"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.assignmentsCompleted}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-lg font-semibold ${eligibility.eligible ? "text-green-600" : "text-yellow-600"}`}>
            {eligibility.completed}/{eligibility.total}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
