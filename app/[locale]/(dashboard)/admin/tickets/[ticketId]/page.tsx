import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  assignTicketAction,
  changeTicketStatusAction,
} from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const assignTicketFn = assignTicketAction as unknown as (formData: FormData) => void;
const changeStatus = changeTicketStatusAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  let ticket;
  try {
    ticket = await getTicketWithReplies(ticketId);
  } catch {
    notFound();
  }

  const t = await getTranslations("supportTickets");
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  const supportUsers = await db.user.findMany({
    where: { accountStatus: "ACTIVE", role: { name: "support" } },
    select: { id: true, name: true, nameAr: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/tickets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <Badge className={STATUS_COLORS[ticket.status] || ""}>
          {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
        </Badge>
        {ticket.escalated && (
          <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t("studentName")}: {ticket.student.user.nameAr || ticket.student.user.name}</p>
        <p>{t("assignedTo")}: {ticket.assignedTo ? (ticket.assignedTo.nameAr || ticket.assignedTo.name) : t("unassigned")}</p>
        <p>{t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <form action={assignTicketFn} className="flex gap-1">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <select
            name="assignedToId"
            required
            defaultValue=""
            className="flex h-9 w-40 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="" disabled>{t("selectStaff")}</option>
            {supportUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr || u.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">{t("assign")}</Button>
        </form>

        {ticket.status !== "CLOSED" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="CLOSED" />
            <Button type="submit" size="sm" variant="destructive">{t("close")}</Button>
          </form>
        )}

        {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="OPEN" />
            <Button type="submit" size="sm" variant="outline">{t("reopen")}</Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("threadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {ticket.student.user.nameAr || ticket.student.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString(locale)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          </div>

          {ticket.replies.map((reply) => (
            <div key={reply.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {reply.author.nameAr || reply.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(reply.createdAt).toLocaleString(locale)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
