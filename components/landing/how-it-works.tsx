"use client";

import { useTranslations } from "next-intl";

const steps = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
  const t = useTranslations("landing.howItWorks");

  return (
    <section className="bg-muted/50 py-20">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {t(`${step}Title`)}
              </h3>
              <p className="text-muted-foreground">{t(`${step}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
