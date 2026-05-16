import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { setRequestLocale } from "next-intl/server";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordForm />;
}
