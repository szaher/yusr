import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createTicketAction } from "@/server/actions/support-ticket";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createTicket = createTicketAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function StudentTicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tickets = await getStudentTickets(studentProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createTicket")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("subject")}</Label>
              <Input name="subject" required placeholder={t("subjectPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("body")}</Label>
              <textarea
                name="body"
                required
                placeholder={t("bodyPlaceholder")}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Button type="submit">{t("submit")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tickets.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("updatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/${locale}/student/tickets/${ticket.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[ticket.status] || ""}>
                    {t(ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase() as "open" | "resolved" | "closed")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(ticket.createdAt).toLocaleDateString(locale)}
                </TableCell>
                <TableCell>
                  {new Date(ticket.updatedAt).toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
