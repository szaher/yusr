import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listAnnouncements } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/server/actions/announcement";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone } from "lucide-react";
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
import { PRIORITY_COLORS, BOOLEAN_COLORS } from "@/lib/constants/status-colors";

const createAnnouncement = createAnnouncementAction as unknown as (formData: FormData) => void;
const deleteAnnouncementFn = deleteAnnouncementAction as unknown as (formData: FormData) => void;

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);

  const enabled = await isFeatureEnabled("announcements");
  if (!enabled) notFound();

  const t = await getTranslations("announcements");

  const [announcements, roles, groups] = await Promise.all([
    listAnnouncements().then((r) => r.items),
    db.role.findMany({ select: { name: true, nameAr: true }, orderBy: { name: "asc" } }),
    db.group.findMany({ select: { id: true, name: true }, where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncement} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("announcementTitle")}</Label>
                <Input name="title" required />
              </div>
              <div className="space-y-2">
                <Label>{t("priority")}</Label>
                <select
                  name="priority"
                  defaultValue="normal"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="normal">{t("priorityNormal")}</option>
                  <option value="high">{t("priorityHigh")}</option>
                  <option value="urgent">{t("priorityUrgent")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("body")}</Label>
              <textarea
                name="body"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("targetType")}</Label>
                <select
                  name="targetType"
                  defaultValue="ALL"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ALL">{t("targetAll")}</option>
                  <option value="ROLE">{t("targetRole")}</option>
                  <option value="GROUP">{t("targetGroup")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("targetId")}</Label>
                <select
                  name="targetId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("targetAll")}</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.nameAr} ({r.name})
                    </option>
                  ))}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("expiryDate")}</Label>
                <Input name="expiryDate" type="date" />
              </div>
            </div>

            <div>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {announcements.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("announcementTitle")}</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("targetType")}</TableHead>
              <TableHead>{t("publishDate")}</TableHead>
              <TableHead>{t("expiryDate")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((ann) => {
              const isExpired = ann.expiryDate && new Date(ann.expiryDate) < now;
              return (
                <TableRow key={ann.id}>
                  <TableCell className="font-medium">{ann.title}</TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[ann.priority] || ""}>
                      {t(`priority${ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}` as "priorityNormal" | "priorityHigh" | "priorityUrgent")}
                    </Badge>
                  </TableCell>
                  <TableCell>{ann.targetType || "ALL"}</TableCell>
                  <TableCell>
                    {new Date(ann.publishDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    {ann.expiryDate
                      ? new Date(ann.expiryDate).toLocaleDateString(locale)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={isExpired ? BOOLEAN_COLORS.false : BOOLEAN_COLORS.true}>
                      {isExpired ? t("expired") : t("active")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form action={deleteAnnouncementFn}>
                      <input type="hidden" name="announcementId" value={ann.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        {t("delete")}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={Megaphone}
          title={t("noAnnouncements")}
          description={t("noAnnouncementsDesc")}
        />
      )}
    </div>
  );
}
