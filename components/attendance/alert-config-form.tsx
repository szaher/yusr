"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateAlertConfigAction } from "@/server/actions/attendance";
import { toast } from "sonner";

type Config = {
  consecutiveAbsenceThreshold: number;
  attendanceRateThreshold: number;
  notifyModerator: boolean;
  notifyAdmin: boolean;
};

export function AlertConfigForm({
  groupId,
  initialConfig,
  isOverride,
  label,
}: {
  groupId: string | null;
  initialConfig: Config;
  isOverride: boolean;
  label: string;
}) {
  const t = useTranslations("attendance");
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateAlertConfigAction(groupId, config);
      if (result.success) {
        toast.success(t("configSaved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("alertConfig")} — {label}
        </CardTitle>
        {isOverride && (
          <p className="text-xs text-muted-foreground">{t("overridingDefault")}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">{t("consecutiveThreshold")}</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.consecutiveAbsenceThreshold}
              onChange={(e) =>
                setConfig((c) => ({ ...c, consecutiveAbsenceThreshold: parseInt(e.target.value) || 3 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("rateThreshold")}</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={config.attendanceRateThreshold}
              onChange={(e) =>
                setConfig((c) => ({ ...c, attendanceRateThreshold: parseInt(e.target.value) || 75 }))
              }
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.notifyModerator}
              onChange={(e) => setConfig((c) => ({ ...c, notifyModerator: e.target.checked }))}
              className="rounded"
            />
            {t("notifyModerator")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.notifyAdmin}
              onChange={(e) => setConfig((c) => ({ ...c, notifyAdmin: e.target.checked }))}
              className="rounded"
            />
            {t("notifyAdmin")}
          </label>
        </div>
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? "..." : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
