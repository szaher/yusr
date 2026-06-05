import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllLevels } from "@/server/services/organization";
import { createLevelAction, updateLevelAction, deleteLevelAction } from "@/server/actions/organization";
import { EditLevelDialog } from "./edit-level-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash2 } from "lucide-react";

const createLevel = createLevelAction as unknown as (formData: FormData) => void;
const updateLevel = updateLevelAction as unknown as (formData: FormData) => void;
const deleteLevel = deleteLevelAction as unknown as (formData: FormData) => void;

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

export default async function AdminLevelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.organization");
  const levels = await getAllLevels();

  const editTranslations = {
    edit: t("edit"),
    editLevel: t("editLevel"),
    nameAr: `${t("levelName")} (AR)`,
    nameEn: `${t("levelName")} (EN)`,
    sortOrder: "Sort Order",
    save: t("save"),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("createLevel")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createLevel")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLevel} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nameAr">{t("levelName")} (AR)</Label>
              <Input id="nameAr" name="nameAr" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t("levelName")} (EN)</Label>
              <Input id="nameEn" name="nameEn" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">{t("createLevel")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("levelName")} (AR)</TableHead>
            <TableHead>{t("levelName")} (EN)</TableHead>
            <TableHead>Classes</TableHead>
            <TableHead className="text-end">{t("edit")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => (
            <TableRow key={level.id}>
              <TableCell>{level.nameAr}</TableCell>
              <TableCell>{level.nameEn}</TableCell>
              <TableCell>{level._count.classes}</TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-2">
                  <EditLevelDialog
                    level={{
                      id: level.id,
                      nameAr: level.nameAr,
                      nameEn: level.nameEn,
                      sortOrder: level.sortOrder,
                    }}
                    action={updateLevel}
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
                    formAction={deleteLevel}
                    hiddenFields={{ id: level.id }}
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
