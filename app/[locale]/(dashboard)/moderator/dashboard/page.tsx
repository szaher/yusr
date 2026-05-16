import { setRequestLocale } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";

export default async function ModeratorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {locale === "ar" ? "لوحة تحكم المشرف" : "Moderator Dashboard"}
      </h1>
      <p className="mt-4 text-muted-foreground">
        {locale === "ar" ? "قريباً - المرحلة 3" : "Coming soon - Phase 3"}
      </p>
    </div>
  );
}
