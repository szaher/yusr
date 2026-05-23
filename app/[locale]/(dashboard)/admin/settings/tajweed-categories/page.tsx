import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { listTajweedCategories } from "@/server/services/tajweed-category";
import {
  createTajweedCategoryAction,
  updateTajweedCategoryAction,
  toggleTajweedCategoryAction,
} from "@/server/actions/memorization";
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
import { EmptyState } from "@/components/shared/empty-state";
import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const createCategory = createTajweedCategoryAction as unknown as (formData: FormData) => void;
const updateCategory = updateTajweedCategoryAction as unknown as (formData: FormData) => void;
const toggleCategory = toggleTajweedCategoryAction as unknown as (formData: FormData) => void;

export default async function TajweedCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization.tajweed");
  const categories = await listTajweedCategories(true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("addCategory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t("nameEn")}</Label>
              <Input id="nameEn" name="nameEn" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameAr">{t("nameAr")}</Label>
              <Input id="nameAr" name="nameAr" required dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
              <div className="flex gap-2">
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue={categories.length + 1}
                />
                <Button type="submit">{t("save")}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("nameEn")}</TableHead>
            <TableHead>{t("nameAr")}</TableHead>
            <TableHead>{t("sortOrder")}</TableHead>
            <TableHead>{t("category")}</TableHead>
            <TableHead>{t("score")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id} className={cat.active ? "" : "opacity-50"}>
              <TableCell>{cat.nameEn}</TableCell>
              <TableCell dir="rtl">{cat.nameAr}</TableCell>
              <TableCell>{cat.sortOrder}</TableCell>
              <TableCell>
                <Badge className={cat.isCore ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300"}>
                  {cat.isCore ? t("core") : t("custom")}
                </Badge>
              </TableCell>
              <TableCell>
                <form action={toggleCategory} className="inline">
                  <input type="hidden" name="id" value={cat.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {cat.active ? "✓" : "✗"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {categories.length === 0 && (
        <EmptyState
          icon={BookMarked}
          title={t("noCategories")}
          description={t("noCategoriesDesc")}
        />
      )}
    </div>
  );
}
