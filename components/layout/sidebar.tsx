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
  BookOpenCheck,
  Settings,
  FileText,
  ClipboardList,
  Layers,
  UsersRound,
  ToggleLeft,
  ScrollText,
  Calendar,
  Award,
  CalendarOff,
  Megaphone,
  Headset,
  ClipboardCheck,
  CalendarCheck,
  CalendarDays,
  BookOpenText,
  BookType,
  TrendingUp,
  FileStack,
} from "lucide-react";

type NavItem = {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  featureFlag?: string;
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
  { labelKey: "planTemplates", href: "/admin/settings/plan-templates", icon: FileStack, featureFlag: "memorization_plan_templates" },
  { labelKey: "auditLogs", href: "/admin/audit-logs", icon: ScrollText },
  { labelKey: "assignments", href: "/admin/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/admin/sessions", icon: Calendar },
  { labelKey: "announcements", href: "/admin/announcements", icon: Megaphone, featureFlag: "announcements" },
  { labelKey: "tickets", href: "/admin/tickets", icon: FileText, featureFlag: "support_tickets" },
  { labelKey: "exams", href: "/admin/exams", icon: ClipboardCheck, featureFlag: "exams" },
  { labelKey: "attendance", href: "/admin/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
  { labelKey: "progress", href: "/admin/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
  { labelKey: "quran", href: "/quran", icon: BookOpenText },
  { labelKey: "quranReader", href: "/quran/explorer", icon: BookType, featureFlag: "quran_explorer" },
];

const moderatorNav: NavItem[] = [
  { labelKey: "dashboard", href: "/moderator/dashboard", icon: LayoutDashboard },
  { labelKey: "groups", href: "/moderator/groups", icon: UsersRound },
  { labelKey: "students", href: "/moderator/students", icon: GraduationCap },
  { labelKey: "assignments", href: "/moderator/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/moderator/sessions", icon: Calendar },
  { labelKey: "calendar", href: "/moderator/calendar", icon: CalendarDays },
  { labelKey: "memorization", href: "/moderator/memorization", icon: BookOpenCheck },
  { labelKey: "leaveRequests", href: "/moderator/leave-requests", icon: CalendarOff, featureFlag: "leave_requests" },
  { labelKey: "exams", href: "/moderator/exams", icon: ClipboardCheck, featureFlag: "exams" },
  { labelKey: "attendance", href: "/moderator/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
  { labelKey: "progress", href: "/moderator/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
  { labelKey: "quran", href: "/quran", icon: BookOpenText },
  { labelKey: "quranReader", href: "/quran/explorer", icon: BookType, featureFlag: "quran_explorer" },
];

const studentNav: NavItem[] = [
  { labelKey: "dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { labelKey: "profile", href: "/student/profile", icon: Users },
  { labelKey: "assignments", href: "/student/assignments", icon: BookOpen },
  { labelKey: "sessions", href: "/student/sessions", icon: Calendar },
  { labelKey: "calendar", href: "/student/calendar", icon: CalendarDays },
  { labelKey: "grades", href: "/student/grades", icon: Award },
  { labelKey: "memorization", href: "/student/memorization", icon: BookOpenCheck },
  { labelKey: "leaveRequests", href: "/student/leave-requests", icon: CalendarOff, featureFlag: "leave_requests" },
  { labelKey: "support", href: "/student/tickets", icon: Headset, featureFlag: "support_tickets" },
  { labelKey: "exams", href: "/student/exams", icon: ClipboardCheck, featureFlag: "exams" },
  { labelKey: "attendance", href: "/student/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
  { labelKey: "progress", href: "/student/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
  { labelKey: "quran", href: "/quran", icon: BookOpenText },
  { labelKey: "quranReader", href: "/quran/explorer", icon: BookType, featureFlag: "quran_explorer" },
];

const supportNav: NavItem[] = [
  { labelKey: "dashboard", href: "/support/dashboard", icon: LayoutDashboard },
  { labelKey: "tickets", href: "/support/tickets", icon: FileText, featureFlag: "support_tickets" },
  { labelKey: "quran", href: "/quran", icon: BookOpenText },
  { labelKey: "quranReader", href: "/quran/explorer", icon: BookType, featureFlag: "quran_explorer" },
];

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  moderator: moderatorNav,
  student: studentNav,
  support: supportNav,
};

export function Sidebar({ role, enabledFlags = [], onNavClick }: { role: string; enabledFlags?: string[]; onNavClick?: () => void }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const flagSet = new Set(enabledFlags);
  const items = (navByRole[role] ?? studentNav).filter(
    (item) => !item.featureFlag || flagSet.has(item.featureFlag)
  );

  return (
    <aside className={`${role === "student" ? "hidden sm:flex" : "hidden md:flex"} h-full w-64 flex-col border-e bg-card`}>
      <div className="flex h-16 items-center justify-center border-b px-4">
        <Link
          href={`/${locale}`}
          className="text-lg font-bold text-primary"
        >
          {locale === "ar" ? "أكاديمية يُسر" : "Yusr Academy"}
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              onClick={onNavClick}
              aria-current={isActive ? "page" : undefined}
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
