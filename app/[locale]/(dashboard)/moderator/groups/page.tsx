import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorGroups } from "@/server/services/organization";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ModeratorGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("moderator.groups");

  const groups = await getModeratorGroups(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroups")}</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("className")}</TableHead>
              <TableHead>{t("levelName")}</TableHead>
              <TableHead>{t("weeklyDay")}</TableHead>
              <TableHead>{t("weeklyTime")}</TableHead>
              <TableHead>{t("studentCount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.class.name}</TableCell>
                <TableCell>{group.class.level.nameAr}</TableCell>
                <TableCell>{group.weeklyDay ?? "—"}</TableCell>
                <TableCell>{group.weeklyTime ?? "—"}</TableCell>
                <TableCell>{group._count.students}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
