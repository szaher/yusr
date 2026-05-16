import { db } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";

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

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  const fields = [
    { label: locale === "ar" ? "الاسم" : "Name", value: user?.name },
    { label: locale === "ar" ? "البريد" : "Email", value: user?.email },
    { label: locale === "ar" ? "الهاتف" : "Phone", value: profile?.phone },
    { label: locale === "ar" ? "البلد" : "Country", value: profile?.country },
    {
      label: locale === "ar" ? "مستوى الحفظ" : "Quran Level",
      value: profile?.currentQuranLevel,
    },
    {
      label: locale === "ar" ? "مستوى التجويد" : "Tajweed Level",
      value: profile?.currentTajweedLevel,
    },
    {
      label: locale === "ar" ? "اليوم المفضل" : "Preferred Day",
      value: profile?.preferredDay,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 text-sm">{field.value ?? "-"}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
