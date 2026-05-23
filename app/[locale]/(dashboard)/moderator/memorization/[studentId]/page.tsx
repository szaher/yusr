import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlanByStudent, getStudentProgress } from "@/server/services/memorization-plan";
import { getReviewsByPlan } from "@/server/services/memorization-review";
import { createPlanAction, updatePlanAction } from "@/server/actions/memorization";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RESULT_COLORS } from "@/lib/constants/status-colors";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpenCheck, History } from "lucide-react";

const createPlan = createPlanAction as unknown as (formData: FormData) => void;
const updatePlan = updatePlanAction as unknown as (formData: FormData) => void;

export default async function ModeratorStudentPlanPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: { select: { name: true, nameAr: true } },
      groupStudents: {
        include: { group: { select: { id: true, name: true, memorizationPlansEnabled: true } } },
      },
    },
  });

  if (!studentProfile) notFound();

  const studentName =
    locale === "ar"
      ? studentProfile.user.nameAr || studentProfile.user.name
      : studentProfile.user.name;

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );

  const surahs = await db.quranSurah.findMany({ orderBy: { number: "asc" } });

  if (!enabledGroup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <EmptyState
          icon={BookOpenCheck}
          title={t("plan.noPlan")}
        />
      </div>
    );
  }

  const plan = await getPlanByStudent(studentProfile.id, enabledGroup.group.id);

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("plan.createPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPlan} className="grid gap-4">
              <input type="hidden" name="studentId" value={studentProfile.id} />
              <input type="hidden" name="groupId" value={enabledGroup.group.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("plan.surah")}</Label>
                  <select
                    name="surahNumber"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("plan.ayah")}</Label>
                  <Input name="ayahNumber" type="number" min="1" defaultValue="1" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("plan.paceUnit")}</Label>
                  <select
                    name="paceUnit"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RUB">{t("plan.paceRub")}</option>
                    <option value="HIZB">{t("plan.paceHizb")}</option>
                    <option value="PAGE_COUNT">{t("plan.pacePageCount")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("plan.paceValue")}</Label>
                  <Input name="paceValue" type="number" step="0.5" min="1" defaultValue="1" required />
                </div>
              </div>

              <Button type="submit">{t("plan.savePlan")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [progress, reviews] = await Promise.all([
    getStudentProgress(plan.id),
    getReviewsByPlan(plan.id),
  ]);

  const surahName =
    locale === "ar" ? plan.currentSurah.nameAr : plan.currentSurah.nameEn;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <Link href={`/${locale}/moderator/memorization/${studentId}/review`}>
          <Button>{t("review.newReview")}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.currentPosition")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("plan.surah")}</Label>
              <p className="text-sm font-semibold">{surahName}</p>
            </div>
            <div>
              <Label>{t("plan.ayah")}</Label>
              <p className="text-sm font-semibold">
                {plan.currentAyahNumber} / {plan.currentSurah.ayahCount}
              </p>
            </div>
            <div>
              <Label>{t("plan.juz")}</Label>
              <p className="text-sm font-semibold">
                {progress?.juz ?? "—"} / 30
              </p>
            </div>
            <div>
              <Label>{t("plan.overallProgress")}</Label>
              <p className="text-sm font-semibold">
                {progress?.percentage ?? 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.editPlan")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePlan} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="planId" value={plan.id} />
            <div className="space-y-2">
              <Label>{t("plan.paceUnit")}</Label>
              <select
                name="paceUnit"
                defaultValue={plan.paceUnit}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="RUB">{t("plan.paceRub")}</option>
                <option value="HIZB">{t("plan.paceHizb")}</option>
                <option value="PAGE_COUNT">{t("plan.pacePageCount")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("plan.paceValue")}</Label>
              <Input
                name="paceValue"
                type="number"
                step="0.5"
                min="1"
                defaultValue={String(plan.paceValue)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">{t("plan.savePlan")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("review.reviewHistory")}</h2>
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
              {reviews.map((rev) => {
                const fromName = locale === "ar" ? rev.fromSurah.nameAr : rev.fromSurah.nameEn;
                const toName = locale === "ar" ? rev.toSurah.nameAr : rev.toSurah.nameEn;
                return (
                  <TableRow key={rev.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/moderator/memorization/${studentId}/review/${rev.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {new Date(rev.reviewDate).toLocaleDateString(locale)}
                      </Link>
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
          <EmptyState
            icon={History}
            title={t("review.noReviews")}
            description={t("review.noReviewsDesc")}
          />
        )}
      </div>
    </div>
  );
}
