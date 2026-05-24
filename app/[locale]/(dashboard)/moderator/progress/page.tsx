import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { getGroupProgressOverview } from "@/server/services/progress";
import {
  getGroupLeaderboard,
  getBadgeCatalog,
} from "@/server/services/gamification";
import { AwardBadgeDialog } from "@/components/gamification/award-badge-dialog";
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

export default async function ModeratorProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");
  const sp = await searchParams;

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
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
        <h1 className="text-2xl font-bold">{t("groupProgress")}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const selectedGroupId =
    sp.group && groups.some((g) => g.id === sp.group) ? sp.group : groups[0].id;

  const overview = await getGroupProgressOverview(selectedGroupId);

  const recentMilestones = await db.studentMilestone.findMany({
    where: {
      student: { groupStudents: { some: { groupId: selectedGroupId } } },
    },
    orderBy: { achievedAt: "desc" },
    take: 10,
    include: { student: { select: { user: { select: { name: true } } } } },
  });

  const gamificationEnabled = await isFeatureEnabled("gamification");

  let leaderboard: Awaited<ReturnType<typeof getGroupLeaderboard>> = [];
  let manualBadges: { id: string; key: string; icon: string; color: string }[] = [];

  if (gamificationEnabled) {
    const catalog = await getBadgeCatalog();
    manualBadges = catalog
      .filter((b) => b.category === "SPECIAL")
      .map((b) => ({ id: b.id, key: b.key, icon: b.icon, color: b.color }));
    leaderboard = await getGroupLeaderboard(selectedGroupId);
  }

  const tg = await getTranslations("gamification");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("groupProgress")}</h1>

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

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("groupProgress")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("quranPercentage")}</TableHead>
                <TableHead>{t("juzCompleted")}</TableHead>
                <TableHead>{t("currentStreak")}</TableHead>
                <TableHead>{t("lastReview")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/progress/${s.studentId}`}
                      className="font-medium hover:underline"
                    >
                      {s.studentName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.quranPercentage}%</Badge>
                  </TableCell>
                  <TableCell>{s.juzCount}</TableCell>
                  <TableCell>{t("weeksStreak", { count: s.currentStreak })}</TableCell>
                  <TableCell>
                    {s.lastReview
                      ? new Date(s.lastReview).toLocaleDateString()
                      : t("na")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  const earnedBadgeIds = new Set<string>();
                  return (
                    <TableRow key={entry.studentId}>
                      <TableCell className="font-bold">{entry.rank}</TableCell>
                      <TableCell className="font-medium">{entry.studentName}</TableCell>
                      <TableCell>{entry.milestoneCount}</TableCell>
                      <TableCell>{entry.quranPercentage}%</TableCell>
                      <TableCell>{t("weeksStreak", { count: entry.currentStreak })}</TableCell>
                      <TableCell>{entry.badgeCount}</TableCell>
                      <TableCell>
                        {manualBadges.length > 0 && (
                          <AwardBadgeDialog
                            studentId={entry.studentId}
                            studentName={entry.studentName}
                            manualBadges={manualBadges}
                            earnedBadgeIds={earnedBadgeIds}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {recentMilestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("recentMilestones")}</h2>
          <div className="space-y-2">
            {recentMilestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.student.user.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.achievedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
