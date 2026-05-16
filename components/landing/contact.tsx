"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ExternalLink } from "lucide-react";

export function Contact() {
  const t = useTranslations("landing.contact");

  return (
    <section className="py-20">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold">{t("title")}</h2>
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <span>{t("email")}: </span>
              <a
                href="mailto:quranonlinezoom@gmail.com"
                className="text-primary hover:underline"
                dir="ltr"
              >
                quranonlinezoom@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-primary" />
              <span>{t("facebook")}: </span>
              <a
                href="https://www.facebook.com/YusrQuran/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                dir="ltr"
              >
                facebook.com/YusrQuran
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
