import { db } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

async function resetPasswordAction(formData: FormData) {
  "use server";

  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) return;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return;
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: hashedPassword,
        tokenVersion: { increment: 1 },
      },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
  });

  redirect("/ar/login");
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p>{locale === "ar" ? "رابط غير صالح أو منتهي الصلاحية" : "Invalid or expired link"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t("resetPasswordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <Input id="password" name="password" type="password" required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required dir="ltr" />
            </div>
            <Button type="submit" className="w-full">
              {t("resetPassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
