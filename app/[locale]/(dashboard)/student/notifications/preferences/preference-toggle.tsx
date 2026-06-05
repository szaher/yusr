"use client";

import { Switch } from "@/components/ui/switch";
import { useTransition } from "react";

export function PreferenceToggle({
  type,
  field,
  checked,
  action,
}: {
  type: string;
  field: "inApp" | "push";
  checked: boolean;
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(newChecked: boolean) {
    const formData = new FormData();
    formData.set("type", type);
    formData.set("field", field);
    formData.set("enabled", String(newChecked));
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={pending}
      size="sm"
    />
  );
}
