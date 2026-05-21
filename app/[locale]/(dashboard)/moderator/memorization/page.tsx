import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlansForModerator } from "@/server/services/memorization-plan";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ModeratorMemorizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("memorization");
  const plans = await getPlansForModerator(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {plans.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "ar" ? "الطالب" : "Student"}</TableHead>
              <TableHead>{t("plan.surah")}</TableHead>
              <TableHead>{t("plan.ayah")}</TableHead>
              <TableHead>{t("plan.nextReview")}</TableHead>
              <TableHead>{t("review.reviewHistory")}</TableHead>
              <TableHead>{locale === "ar" ? "المجموعة" : "Group"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const studentName =
                locale === "ar"
                  ? plan.student.user.nameAr || plan.student.user.name
                  : plan.student.user.name;
              const surahName =
                locale === "ar"
                  ? plan.currentSurah.nameAr
                  : plan.currentSurah.nameEn;

              return (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/memorization/${plan.student.userId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {studentName}
                    </Link>
                  </TableCell>
                  <TableCell>{surahName}</TableCell>
                  <TableCell>{plan.currentAyahNumber}</TableCell>
                  <TableCell>
                    {plan.nextReviewDate
                      ? new Date(plan.nextReviewDate).toLocaleDateString(locale)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-gray-100 text-gray-800">
                      {plan._count.reviews}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.group?.name}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
