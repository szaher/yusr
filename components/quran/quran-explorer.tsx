"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QURAN_SURAHS } from "@/prisma/data/quran-surahs";
import {
  QURAN_RECITERS,
  MUSHAF_OPTIONS,
  TRANSLATION_OPTIONS,
  buildKsuUrl,
} from "@/lib/constants/quran-explorer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function QuranExplorer({
  initialSurah,
  initialAyah,
  initialReciter,
  initialMushaf,
  initialTranslation,
}: {
  initialSurah?: number;
  initialAyah?: number;
  initialReciter?: string;
  initialMushaf?: string;
  initialTranslation?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("quranExplorer");

  const defaultTranslation = locale === "ar" ? "ar_mu" : "en_sh";

  const [surah, setSurah] = useState(initialSurah ?? 1);
  const [ayah, setAyah] = useState(initialAyah ?? 1);
  const [reciter, setReciter] = useState(initialReciter ?? "husary.e");
  const [mushaf, setMushaf] = useState(initialMushaf ?? "hafs");
  const [translation, setTranslation] = useState(
    initialTranslation ?? defaultTranslation
  );

  const [iframeSrc, setIframeSrc] = useState(() =>
    buildKsuUrl({
      locale,
      surah: initialSurah ?? 1,
      ayah: initialAyah ?? 1,
      mushaf: initialMushaf ?? "hafs",
      reciter: initialReciter ?? "husary.e",
      translation: initialTranslation ?? defaultTranslation,
    })
  );

  const selectedSurah = QURAN_SURAHS.find((s) => s.number === surah);
  const maxAyah = selectedSurah?.ayahCount ?? 286;

  function handleSurahChange(value: string) {
    const num = parseInt(value, 10);
    setSurah(num);
    setAyah(1);
  }

  function handleGo() {
    setIframeSrc(
      buildKsuUrl({ locale, surah, ayah, mushaf, reciter, translation })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("surah")}</Label>
          <select
            value={surah}
            onChange={(e) => handleSurahChange(e.target.value)}
            className={selectClassName}
          >
            {QURAN_SURAHS.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("ayah")}</Label>
          <Input
            type="number"
            min={1}
            max={maxAyah}
            value={ayah}
            onChange={(e) =>
              setAyah(
                Math.max(1, Math.min(maxAyah, parseInt(e.target.value, 10) || 1))
              )
            }
            className="w-20"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("reciter")}</Label>
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            className={selectClassName}
          >
            {QURAN_RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {locale === "ar" ? r.nameAr : r.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("mushaf")}</Label>
          <select
            value={mushaf}
            onChange={(e) => setMushaf(e.target.value)}
            className={selectClassName}
          >
            {MUSHAF_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {locale === "ar" ? m.labelAr : m.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("translation")}</Label>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className={selectClassName}
          >
            {TRANSLATION_OPTIONS.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {locale === "ar" ? tr.labelAr : tr.labelEn}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleGo}>{t("go")}</Button>
      </div>

      <iframe
        src={iframeSrc}
        className="h-[700px] w-full rounded-lg border"
        sandbox="allow-scripts allow-same-origin allow-popups"
        allowFullScreen
      />
    </div>
  );
}
