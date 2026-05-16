import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms/register-form";
import { getEnrollmentState } from "@/server/services/enrollment";
import { setRequestLocale } from "next-intl/server";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getEnrollmentState();
  if (state === "closed" || state === "paused") {
    redirect(`/${locale}/enrollment-closed`);
  }

  return <RegisterForm />;
}
