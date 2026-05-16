import { setRequestLocale } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";

export default async function SupportDashboardPage({
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
        {locale === "ar" ? "لوحة تحكم الدعم" : "Support Dashboard"}
      </h1>
      <p className="mt-4 text-muted-foreground">
        {locale === "ar" ? "قريباً" : "Coming soon"}
      </p>
    </div>
  );
}
