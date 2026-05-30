import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { AppShell } from "@/components/layout/app-shell";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getEnabledFeatureFlags } from "@/server/services/feature-flag";
import { getVapidPublicKey } from "@/server/services/push-notification";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const enabledFlags = await getEnabledFeatureFlags();
  const vapidPublicKey = getVapidPublicKey();
  const t = await getTranslations("pwa");

  return (
    <AppShell
      role={session.user.role}
      enabledFlags={[...enabledFlags]}
      vapidPublicKey={vapidPublicKey}
      pushTranslations={{
        enableNotifications: t("enableNotifications"),
        notificationPrompt: t("notificationPrompt"),
        dismiss: t("dismiss"),
      }}
    >
      {children}
    </AppShell>
  );
}
