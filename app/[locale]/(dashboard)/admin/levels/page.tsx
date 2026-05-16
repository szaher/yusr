import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllLevels } from "@/server/services/organization";
import { createLevelAction } from "@/server/actions/organization";

const createLevel = createLevelAction as unknown as (formData: FormData) => void;

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => (
            <TableRow key={level.id}>
              <TableCell>{level.nameAr}</TableCell>
              <TableCell>{level.nameEn}</TableCell>
              <TableCell>{level._count.classes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
