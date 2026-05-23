import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  addReplyAction,
  changeTicketStatusAction,
  escalateTicketAction,
} from "@/server/actions/support-ticket";
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

import { STATUS_COLORS } from "@/lib/constants/status-colors";

const addReply = addReplyAction as unknown as (formData: FormData) => void;
const changeStatus = changeTicketStatusAction as unknown as (formData: FormData) => void;
const escalate = escalateTicketAction as unknown as (formData: FormData) => void;

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  let ticket;
  try {
    ticket = await getTicketWithReplies(ticketId);
  } catch {
    notFound();
  }

  if (ticket.assignedToId !== session.user.id) notFound();

  const t = await getTranslations("supportTickets");
  const canReply = ticket.status !== "CLOSED";
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/support/tickets`}
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
          <Badge className={STATUS_COLORS["ESCALATED"]}>{t("escalated")}</Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {t("studentName")}: {ticket.student.user.nameAr || ticket.student.user.name}
        {" · "}
        {t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}
      </p>

      <div className="flex gap-2">
        {ticket.status === "OPEN" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="IN_PROGRESS" />
            <Button type="submit" size="sm">{t("start")}</Button>
          </form>
        )}
        {ticket.status === "IN_PROGRESS" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="RESOLVED" />
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
              {t("resolve")}
            </Button>
          </form>
        )}
        {!ticket.escalated && ticket.status !== "CLOSED" && (
          <form action={escalate}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Button type="submit" size="sm" variant="destructive">
              {t("escalate")}
            </Button>
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

          {ticket.replies.map((reply) => {
            const isMe = reply.author.id === session.user.id;
            return (
              <div
                key={reply.id}
                className={`rounded-lg border p-4 ${isMe ? "bg-muted/50" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {isMe ? t("you") : (reply.author.nameAr || reply.author.name)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reply.createdAt).toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canReply ? (
        <Card>
          <CardContent className="pt-6">
            <form action={addReply} className="space-y-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="body"
                required
                placeholder={t("replyPlaceholder")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit">{t("send")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}
    </div>
  );
}
