import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAuditLogs } from "@/server/services/audit-log";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAuditLogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.auditLogs");
  const { logs } = await getAuditLogs();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("actor")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead>{t("entity")}</TableHead>
            <TableHead>{t("date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.actor?.name ?? log.actorId}</TableCell>
              <TableCell className="font-mono text-sm">{log.action}</TableCell>
              <TableCell>
                {log.entityType}:{log.entityId}
              </TableCell>
              <TableCell>
                {new Date(log.createdAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
