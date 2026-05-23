import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { AppShell } from "@/components/layout/app-shell";
import { setRequestLocale } from "next-intl/server";
import { getEnabledFeatureFlags } from "@/server/services/feature-flag";

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

  return <AppShell role={session.user.role} enabledFlags={[...enabledFlags]}>{children}</AppShell>;
}
