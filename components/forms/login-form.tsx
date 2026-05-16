"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useLocale } from "next-intl";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return loginAction(formData);
    },
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          {t("loginTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{t(state.error)}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {t("login")}
          </Button>
          <div className="flex justify-between text-sm">
            <Link
              href={`/${locale}/register`}
              className="text-primary hover:underline"
            >
              {t("noAccount")}
            </Link>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-muted-foreground hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
