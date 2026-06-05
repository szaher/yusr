import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";

export default async function SupportDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("supportTickets");
  const announcements = await getActiveAnnouncementsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("dashboardTitle")}
      </h1>

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

      <p className="text-muted-foreground">
        {t("comingSoon")}
      </p>
    </div>
  );
}
