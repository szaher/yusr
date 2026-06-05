import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllUsers } from "@/server/services/user";
import { createModeratorAction, updateAccountStatusAction, promoteToModeratorAction } from "@/server/actions/user";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const createModerator = createModeratorAction as unknown as (formData: FormData) => void;
const updateStatus = updateAccountStatusAction as unknown as (formData: FormData) => void;
const promoteModerator = promoteToModeratorAction as unknown as (formData: FormData) => void;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

export default async function AdminUsersPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; role?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { search, role, status } = await searchParamsPromise;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.users");
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  const { items: users } = await getAllUsers(1, 50, search, role, status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a href="/api/export/users" download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 me-2" />
            {t("exportUsers")}
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("createModerator")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createModerator} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="name">{tAuth("name")}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameAr">{tAuth("name")} (AR)</Label>
              <Input id="nameAr" name="nameAr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{tAuth("email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{tAuth("password")}</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">{t("createModerator")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 flex-wrap">
        <SearchInput placeholder={t("searchPlaceholder")} />
        <div className="flex gap-1">
          {[
            { label: tCommon("all"), value: undefined },
            { label: t("roleAdmin"), value: "admin" },
            { label: tCommon("moderator"), value: "moderator" },
            { label: tCommon("student"), value: "student" },
          ].map((f) => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (f.value) params.set("role", f.value);
            if (status) params.set("status", status);
            const href = `?${params.toString()}`;
            const active = role === f.value || (!role && !f.value);
            return (
              <a
                key={f.label}
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAuth("name")}</TableHead>
            <TableHead>{tAuth("email")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{tCommon("status")}</TableHead>
            <TableHead>{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role?.name ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge status={user.accountStatus ?? "—"} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {user.role?.name !== "moderator" && user.role?.name !== "admin" && (
                    <form action={promoteModerator}>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button size="sm" variant="outline" type="submit">
                        {t("promoteToModerator")}
                      </Button>
                    </form>
                  )}
                  {user.accountStatus === "ACTIVE" && (
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="outline">{t("deactivate")}</Button>}
                      title={tCommon("confirmAction")}
                      description={tCommon("confirmDeactivateDesc")}
                      confirmLabel={t("deactivate")}
                      cancelLabel={tCommon("cancel")}
                      variant="default"
                      formAction={updateStatus}
                      hiddenFields={{ userId: user.id, status: "DEACTIVATED" }}
                    />
                  )}
                  {user.accountStatus === "DEACTIVATED" && (
                    <form action={updateStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <Button size="sm" variant="outline" type="submit">
                        {t("reactivate")}
                      </Button>
                    </form>
                  )}
                  {user.accountStatus !== "BANNED" && (
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="destructive">{t("ban")}</Button>}
                      title={tCommon("confirmAction")}
                      description={tCommon("confirmBanDesc")}
                      confirmLabel={t("ban")}
                      cancelLabel={tCommon("cancel")}
                      variant="destructive"
                      formAction={updateStatus}
                      hiddenFields={{ userId: user.id, status: "BANNED" }}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
