import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllClasses, getAllLevels } from "@/server/services/organization";
import { createClassAction, updateClassAction, deleteClassAction } from "@/server/actions/organization";
import { EditClassDialog } from "./edit-class-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash2 } from "lucide-react";

const createClass = createClassAction as unknown as (formData: FormData) => void;
const updateClass = updateClassAction as unknown as (formData: FormData) => void;
const deleteClass = deleteClassAction as unknown as (formData: FormData) => void;

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

export default async function AdminClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.organization");
  const [classes, levels] = await Promise.all([getAllClasses(), getAllLevels()]);

  const editTranslations = {
    edit: t("edit"),
    editClass: t("editClass"),
    className: t("className"),
    level: t("levelName"),
    capacity: "Capacity",
    save: t("save"),
  };

  const levelsForDialog = levels.map((l) => ({ id: l.id, nameAr: l.nameAr }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("createClass")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createClass")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createClass} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("className")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="levelId">Level</Label>
              <select
                id="levelId"
                name="levelId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">{t("createClass")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("className")}</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead className="text-end">{t("edit")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((cls) => (
            <TableRow key={cls.id}>
              <TableCell>{cls.name}</TableCell>
              <TableCell>{cls.level.nameAr}</TableCell>
              <TableCell>{cls._count.groups}</TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-2">
                  <EditClassDialog
                    cls={{
                      id: cls.id,
                      name: cls.name,
                      levelId: cls.levelId,
                      capacity: cls.capacity,
                    }}
                    levels={levelsForDialog}
                    action={updateClass}
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
                    formAction={deleteClass}
                    hiddenFields={{ id: cls.id }}
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
