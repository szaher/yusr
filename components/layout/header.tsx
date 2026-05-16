import { auth } from "@/server/auth/config";
import { LocaleSwitcher } from "./locale-switcher";
import { logoutAction } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function Header() {
  const session = await auth();
  const t = await getTranslations("auth");

  if (!session?.user) return null;

  const roleLabels: Record<string, string> = {
    admin: "مدير",
    moderator: "مشرف",
    student: "طالب",
    support: "دعم",
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{session.user.name}</span>
        <Badge variant="secondary">
          {roleLabels[session.user.role] ?? session.user.role}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            {t("logout")}
          </Button>
        </form>
      </div>
    </header>
  );
}
