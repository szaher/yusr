import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { updateEnrollmentStateAction } from "@/server/actions/enrollment";

const updateEnrollmentState = updateEnrollmentStateAction as unknown as (formData: FormData) => void;

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.settings");
  const enrollmentSetting = await db.systemSetting.findUnique({
    where: { key: "enrollment_state" },
  });
  const currentState = enrollmentSetting?.value ?? "closed";

  const states = [
    { value: "open", label: t("open") },
    { value: "closed", label: t("closed") },
    { value: "paused", label: t("paused") },
    { value: "waitlist_only", label: t("waitlistOnly") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("enrollmentState")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {states.map((state) => (
              <form key={state.value} action={updateEnrollmentState}>
                <input type="hidden" name="state" value={state.value} />
                <Button
                  type="submit"
                  variant={currentState === state.value ? "default" : "outline"}
                  disabled={currentState === state.value}
                >
                  {state.label}
                </Button>
              </form>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("enrollmentState")}: <strong>{currentState}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
