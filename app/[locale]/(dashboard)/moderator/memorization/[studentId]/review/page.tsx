import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlanByStudent, getStudentProgress } from "@/server/services/memorization-plan";
import { calculateNextHomework } from "@/server/services/memorization-review";
import { listTajweedCategories } from "@/server/services/tajweed-category";
import { createReviewAction } from "@/server/actions/memorization";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const createReview = createReviewAction as unknown as (formData: FormData) => void;

export default async function ModeratorReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; studentId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { locale, studentId } = await params;
  const { sessionId } = await searchParams;
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

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );
  if (!enabledGroup) notFound();

  const plan = await getPlanByStudent(studentProfile.id, enabledGroup.group.id);
  if (!plan) notFound();

  const [progress, suggestion, surahs, categories] = await Promise.all([
    getStudentProgress(plan.id),
    calculateNextHomework(plan.id),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
    listTajweedCategories(),
  ]);

  const studentName =
    locale === "ar"
      ? studentProfile.user.nameAr || studentProfile.user.name
      : studentProfile.user.name;
  const surahName =
    locale === "ar" ? plan.currentSurah.nameAr : plan.currentSurah.nameEn;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("review.title")} — {studentName}
      </h1>

      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("plan.currentPosition")}</Label>
              <p className="text-sm font-semibold">
                {surahName} : {plan.currentAyahNumber}
              </p>
            </div>
            <div>
              <Label>{t("plan.juz")}</Label>
              <p className="text-sm font-semibold">{progress?.juz ?? "—"}</p>
            </div>
            <div>
              <Label>{t("plan.hizb")}</Label>
              <p className="text-sm font-semibold">{progress?.hizb ?? "—"}</p>
            </div>
            <div>
              <Label>{t("plan.paceUnit")}</Label>
              <p className="text-sm font-semibold">
                {plan.paceValue.toString()} {t(`plan.pace${plan.paceUnit === "RUB" ? "Rub" : plan.paceUnit === "HIZB" ? "Hizb" : "PageCount"}`)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form action={createReview} className="space-y-6">
        <input type="hidden" name="planId" value={plan.id} />
        {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}

        <Card>
          <CardHeader>
            <CardTitle>{t("review.rangeReviewed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.from")}</Label>
                <div className="flex gap-2">
                  <select
                    name="fromSurahNumber"
                    defaultValue={plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="fromAyah"
                    type="number"
                    min="1"
                    defaultValue={plan.currentAyahNumber}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("review.to")}</Label>
                <div className="flex gap-2">
                  <select
                    name="toSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="toAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah || plan.currentAyahNumber}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("review.recitationResult")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.result")}</Label>
                <select
                  name="recitationResult"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EXCELLENT">{t("review.resultExcellent")}</option>
                  <option value="GOOD">{t("review.resultGood")}</option>
                  <option value="ACCEPTABLE">{t("review.resultAcceptable")}</option>
                  <option value="NEEDS_IMPROVEMENT">{t("review.resultNeedsImprovement")}</option>
                  <option value="FAILED">{t("review.resultFailed")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("review.grade")}</Label>
                <Input name="grade" type="number" min="0" max="100" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tajweed.scores")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="grid gap-2 sm:grid-cols-3 items-center">
                    <input type="hidden" name={`tajweedScores.${idx}.categoryId`} value={cat.id} />
                    <Label>{locale === "ar" ? cat.nameAr : cat.nameEn}</Label>
                    <Input
                      name={`tajweedScores.${idx}.score`}
                      type="number"
                      min="1"
                      max="10"
                      placeholder="/10"
                    />
                    <Input
                      name={`tajweedScores.${idx}.notes`}
                      placeholder={t("review.notes")}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("review.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                name="notes"
                rows={3}
                placeholder={t("review.notes")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("review.voiceNote")}</Label>
              <Input name="voiceNoteUrl" type="url" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle>{t("review.nextHomework")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.from")}</Label>
                <div className="flex gap-2">
                  <select
                    name="nextFromSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="nextFromAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah ? suggestion.toAyah + 1 : 1}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("review.to")}</Label>
                <div className="flex gap-2">
                  <select
                    name="nextToSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="nextToAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah || 1}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg">
          {t("review.saveReview")}
        </Button>
      </form>
    </div>
  );
}
