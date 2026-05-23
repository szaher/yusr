import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentProgress } from "@/server/services/memorization-plan";
import { getReviewsByPlan } from "@/server/services/memorization-review";
import { db } from "@/server/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { Label } from "@/components/ui/label";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function StudentMemorizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("memorization");
  const tExplorer = await getTranslations("quranExplorer");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      groupStudents: {
        include: { group: { select: { id: true, name: true, memorizationPlansEnabled: true } } },
      },
    },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );

  if (!enabledGroup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = await db.studentMemorizationPlan.findUnique({
    where: {
      studentId_groupId: {
        studentId: studentProfile.id,
        groupId: enabledGroup.group.id,
      },
    },
    include: {
      currentSurah: { select: { number: true, nameAr: true, nameEn: true, ayahCount: true } },
    },
  });

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [progress, reviews] = await Promise.all([
    getStudentProgress(plan.id),
    getReviewsByPlan(plan.id),
  ]);

  const surahNameAr = plan.currentSurah.nameAr;
  const surahNameEn = plan.currentSurah.nameEn;

  const getResultText = (result: string) => {
    const map: Record<string, string> = {
      EXCELLENT: t("review.resultExcellent"),
      GOOD: t("review.resultGood"),
      ACCEPTABLE: t("review.resultAcceptable"),
      NEEDS_IMPROVEMENT: t("review.resultNeedsImprovement"),
      FAILED: t("review.resultFailed"),
    };
    return map[result] || result;
  };

  const lastReview = reviews[0];

  // Build juz completion data
  const completedJuz = progress ? progress.juz - 1 : 0;
  const currentJuz = progress?.juz || 1;
  const juzData = Array.from({ length: 30 }, (_, i) => {
    const juzNum = i + 1;
    if (juzNum < currentJuz) return { number: juzNum, status: "completed" as const };
    if (juzNum === currentJuz) return { number: juzNum, status: "current" as const };
    return { number: juzNum, status: "upcoming" as const };
  });

  // Surah progress: rub's within current surah
  const surahAyahs = await db.quranAyah.findMany({
    where: { surahNumber: plan.currentSurah.number },
    select: { ayahNumber: true, quarterNumber: true },
    orderBy: { ayahNumber: "asc" },
  });

  const quarters = new Set(surahAyahs.map((a) => a.quarterNumber));
  const sortedQuarters = Array.from(quarters).sort((a, b) => a - b);
  const currentQuarter = progress?.quarter || sortedQuarters[0];

  const quarterData = sortedQuarters.map((q) => {
    if (q < (currentQuarter || 0)) return { number: q, status: "completed" as const };
    if (q === currentQuarter) return { number: q, status: "current" as const };
    return { number: q, status: "upcoming" as const };
  });

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-xl bg-gradient-to-br from-green-900 to-green-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">
              {t("dashboard.currentlyMemorizing")}
            </p>
            <p className="mt-1 text-2xl font-bold">{surahNameAr}</p>
            <p className="text-sm opacity-90">
              {surahNameEn} · {t("plan.ayah")} {plan.currentAyahNumber} / {plan.currentSurah.ayahCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">{t("plan.overallProgress")}</p>
            <p className="text-3xl font-bold">{progress?.percentage ?? 0}%</p>
            <p className="text-xs opacity-80">{t("dashboard.ofQuran")}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm opacity-90">
          <span>{t("plan.juz")} <strong>{progress?.juz ?? "—"}</strong>/30</span>
          <span>{t("plan.hizb")} <strong>{progress?.hizb ?? "—"}</strong>/60</span>
          <span>
            {t("plan.nextReview")}{" "}
            <strong>
              {plan.nextReviewDate
                ? new Date(plan.nextReviewDate).toLocaleDateString(locale)
                : "—"}
            </strong>
          </span>
        </div>
        <Link
          href={`/${locale}/quran?surah=${plan.currentSurah.number}&ayah=${plan.currentAyahNumber}`}
          className="mt-3 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline"
        >
          <BookOpenText className="h-4 w-4" />
          {tExplorer("openInExplorer")}
        </Link>
      </div>

      {/* Quick info cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("plan.nextHomework")}</p>
            <p className="mt-1 font-semibold">
              {lastReview
                ? `${locale === "ar" ? lastReview.toSurah.nameAr : lastReview.toSurah.nameEn} ${lastReview.toAyah + 1}+`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("tajweed.currentFocus")}</p>
            <p className="mt-1 font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("dashboard.lastReview")}</p>
            {lastReview ? (
              <>
                <p className="mt-1 font-semibold">
                  {new Date(lastReview.reviewDate).toLocaleDateString(locale)} · {lastReview.grade}
                </p>
                <Badge className={RESULT_COLORS[lastReview.recitationResult] || ""}>
                  {getResultText(lastReview.recitationResult)}
                </Badge>
              </>
            ) : (
              <p className="mt-1 font-semibold">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Juz Grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("dashboard.juzGrid")}
          </p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-600" />
              {t("dashboard.completed")}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm border-2 border-green-600" />
              {t("dashboard.inProgress")}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted" />
              {t("dashboard.notStarted")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-15 gap-1">
          {juzData.map((j) => (
            <div
              key={j.number}
              className={`flex aspect-square items-center justify-center rounded text-xs font-semibold ${
                j.status === "completed"
                  ? "bg-green-600 text-white"
                  : j.status === "current"
                    ? "border-2 border-green-600 font-bold"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {j.number}
            </div>
          ))}
        </div>
      </div>

      {/* Current Surah Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("dashboard.surahProgress")}</CardTitle>
            <span className="text-sm font-semibold text-green-600">
              {Math.round(
                ((plan.currentAyahNumber - 1) / plan.currentSurah.ayahCount) * 100
              )}
              %
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {surahNameAr} · {surahNameEn} · {plan.currentAyahNumber} / {plan.currentSurah.ayahCount} {t("dashboard.ayahs")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-0.5">
            {quarterData.map((q) => (
              <div
                key={q.number}
                className={`h-7 flex-1 flex items-center justify-center text-[9px] font-semibold first:rounded-s last:rounded-e ${
                  q.status === "completed"
                    ? "bg-green-600 text-white"
                    : q.status === "current"
                      ? "border-2 border-green-600"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {q.status === "completed" ? "✓" : `R${q.number}`}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">
          {t("dashboard.recentReviews")}
        </h2>
        {reviews.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("review.date")}</TableHead>
                <TableHead>{t("review.range")}</TableHead>
                <TableHead>{t("review.result")}</TableHead>
                <TableHead>{t("review.grade")}</TableHead>
                <TableHead>{t("review.mistakeCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.slice(0, 10).map((rev) => {
                const fromName = locale === "ar" ? rev.fromSurah.nameAr : rev.fromSurah.nameEn;
                const toName = locale === "ar" ? rev.toSurah.nameAr : rev.toSurah.nameEn;
                return (
                  <TableRow key={rev.id}>
                    <TableCell>
                      {new Date(rev.reviewDate).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      {fromName} {rev.fromAyah} → {toName} {rev.toAyah}
                    </TableCell>
                    <TableCell>
                      <Badge className={RESULT_COLORS[rev.recitationResult] || ""}>
                        {getResultText(rev.recitationResult)}
                      </Badge>
                    </TableCell>
                    <TableCell>{rev.grade}</TableCell>
                    <TableCell>{rev._count.mistakes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("review.noReviews")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
