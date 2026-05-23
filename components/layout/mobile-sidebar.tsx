"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useLocale } from "next-intl";

export function MobileSidebar({
  role,
  enabledFlags = [],
}: {
  role: string;
  enabledFlags?: string[];
}) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const side = locale === "ar" ? "right" : "left";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={side} className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            role={role}
            enabledFlags={enabledFlags}
            onNavClick={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
