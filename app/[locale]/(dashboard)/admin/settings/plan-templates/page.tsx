import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { listTemplates } from "@/server/services/memorization-plan-template";
import { deleteTemplateAction } from "@/server/actions/memorization";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PACE_LABELS: Record<string, { en: string; ar: string }> = {
  RUB: { en: "Rub' (1/4 Hizb)", ar: "ربع حزب" },
  HIZB: { en: "Hizb", ar: "حزب" },
  PAGE_COUNT: { en: "Pages", ar: "صفحات" },
};

export default async function PlanTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const enabled = await isFeatureEnabled("memorization_plan_templates");
  if (!enabled) notFound();

  const t = await getTranslations("memorization");
  const tc = await getTranslations("common");
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("plan.templates")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.templates")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("plan.templateName")}</TableHead>
                  <TableHead>{t("plan.paceUnit")}</TableHead>
                  <TableHead>{t("plan.paceValue")}</TableHead>
                  <TableHead>{t("plan.description")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">
                      {locale === "ar" ? tpl.nameAr : tpl.name}
                    </TableCell>
                    <TableCell>
                      {PACE_LABELS[tpl.paceUnit]?.[locale === "ar" ? "ar" : "en"] ?? tpl.paceUnit}
                    </TableCell>
                    <TableCell>{Number(tpl.paceValue)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tpl.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      {tpl.isDefault && (
                        <Badge variant="secondary">{t("plan.defaultTemplate")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!tpl.isDefault && (
                        <form action={deleteTemplateAction}>
                          <input type="hidden" name="id" value={tpl.id} />
                          <Button variant="ghost" size="sm" className="text-destructive">
                            {t("plan.deleteTemplate")}
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
