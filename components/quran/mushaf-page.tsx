"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

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

const TOTAL_PAGES = 604;

const JUZ_NAMES: Record<number, string> = {
  1: "الأوَّل", 2: "الثاني", 3: "الثالِث", 4: "الرابِع", 5: "الخامِس",
  6: "السادِس", 7: "السابِع", 8: "الثامِن", 9: "التاسِع", 10: "العاشِر",
  11: "الحادي عَشَر", 12: "الثاني عَشَر", 13: "الثالِث عَشَر", 14: "الرابِع عَشَر", 15: "الخامِس عَشَر",
  16: "السادِس عَشَر", 17: "السابِع عَشَر", 18: "الثامِن عَشَر", 19: "التاسِع عَشَر", 20: "العِشرون",
  21: "الحادي والعِشرون", 22: "الثاني والعِشرون", 23: "الثالِث والعِشرون", 24: "الرابِع والعِشرون", 25: "الخامِس والعِشرون",
  26: "السادِس والعِشرون", 27: "السابِع والعِشرون", 28: "الثامِن والعِشرون", 29: "التاسِع والعِشرون", 30: "الثلاثون",
};

function toArabicNumeral(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d)])
    .join("");
}

export function MushafPage({
  ayahs,
  pageNumber,
  locale = "ar",
  totalPages = TOTAL_PAGES,
  prevPageHref,
  nextPageHref,
}: {
  ayahs: Ayah[];
  pageNumber: number;
  locale?: string;
  totalPages?: number;
  prevPageHref?: string | null;
  nextPageHref?: string | null;
}) {
  const t = useTranslations("quranReader");
  const [showTranslation, setShowTranslation] = useState(false);

  const surahStarts = new Set<number>();
  let prevSurahNum = 0;
  for (const ayah of ayahs) {
    if (ayah.surahNumber !== prevSurahNum) {
      if (ayah.ayahNumber === 1) {
        surahStarts.add(ayah.surahNumber);
      }
      prevSurahNum = ayah.surahNumber;
    }
  }

  const juzNumber = ayahs[0]?.juzNumber;
  const firstSurah = ayahs[0]?.surah;
  const firstSurahNum = ayahs[0]?.surahNumber;
  const lastSurahNum = ayahs[ayahs.length - 1]?.surahNumber;
  const lastSurah = ayahs[ayahs.length - 1]?.surah;

  const defaultPrev = pageNumber > 1 ? `?page=${pageNumber - 1}` : null;
  const defaultNext = pageNumber < totalPages ? `?page=${pageNumber + 1}` : null;
  const prevHref = prevPageHref !== undefined ? prevPageHref : defaultPrev;
  const nextHref = nextPageHref !== undefined ? nextPageHref : defaultNext;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTranslation(!showTranslation)}
          className="text-muted-foreground"
        >
          {showTranslation ? <EyeOff className="size-4 me-1" /> : <Eye className="size-4 me-1" />}
          {showTranslation ? t("hideTranslation") : t("showTranslation")}
        </Button>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Mushaf page */}
        <div
          className="mushaf-page relative border-2 border-[#b8960c] dark:border-[#8a7209] bg-[#fefcf3] dark:bg-[#171307] shadow-lg"
          dir="rtl"
        >
          {/* Inner border */}
          <div className="absolute inset-2 border border-[#b8960c]/40 dark:border-[#8a7209]/30 pointer-events-none" />

          {/* Header bar */}
          <div className="relative mx-4 mt-4 flex items-center justify-between px-4 py-1.5 border-b border-[#b8960c]/30 dark:border-[#8a7209]/25">
            <span className="text-[13px] font-amiri font-bold text-[#1a4a8a] dark:text-[#7ba4d9]">
              {firstSurah
                ? firstSurahNum === lastSurahNum
                  ? `سُورَةُ ${firstSurah.nameAr}`
                  : `سُورَةُ ${lastSurah?.nameAr}`
                : ""}
            </span>
            <span className="text-[13px] font-amiri font-bold text-[#1a4a8a] dark:text-[#7ba4d9]">
              {juzNumber ? `الجُزْءُ ${JUZ_NAMES[juzNumber] || toArabicNumeral(juzNumber)}` : ""}
            </span>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-8 py-4 sm:py-6">
            {renderMushafContent(ayahs, surahStarts, showTranslation)}
          </div>

          {/* Page number footer */}
          <div className="relative mx-4 mb-4 flex items-center justify-center border-t border-[#b8960c]/30 dark:border-[#8a7209]/25 pt-2">
            <span className="text-base font-amiri font-bold text-[#b8960c] dark:text-[#8a7209]">
              {toArabicNumeral(pageNumber)}
            </span>
          </div>
        </div>

        {/* Navigation below the page */}
        <div className="flex items-center justify-between pt-3" dir="ltr">
          {prevHref ? (
            <a href={prevHref}>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <ChevronLeft className="size-4" />
              </Button>
            </a>
          ) : (
            <div className="w-8" />
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {pageNumber} / {totalPages}
          </span>
          {nextHref ? (
            <a href={nextHref}>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <ChevronRight className="size-4" />
              </Button>
            </a>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>
    </div>
  );
}

function AyahEndMarker({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center justify-center mx-0.5 align-middle select-none">
      <span className="relative inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
        <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full" fill="none">
          {/* Outer circle */}
          <circle cx="18" cy="18" r="15" stroke="#b8960c" strokeWidth="1.2" opacity="0.7" />
          {/* Inner circle */}
          <circle cx="18" cy="18" r="12" stroke="#b8960c" strokeWidth="0.6" opacity="0.4" />
          {/* Decorative dots at cardinal points */}
          {[0, 90, 180, 270].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <circle
                key={angle}
                cx={18 + 13.5 * Math.cos(rad)}
                cy={18 + 13.5 * Math.sin(rad)}
                r="1"
                fill="#b8960c"
                opacity="0.5"
              />
            );
          })}
        </svg>
        <span className="relative text-[9px] sm:text-[10px] font-amiri font-bold text-[#b8960c] dark:text-[#c9a84c] leading-none">
          {toArabicNumeral(number)}
        </span>
      </span>
    </span>
  );
}

function renderMushafContent(
  ayahs: Ayah[],
  surahStarts: Set<number>,
  showTranslation: boolean,
) {
  const elements: React.ReactNode[] = [];
  let currentSurah = 0;
  let continuousText: { surahNumber: number; ayahNumber: number; textAr: string; textEn: string | null }[] = [];

  function flushText() {
    if (continuousText.length === 0) return;

    elements.push(
      <p
        key={`text-${continuousText[0].surahNumber}-${continuousText[0].ayahNumber}`}
        className="text-[1.3rem] sm:text-[1.5rem] leading-[2.3] sm:leading-[2.5] font-amiri text-[#222] dark:text-[#ddd] text-justify"
      >
        {continuousText.map((a) => (
          <span key={`${a.surahNumber}:${a.ayahNumber}`}>
            {a.textAr}
            <AyahEndMarker number={a.ayahNumber} />
          </span>
        ))}
      </p>
    );

    if (showTranslation) {
      elements.push(
        <div
          key={`trans-${continuousText[0].surahNumber}-${continuousText[0].ayahNumber}`}
          className="border-t border-[#b8960c]/10 pt-2 mt-1 mb-3 space-y-1"
          dir="ltr"
        >
          {continuousText
            .filter((a) => a.textEn)
            .map((a) => (
              <p
                key={`en-${a.surahNumber}:${a.ayahNumber}`}
                className="text-[11px] text-muted-foreground leading-relaxed"
              >
                <span className="font-mono text-[10px] opacity-50 me-1">
                  {a.surahNumber}:{a.ayahNumber}
                </span>
                {a.textEn}
              </p>
            ))}
        </div>
      );
    }

    continuousText = [];
  }

  for (const ayah of ayahs) {
    if (ayah.surahNumber !== currentSurah) {
      flushText();

      if (surahStarts.has(ayah.surahNumber)) {
        const surahName = ayah.surah ? ayah.surah.nameAr : "";

        elements.push(
          <div key={`header-${ayah.surahNumber}`} className="text-center py-3 my-2">
            <div className="inline-block w-full max-w-[85%]">
              <div className="relative border-2 border-[#b8960c]/50 dark:border-[#8a7209]/40 rounded-2xl bg-gradient-to-b from-[#f5eed4] to-[#ede4c0] dark:from-[#252010] dark:to-[#1e1a08] px-6 py-2">
                <p className="text-[1.15rem] sm:text-xl font-bold font-amiri text-[#222] dark:text-[#ddd]">
                  سُورَةُ {surahName}
                </p>
              </div>
            </div>
          </div>
        );

        if (ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
          elements.push(
            <p
              key={`bismillah-${ayah.surahNumber}`}
              className="text-center text-[1.15rem] sm:text-[1.3rem] font-amiri leading-loose text-[#222]/80 dark:text-[#ddd]/70 my-1"
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          );
        }
      }

      currentSurah = ayah.surahNumber;
    }

    continuousText.push({
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      textAr: ayah.textAr || "",
      textEn: ayah.textEn,
    });
  }

  flushText();

  return elements;
}
