import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAllTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { assignTicketAction } from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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

const assignTicket = assignTicketAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function AdminTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

  const showAll = filter === "all";
  const [tickets, supportUsers] = await Promise.all([
    getAllTickets(showAll ? "all" : "active"),
    db.user.findMany({
      where: { accountStatus: "ACTIVE", role: { name: "support" } },
      select: { id: true, name: true, nameAr: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/admin/tickets` : `/${locale}/admin/tickets?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("assignedTo")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("escalated")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("assign")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const studentName = ticket.student.user.nameAr || ticket.student.user.name;
              const assigneeName = ticket.assignedTo
                ? (ticket.assignedTo.nameAr || ticket.assignedTo.name)
                : t("unassigned");
              const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/admin/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{studentName}</TableCell>
                  <TableCell>{assigneeName}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[ticket.status] || ""}>
                      {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.escalated && (
                      <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <form action={assignTicket} className="flex gap-1">
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <select
                        name="assignedToId"
                        required
                        defaultValue={ticket.assignedTo ? undefined : ""}
                        className="flex h-8 w-32 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="" disabled>{t("selectStaff")}</option>
                        {supportUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nameAr || u.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        {t("assign")}
                      </Button>
                    </form>
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
