import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { auth } from "@/server/auth/config";
import { pickNamespaces, namespacesForRole } from "@/lib/i18n-utils";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const allMessages = await getMessages();
  const session = await auth();
  const namespaces = namespacesForRole(session?.user?.role);
  const messages = pickNamespaces(
    allMessages as Record<string, unknown>,
    namespaces,
  );

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
