import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllGroups, getAllClasses, getAllModerators } from "@/server/services/organization";
import { createGroupAction, updateGroupAction, deleteGroupAction } from "@/server/actions/organization";
import { EditGroupDialog } from "./edit-group-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash2 } from "lucide-react";

const createGroup = createGroupAction as unknown as (formData: FormData) => void;
const updateGroup = updateGroupAction as unknown as (formData: FormData) => void;
const deleteGroup = deleteGroupAction as unknown as (formData: FormData) => void;

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
  const [groups, classes, moderators] = await Promise.all([getAllGroups(), getAllClasses(), getAllModerators()]);

  const classesForDialog = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: { nameAr: c.level.nameAr },
  }));

  const moderatorsForDialog = moderators.map((m) => ({
    id: m.id,
    user: { name: m.user.name, email: m.user.email },
  }));

  const editTranslations = {
    edit: t("edit"),
    editGroup: t("editGroup"),
    groupName: t("groupName"),
    classLabel: t("className"),
    assignModerator: t("assignModerator"),
    noModerator: t("noModerator"),
    weeklyDay: "Weekly Day",
    weeklyTime: "Weekly Time",
    save: t("save"),
  };

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
              <select
                id="moderatorId"
                name="moderatorId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("noModerator")}</option>
                {moderators.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.user.name} ({mod.user.email})
                  </option>
                ))}
              </select>
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
            <TableHead className="text-end">{t("edit")}</TableHead>
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
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-2">
                  <EditGroupDialog
                    group={{
                      id: group.id,
                      name: group.name,
                      classId: group.classId,
                      moderatorId: group.moderatorId,
                      weeklyDay: group.weeklyDay,
                      weeklyTime: group.weeklyTime,
                    }}
                    classes={classesForDialog}
                    moderators={moderatorsForDialog}
                    action={updateGroup}
                    translations={editTranslations}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-3 w-3 me-1" />
                        {t("delete")}
                      </Button>
                    }
                    title={t("delete")}
                    description={t("deleteConfirm")}
                    confirmLabel={t("delete")}
                    cancelLabel={t("save")}
                    variant="destructive"
                    formAction={deleteGroup}
                    hiddenFields={{ id: group.id }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
