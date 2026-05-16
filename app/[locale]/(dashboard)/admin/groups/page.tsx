import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllGroups, getAllClasses } from "@/server/services/organization";
import { createGroupAction } from "@/server/actions/organization";

const createGroup = createGroupAction as unknown as (formData: FormData) => void;

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.organization");
  const [groups, classes] = await Promise.all([getAllGroups(), getAllClasses()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("createGroup")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createGroup")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGroup} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("groupName")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classId">Class</Label>
              <select
                id="classId"
                name="classId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} — {cls.level.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moderatorId">{t("assignModerator")}</Label>
              <Input id="moderatorId" name="moderatorId" placeholder="Moderator Profile ID" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">{t("createGroup")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("groupName")}</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>{t("assignModerator")}</TableHead>
            <TableHead>Students</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>{group.name}</TableCell>
              <TableCell>
                {group.class?.name ?? "—"} — {group.class?.level?.nameAr ?? ""}
              </TableCell>
              <TableCell>{group.moderator?.user?.name ?? "—"}</TableCell>
              <TableCell>{group._count.students}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
