"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { ActiveFilter } from "./quran-nav";

type Ayah = {
  ayahNumber: number;
  surahNumber: number;
  juzNumber: number;
  hizbNumber: number;
  pageNumber?: number | null;
  textAr: string | null;
  textEn: string | null;
  surah?: { nameAr: string; nameEn: string };
};

type Surah = {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
  revelationType: string;
};

const TOTAL_PAGES = 604;

export function SurahReader({
  ayahs,
  surahs,
  currentSurah,
  groupBySurah = false,
  activeFilter,
  locale = "ar",
}: {
  ayahs: Ayah[];
  surahs: Surah[];
  currentSurah?: Surah;
  groupBySurah?: boolean;
  activeFilter?: ActiveFilter;
  locale?: string;
}) {
  const t = useTranslations("quranReader");
  const [showTranslation, setShowTranslation] = useState(true);
  const isAr = locale === "ar";

  const isPageMode = activeFilter?.type === "page";
  const currentPage = isPageMode ? activeFilter.value : null;

  const surahIdx = currentSurah
    ? surahs.findIndex((s) => s.number === currentSurah.number)
    : -1;
  const prevSurah = surahIdx > 0 ? surahs[surahIdx - 1] : null;
  const nextSurah = surahIdx < surahs.length - 1 ? surahs[surahIdx + 1] : null;

  const groups: { surahNumber: number; surahName: string; ayahs: Ayah[] }[] = [];
  if (groupBySurah) {
    for (const ayah of ayahs) {
      const last = groups[groups.length - 1];
      if (last && last.surahNumber === ayah.surahNumber) {
        last.ayahs.push(ayah);
      } else {
        const name = ayah.surah
          ? isAr ? ayah.surah.nameAr : ayah.surah.nameEn
          : `${ayah.surahNumber}`;
        groups.push({ surahNumber: ayah.surahNumber, surahName: name, ayahs: [ayah] });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {currentSurah && (
          <div>
            <h2 className="text-xl font-bold">
              {isAr ? currentSurah.nameAr : currentSurah.nameEn}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("ayahCount", { count: currentSurah.ayahCount })}
              {" · "}
              {t(currentSurah.revelationType === "meccan" ? "meccan" : "medinan")}
              {" · "}
              {t("juz")} {ayahs[0]?.juzNumber}
            </p>
          </div>
        )}
        {isPageMode && currentPage && (
          <div>
            <h2 className="text-xl font-bold">
              {t("pageOf", { current: currentPage, total: TOTAL_PAGES })}
            </h2>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTranslation(!showTranslation)}
        >
          {showTranslation ? <EyeOff className="size-4 me-1" /> : <Eye className="size-4 me-1" />}
          {showTranslation ? t("hideTranslation") : t("showTranslation")}
        </Button>
      </div>

      {currentSurah && currentSurah.number !== 1 && currentSurah.number !== 9 && (
        <p className="text-center text-2xl font-amiri leading-loose text-foreground/80" dir="rtl">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
      )}

      {groupBySurah ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.surahNumber} className="space-y-4">
              <div className="flex items-center gap-3 border-b pb-2">
                <Badge variant="secondary" className="text-sm">
                  {group.surahNumber}
                </Badge>
                <h3 className="text-lg font-bold">{group.surahName}</h3>
              </div>
              {renderAyahs(group.ayahs, showTranslation, t)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {renderAyahs(ayahs, showTranslation, t)}
        </div>
      )}

      {isPageMode && currentPage ? (
        <div className="flex items-center justify-between pt-4">
          {currentPage > 1 ? (
            <a href={`?page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="size-4 me-1" />
                {t("pageNumber", { number: currentPage - 1 })}
              </Button>
            </a>
          ) : (
            <div />
          )}
          {currentPage < TOTAL_PAGES ? (
            <a href={`?page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">
                {t("pageNumber", { number: currentPage + 1 })}
                <ChevronRight className="size-4 ms-1" />
              </Button>
            </a>
          ) : (
            <div />
          )}
        </div>
      ) : currentSurah ? (
        <div className="flex items-center justify-between pt-4">
          {prevSurah ? (
            <a href={`?surah=${prevSurah.number}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="size-4 me-1" />
                {isAr ? prevSurah.nameAr : prevSurah.nameEn}
              </Button>
            </a>
          ) : (
            <div />
          )}
          {nextSurah ? (
            <a href={`?surah=${nextSurah.number}`}>
              <Button variant="outline" size="sm">
                {isAr ? nextSurah.nameAr : nextSurah.nameEn}
                <ChevronRight className="size-4 ms-1" />
              </Button>
            </a>
          ) : (
            <div />
          )}
        </div>
      ) : null}
    </div>
  );
}

function renderAyahs(
  ayahs: Ayah[],
  showTranslation: boolean,
  t: (key: string) => string
) {
  return ayahs.map((ayah) => (
    <div
      key={`${ayah.surahNumber}:${ayah.ayahNumber}`}
      className="rounded-lg border bg-card p-4 space-y-2"
    >
      <div className="flex items-start gap-3" dir="rtl">
        <Badge
          variant="outline"
          className="shrink-0 mt-1 min-w-[2rem] justify-center font-mono text-xs"
        >
          {ayah.ayahNumber}
        </Badge>
        <p className="text-2xl leading-[2.5] font-amiri text-foreground">
          {ayah.textAr || t("noText")}
        </p>
      </div>
      {showTranslation && ayah.textEn && (
        <p className="text-sm text-muted-foreground leading-relaxed ps-10" dir="ltr">
          {ayah.textEn}
        </p>
      )}
    </div>
  ));
}
