"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero({ enrollmentOpen }: { enrollmentOpen: boolean }) {
  const t = useTranslations("landing.hero");
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden bg-primary/5 py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {t("title")}
        </h1>
        <blockquote className="mt-8 text-xl italic text-muted-foreground sm:text-2xl">
          &ldquo;{t("verse")}&rdquo;
        </blockquote>
        <p className="mt-2 text-sm text-muted-foreground">{t("verseRef")}</p>
        <div className="mt-10">
          {enrollmentOpen ? (
            <Link href={`/${locale}/register`}>
              <Button size="lg" className="text-lg">
                {t("cta")}
              </Button>
            </Link>
          ) : (
            <p className="text-lg font-medium text-muted-foreground">
              {t("ctaClosed")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
