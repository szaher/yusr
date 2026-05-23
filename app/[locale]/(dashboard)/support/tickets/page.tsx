import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAssignedTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { STATUS_COLORS } from "@/lib/constants/status-colors";

export default async function SupportTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

  const showAll = filter === "all";
  const tickets = await getAssignedTickets(
    session.user.id,
    showAll ? "all" : "active"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/support/tickets` : `/${locale}/support/tickets?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={t("noTickets")}
          description={t("noTicketsDesc")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("escalated")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("updatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const studentName = ticket.student.user.nameAr || ticket.student.user.name;
              const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/support/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{studentName}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[ticket.status] || ""}>
                      {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.escalated && (
                      <Badge className={STATUS_COLORS["ESCALATED"]}>{t("escalated")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.updatedAt).toLocaleDateString(locale)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
