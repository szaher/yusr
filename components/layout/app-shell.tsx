import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PushSubscriptionBanner } from "@/components/pwa/push-subscription";

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

  return (
    <div className="flex h-screen">
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200">{children}</main>
      </div>
      {vapidPublicKey && flagSet.has("pwa") && pushTranslations && (
        <PushSubscriptionBanner
          vapidPublicKey={vapidPublicKey}
          translations={pushTranslations}
        />
      )}
    </div>
  );
}
