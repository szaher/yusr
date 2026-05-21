"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  FileText,
  ClipboardList,
  Layers,
  UsersRound,
  ToggleLeft,
  ScrollText,
  Calendar,
  Award,
} from "lucide-react";

type NavItem = {
  labelKey: string;
  href: string;
  icon: React.ElementType;
};

const adminNav: NavItem[] = [
  { labelKey: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { labelKey: "enrollment", href: "/admin/enrollment", icon: ClipboardList },
  { labelKey: "users", href: "/admin/users", icon: Users },
  { labelKey: "levels", href: "/admin/levels", icon: Layers },
  { labelKey: "classes", href: "/admin/classes", icon: BookOpen },
  { labelKey: "groups", href: "/admin/groups", icon: UsersRound },
  { labelKey: "featureFlags", href: "/admin/feature-flags", icon: ToggleLeft },
  { labelKey: "settings", href: "/admin/settings", icon: Settings },
  { labelKey: "auditLogs", href: "/admin/audit-logs", icon: ScrollText },
  { labelKey: "assignments", href: "/admin/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/admin/sessions", icon: Calendar },
];

const moderatorNav: NavItem[] = [
  { labelKey: "dashboard", href: "/moderator/dashboard", icon: LayoutDashboard },
  { labelKey: "groups", href: "/moderator/groups", icon: UsersRound },
  { labelKey: "students", href: "/moderator/students", icon: GraduationCap },
  { labelKey: "assignments", href: "/moderator/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/moderator/sessions", icon: Calendar },
];

const studentNav: NavItem[] = [
  { labelKey: "dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { labelKey: "profile", href: "/student/profile", icon: Users },
  { labelKey: "assignments", href: "/student/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/student/sessions", icon: Calendar },
  { labelKey: "grades", href: "/student/grades", icon: Award },
];

const supportNav: NavItem[] = [
  { labelKey: "dashboard", href: "/support/dashboard", icon: LayoutDashboard },
  { labelKey: "tickets", href: "/support/tickets", icon: FileText },
];

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  moderator: moderatorNav,
  student: studentNav,
  support: supportNav,
};

export function Sidebar({ role }: { role: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const items = navByRole[role] ?? studentNav;

  return (
    <aside className="flex h-full w-64 flex-col border-e bg-card">
      <div className="flex h-16 items-center justify-center border-b px-4">
        <Link
          href={`/${locale}`}
          className="text-lg font-bold text-primary"
        >
          {locale === "ar" ? "أكاديمية يُسر" : "Yusr Academy"}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
