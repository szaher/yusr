import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center pt-6 text-center space-y-4">
          <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">{t("notFound")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("notFoundDescription")}
          </p>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("goHome")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
