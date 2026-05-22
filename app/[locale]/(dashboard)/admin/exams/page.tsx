import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listTemplates } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createTemplateAction } from "@/server/actions/exam";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createTemplate = createTemplateAction as unknown as (formData: FormData) => void;

export default async function AdminExamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_CREATE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createExam")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTemplate} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("examTitle")}</Label>
              <Input name="title" required />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Input name="description" />
            </div>
            <div className="space-y-2">
              <Label>{t("passingScore")}</Label>
              <Input name="passingScore" type="number" defaultValue="70" min="1" max="100" required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {templates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("questionCount")}</TableHead>
              <TableHead>{t("totalPoints")}</TableHead>
              <TableHead>{t("passingScore")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tmpl) => (
              <TableRow key={tmpl.id}>
                <TableCell className="font-medium">{tmpl.title}</TableCell>
                <TableCell>{tmpl._count.questions}</TableCell>
                <TableCell>{tmpl.totalPoints}</TableCell>
                <TableCell>{tmpl.passingScore}%</TableCell>
                <TableCell>{new Date(tmpl.createdAt).toLocaleDateString(locale)}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/admin/exams/${tmpl.id}`}>
                    <Button variant="outline" size="sm">{t("viewDetails")}</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noExams")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
