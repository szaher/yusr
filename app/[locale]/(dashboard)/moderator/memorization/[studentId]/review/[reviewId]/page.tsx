import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getReviewDetail } from "@/server/services/memorization-review";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
};

const MISTAKE_LABELS: Record<string, string> = {
  TAJWEED_ERROR: "mistake.tajweedError",
  WRONG_WORD: "mistake.wrongWord",
  HESITATION: "mistake.hesitation",
  SKIPPED_AYAH: "mistake.skippedAyah",
  REPEATED_AYAH: "mistake.repeatedAyah",
  OTHER: "mistake.other",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string; reviewId: string }>;
}) {
  const { locale, reviewId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization");
  const review = await getReviewDetail(reviewId);
  if (!review) notFound();

  const fromName = locale === "ar" ? review.fromSurah.nameAr : review.fromSurah.nameEn;
  const toName = locale === "ar" ? review.toSurah.nameAr : review.toSurah.nameEn;
  const nextFromName = locale === "ar" ? review.nextFromSurah.nameAr : review.nextFromSurah.nameEn;
  const nextToName = locale === "ar" ? review.nextToSurah.nameAr : review.nextToSurah.nameEn;
  const moderatorName = locale === "ar"
    ? review.moderator.nameAr || review.moderator.name
    : review.moderator.name;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("review.reviewDetail")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("review.rangeReviewed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("review.range")}</Label>
              <p className="text-sm font-semibold">
                {fromName} {review.fromAyah} → {toName} {review.toAyah}
              </p>
            </div>
            <div>
              <Label>{t("review.date")}</Label>
              <p className="text-sm">{new Date(review.reviewDate).toLocaleDateString(locale)}</p>
            </div>
            <div>
              <Label>{locale === "ar" ? "المشرف" : "Moderator"}</Label>
              <p className="text-sm">{moderatorName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("review.result")}</Label>
              <div className="mt-1">
                <Badge className={RESULT_COLORS[review.recitationResult] || ""}>
                  {t(`review.result${review.recitationResult.charAt(0) + review.recitationResult.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}`)}
                </Badge>
              </div>
            </div>
            <div>
              <Label>{t("review.grade")}</Label>
              <p className="text-2xl font-bold">{review.grade}/100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {review.tajweedScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tajweed.scores")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.tajweedScores.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">
                    {locale === "ar" ? ts.category.nameAr : ts.category.nameEn}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ts.score}/10</span>
                    {ts.notes && (
                      <span className="text-xs text-muted-foreground">({ts.notes})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {review.mistakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mistake.title")} ({review.mistakes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.mistakes.map((m) => (
                <div key={m.id} className="flex items-start gap-2 border-b pb-2">
                  <Badge variant="outline" className="shrink-0">
                    {t(MISTAKE_LABELS[m.category] || "mistake.other")}
                  </Badge>
                  <span className="text-sm">{m.notes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {review.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle>{t("review.nextHomework")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold">
            {nextFromName} {review.nextFromAyah} → {nextToName} {review.nextToAyah}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
