import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getModeratorInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default async function ModeratorExamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const showAll = filter === "all";
  const instances = await getModeratorInstances(session.user.id, showAll ? "all" : "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a href={showAll ? `/${locale}/moderator/exams` : `/${locale}/moderator/exams?filter=all`}>
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissions")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const statusKey = inst.status === "IN_PROGRESS" ? "inProgress" : inst.status.toLowerCase();
              return (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.template.title}</TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[inst.status] || ""}>
                      {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{inst._count.submissions}</TableCell>
                  <TableCell>
                    <Link href={`/${locale}/moderator/exams/${inst.id}`}>
                      <Button variant="outline" size="sm">{t("viewDetails")}</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noInstances")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
