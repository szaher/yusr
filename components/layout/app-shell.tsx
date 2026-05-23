import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({
  children,
  role,
  enabledFlags,
}: {
  children: ReactNode;
  role: string;
  enabledFlags?: string[];
}) {
  return (
    <div className="flex h-screen">
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200">{children}</main>
      </div>
    </div>
  );
}
