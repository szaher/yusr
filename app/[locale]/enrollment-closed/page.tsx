import { Card, CardContent } from "@/components/ui/card";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function EnrollmentClosedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("registration");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-bold">{t("enrollmentClosed")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("enrollmentClosedDesc")}
          </p>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            {locale === "ar" ? "الرئيسية" : "Home"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
