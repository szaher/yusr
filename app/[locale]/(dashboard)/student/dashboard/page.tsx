import { db } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getStudentEligibility } from "@/server/services/assignment";

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {!groupAssignment ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroupAssigned")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("myLevel")}
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
                {t("myClass")}
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
                {t("myGroup")}
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
                {t("myModerator")}
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
                {locale === "ar" ? "الواجبات المكتملة" : "Assignments Completed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-semibold ${eligibility.eligible ? "text-green-600" : "text-yellow-600"}`}>
                {eligibility.completed}/{eligibility.total}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
