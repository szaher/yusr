"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function RegisterForm() {
  const t = useTranslations();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(registerAction, null);

  if (state?.success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <h2 className="text-xl font-semibold">
            {t("registration.pendingReview")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("registration.pendingReviewDesc")}
          </p>
          <Link
            href={`/${locale}/login`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            {t("auth.login")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          {t("auth.registerTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("registration.fullName")}</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" name="email" type="email" required dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" name="password" type="password" required dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("registration.phone")}</Label>
            <Input id="phone" name="phone" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t("registration.country")}</Label>
            <Input id="country" name="country" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentQuranLevel">
              {t("registration.currentQuranLevel")}
            </Label>
            <Input id="currentQuranLevel" name="currentQuranLevel" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="consent"
              name="consent"
              required
              className="h-4 w-4"
            />
            <Label htmlFor="consent" className="text-sm">
              {t("registration.consentLabel")}
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {t("auth.register")}
          </Button>
          <p className="text-center text-sm">
            <Link
              href={`/${locale}/login`}
              className="text-primary hover:underline"
            >
              {t("auth.hasAccount")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
