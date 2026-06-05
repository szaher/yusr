import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { listAnnouncements } from "@/server/services/announcement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function priorityVariant(priority: string) {
  switch (priority) {
    case "urgent": return "destructive" as const;
    case "important": return "default" as const;
    default: return "secondary" as const;
  }
}

export default async function StudentAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("announcements");
  const { items: announcements } = await listAnnouncements();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t("noAnnouncements")}
          description={t("noAnnouncementsDesc")}
        />
      ) : (
        announcements.map((ann) => (
          <Card key={ann.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{ann.title}</CardTitle>
                <Badge variant={priorityVariant(ann.priority)}>
                  {t(`priority${ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("postedBy")} {ann.createdBy.name} · {t("postedOn")}{" "}
                {new Date(ann.publishDate).toLocaleDateString(locale)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ann.body}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
