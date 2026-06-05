import { db } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { StudentProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("student.profile");

  const [profile, user] = await Promise.all([
    db.studentProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("name")}: {user?.name ?? "—"} &nbsp;|&nbsp; {t("email")}: {user?.email ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentProfileForm
            profile={{
              phone: profile?.phone ?? "",
              country: profile?.country ?? "",
              currentQuranLevel: profile?.currentQuranLevel ?? "",
              currentTajweedLevel: profile?.currentTajweedLevel ?? "",
              preferredDay: profile?.preferredDay ?? "",
            }}
            labels={{
              phone: t("phone"),
              country: t("country"),
              quranLevel: t("quranLevel"),
              tajweedLevel: t("tajweedLevel"),
              preferredDay: t("preferredDay"),
              save: t("editProfile"),
              saved: t("saved"),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm
            translations={{
              currentPassword: t("currentPassword"),
              newPassword: t("newPassword"),
              confirmNewPassword: t("confirmNewPassword"),
              passwordChanged: t("passwordChanged"),
              currentPasswordIncorrect: t("currentPasswordIncorrect"),
              validationError: t("validationError"),
              submit: t("changePassword"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
