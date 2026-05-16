import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAllUsers } from "@/server/services/user";
import { createModeratorAction, updateAccountStatusAction } from "@/server/actions/user";
import { StatusBadge } from "@/components/shared/status-badge";

const createModerator = createModeratorAction as unknown as (formData: FormData) => void;
const updateStatus = updateAccountStatusAction as unknown as (formData: FormData) => void;
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

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("admin.users");
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

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
                  {user.accountStatus === "ACTIVE" && (
                    <form action={updateStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="status" value="DEACTIVATED" />
                      <Button size="sm" variant="outline">
                        {t("deactivate")}
                      </Button>
                    </form>
                  )}
                  {user.accountStatus === "DEACTIVATED" && (
                    <form action={updateStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <Button size="sm" variant="outline">
                        {t("reactivate")}
                      </Button>
                    </form>
                  )}
                  {user.accountStatus !== "BANNED" && (
                    <form action={updateStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="status" value="BANNED" />
                      <Button size="sm" variant="destructive">
                        {t("ban")}
                      </Button>
                    </form>
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
