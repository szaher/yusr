import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminSessions } from "@/server/services/session";
import { Card, CardContent } from "@/components/ui/card";
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
import { SearchInput } from "@/components/shared/search-input";

const STATUS_KEYS: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

const STATUS_VALUES = ["SCHEDULED", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default async function AdminSessionsPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { search, status } = await searchParamsPromise;
  setRequestLocale(locale);

  await requireApprovedUser();
  const t = await getTranslations("sessions");
  const tCommon = await getTranslations("common");

  const { items: sessions } = await getAdminSessions(1, 50, search, status);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <SearchInput placeholder={t("searchPlaceholder")} />
        <div className="flex gap-1">
          {[
            { label: tCommon("all"), value: undefined },
            ...STATUS_VALUES.map((s) => ({
              label: t(STATUS_KEYS[s] as any),
              value: s,
            })),
          ].map((f) => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (f.value) params.set("status", f.value);
            const href = `?${params.toString()}`;
            const active = status === f.value || (!status && !f.value);
            return (
              <a
                key={f.value ?? "all"}
                href={href}
                className={`px-3 py-1 rounded-full text-sm ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {f.label}
              </a>
            );
          })}
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noSessions")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("startTime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("students")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const moderatorName =
                    locale === "ar"
                      ? session.moderator.user.nameAr || session.moderator.user.name
                      : session.moderator.user.name;

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {moderatorName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(session.date).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>{session.startTime || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[session.status]}>
                          {t(STATUS_KEYS[session.status] as any)}
                        </Badge>
                      </TableCell>
                      <TableCell>{session._count.students}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
