"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function ErrorFallback({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center pt-6 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("errorDescription")}
          </p>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("tryAgain")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
