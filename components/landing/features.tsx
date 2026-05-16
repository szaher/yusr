"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  BarChart3,
  Brain,
  GraduationCap,
  Heart,
} from "lucide-react";

const featureKeys = [
  { key: "weeklySessions", icon: BookOpen },
  { key: "qualifiedModerators", icon: Users },
  { key: "progressTracking", icon: BarChart3 },
  { key: "aiAssisted", icon: Brain },
  { key: "curriculum", icon: GraduationCap },
  { key: "free", icon: Heart },
] as const;

export function Features() {
  const t = useTranslations("landing.features");

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map(({ key, icon: Icon }) => (
            <Card key={key}>
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{t(key)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t(`${key}Desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
