"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function Footer() {
  const t = useTranslations("landing.footer");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <footer className="border-t bg-card py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {tCommon("appNameShort")}.{" "}
          {t("rights")}.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/login`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("login")}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("register")}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
