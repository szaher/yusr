import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllFeatureFlags } from "@/server/services/feature-flag";
import { toggleFeatureFlagAction } from "@/server/actions/admin";

const toggleFlag = toggleFeatureFlagAction as unknown as (formData: FormData) => void;

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminFeatureFlagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.featureFlags");
  const tCommon = await getTranslations("common");
  const flags = await getAllFeatureFlags();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>{tCommon("status")}</TableHead>
            <TableHead>{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.key}>
              <TableCell className="font-mono text-sm">{flag.key}</TableCell>
              <TableCell>{flag.description ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    flag.enabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300"
                  }
                >
                  {flag.enabled ? t("enabled") : t("disabled")}
                </Badge>
              </TableCell>
              <TableCell>
                <form action={toggleFlag}>
                  <input type="hidden" name="key" value={flag.key} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={String(!flag.enabled)}
                  />
                  <Button size="sm" variant="outline" type="submit">
                    {flag.enabled ? t("disabled") : t("enabled")}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
