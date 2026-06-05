import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PushSubscriptionBanner } from "@/components/pwa/push-subscription";
import { BottomNav } from "@/components/layout/bottom-nav";

export function AppShell({
  children,
  role,
  enabledFlags,
  vapidPublicKey,
  pushTranslations,
}: {
  children: ReactNode;
  role: string;
  enabledFlags?: string[];
  vapidPublicKey?: string;
  pushTranslations?: {
    enableNotifications: string;
    notificationPrompt: string;
    dismiss: string;
  };
}) {
  const flagSet = new Set(enabledFlags);
  const isStudent = role === "student";
  const showBottomNav = isStudent && flagSet.has("pwa");

  return (
    <div className="flex h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main id="main-content" className={`flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200 ${showBottomNav ? "pb-20 sm:pb-6" : ""}`}>
          {children}
        </main>
      </div>
      {showBottomNav && <BottomNav />}
      {vapidPublicKey && flagSet.has("pwa") && pushTranslations && (
        <PushSubscriptionBanner
          vapidPublicKey={vapidPublicKey}
          translations={pushTranslations}
        />
      )}
    </div>
  );
}
