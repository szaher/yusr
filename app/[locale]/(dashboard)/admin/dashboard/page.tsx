import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("admin.dashboard");

  const [pendingCount, activeStudents, activeModerators, enrollmentSetting, announcements] =
    await Promise.all([
      db.enrollmentApplication.count({
        where: { registrationStatus: "PENDING_REVIEW" },
      }),
      db.user.count({
        where: {
          role: { name: "student" },
          accountStatus: "ACTIVE",
        },
      }),
      db.user.count({
        where: {
          role: { name: "moderator" },
          accountStatus: "ACTIVE",
        },
      }),
      db.systemSetting.findUnique({ where: { key: "enrollment_state" } }),
      getActiveAnnouncementsForUser(session.user.id),
    ]);

  const cards = [
    {
      title: t("pendingRegistrations"),
      value: pendingCount,
    },
    {
      title: t("activeStudents"),
      value: activeStudents,
    },
    {
      title: t("activeModerators"),
      value: activeModerators,
    },
    {
      title: t("enrollmentStatus"),
      value: enrollmentSetting?.value ?? "closed",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-50"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
