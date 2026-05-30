"use client";

import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Home, BookOpen, Calendar, ClipboardList, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const MAIN_TABS = [
  { key: "dashboard", href: "/student/dashboard", icon: Home, labelKey: "dashboard" },
  { key: "memorization", href: "/student/memorization", icon: BookOpen, labelKey: "memorization" },
  { key: "sessions", href: "/student/sessions", icon: Calendar, labelKey: "sessions" },
  { key: "assignments", href: "/student/assignments", icon: ClipboardList, labelKey: "assignments" },
] as const;

const MORE_LINKS = [
  { href: "/student/profile", labelKey: "profile" },
  { href: "/student/grades", labelKey: "grades" },
  { href: "/student/exams", labelKey: "exams" },
  { href: "/student/leave-requests", labelKey: "leaveRequests" },
  { href: "/support/notifications", labelKey: "notifications" },
  { href: "/support/tickets", labelKey: "tickets" },
  { href: "/student/quran", labelKey: "quran" },
  { href: "/student/progress", labelKey: "progress" },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const [sheetOpen, setSheetOpen] = useState(false);

  function isActive(href: string) {
    return pathname.startsWith(`/${locale}${href}`);
  }

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-40 border-t bg-background sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around">
        {MAIN_TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              href={`/${locale}${tab.href}`}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                active ? "text-green-600 font-medium" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span>{t("more")}</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader>
              <SheetTitle>{t("more")}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 py-4">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  onClick={() => setSheetOpen(false)}
                  className={`rounded-md px-4 py-3 text-sm ${
                    isActive(link.href) ? "bg-accent font-medium" : "hover:bg-accent"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
