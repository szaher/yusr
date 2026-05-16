"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);

  if (state?.success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-lg font-medium">{t("resetLinkSent")}</p>
          <Link
            href={`/${locale}/login`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            {t("login")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          {t("forgotPasswordTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required dir="ltr" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {t("resetPassword")}
          </Button>
          <p className="text-center text-sm">
            <Link
              href={`/${locale}/login`}
              className="text-primary hover:underline"
            >
              {t("login")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
