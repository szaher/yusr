import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { addReplyAction } from "@/server/actions/support-ticket";
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
import { STATUS_COLORS } from "@/lib/constants/status-colors";

const addReply = addReplyAction as unknown as (formData: FormData) => void;

export default async function StudentTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) notFound();

  const ticket = await getTicketWithReplies(ticketId);
  if (!ticket) notFound();

  if (ticket.studentId !== studentProfile.id) notFound();

  const t = await getTranslations("supportTickets");
  const canReply = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/student/tickets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <Badge className={STATUS_COLORS[ticket.status] || ""}>
          {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}
      </p>

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
