"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Surah = {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
};

export type ActiveFilter =
  | { type: "surah"; value: number }
  | { type: "juz"; value: number }
  | { type: "hizb"; value: number }
  | { type: "page"; value: number };

type Tab = "surah" | "juz" | "hizb" | "page";

const TOTAL_PAGES = 604;

export function QuranNav({
  surahs,
  locale,
  activeFilter,
}: {
  surahs: Surah[];
  locale: string;
  activeFilter: ActiveFilter;
}) {
  const t = useTranslations("quranReader");
  const [tab, setTab] = useState<Tab>(activeFilter.type);
  const [pageInput, setPageInput] = useState(
    activeFilter.type === "page" ? String(activeFilter.value) : "1"
  );
  const isAr = locale === "ar";

  const currentPage = activeFilter.type === "page" ? activeFilter.value : 1;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b">
        {(["page", "surah", "juz", "hizb"] as const).map((t_) => (
          <Button
            key={t_}
            variant="ghost"
            size="sm"
            onClick={() => setTab(t_)}
            className={`rounded-none border-b-2 ${
              tab === t_
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t(`${t_}Tab`)}
          </Button>
        ))}
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border bg-card p-2">
        {tab === "surah" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {surahs.map((s) => (
              <a key={s.number} href={`?surah=${s.number}`}>
                <Badge
                  variant={
                    activeFilter.type === "surah" && activeFilter.value === s.number
                      ? "default"
                      : "outline"
                  }
                  className="w-full cursor-pointer text-xs justify-start gap-1 py-1"
                >
                  <span className="font-mono text-muted-foreground">{s.number}</span>
                  {isAr ? s.nameAr : s.nameEn}
                </Badge>
              </a>
            ))}
          </div>
        )}

        {tab === "juz" && (
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-1.5">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
              <a key={juz} href={`?juz=${juz}`}>
                <Badge
                  variant={
                    activeFilter.type === "juz" && activeFilter.value === juz
                      ? "default"
                      : "outline"
                  }
                  className="w-full cursor-pointer text-xs justify-center py-1.5"
                >
                  {t("juzNumber", { number: juz })}
                </Badge>
              </a>
            ))}
          </div>
        )}

        {tab === "hizb" && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-1.5">
            {Array.from({ length: 60 }, (_, i) => i + 1).map((hizb) => (
              <a key={hizb} href={`?hizb=${hizb}`}>
                <Badge
                  variant={
                    activeFilter.type === "hizb" && activeFilter.value === hizb
                      ? "default"
                      : "outline"
                  }
                  className="w-full cursor-pointer text-xs justify-center py-1.5"
                >
                  {t("hizbNumber", { number: hizb })}
                </Badge>
              </a>
            ))}
          </div>
        )}

        {tab === "page" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {activeFilter.type === "page" && currentPage > 1 && (
                <a href={`?page=${currentPage - 1}`}>
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="size-4" />
                  </Button>
                </a>
              )}
              <form className="flex items-center gap-2" action="" method="get">
                <Input
                  type="number"
                  name="page"
                  min={1}
                  max={TOTAL_PAGES}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="w-20 h-8 text-center text-sm"
                />
                <span className="text-sm text-muted-foreground">
                  / {TOTAL_PAGES}
                </span>
                <Button type="submit" variant="outline" size="sm">
                  {t("goToPage")}
                </Button>
              </form>
              {activeFilter.type === "page" && currentPage < TOTAL_PAGES && (
                <a href={`?page=${currentPage + 1}`}>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="size-4" />
                  </Button>
                </a>
              )}
            </div>
            {activeFilter.type === "page" && (
              <p className="text-sm text-muted-foreground">
                {t("pageOf", { current: currentPage, total: TOTAL_PAGES })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
