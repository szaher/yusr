"use client";

import { useState, useEffect } from "react";
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

const STORAGE_KEY = "quran-explorer-settings";

type SavedSettings = {
  surah: number;
  ayah: number;
  reciter: string;
  mushaf: string;
  translation: string;
};

function loadSavedSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSettings;
  } catch {
    return null;
  }
}

function saveSettings(settings: SavedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

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

  const hasInitialProps =
    initialSurah !== undefined ||
    initialReciter !== undefined ||
    initialMushaf !== undefined ||
    initialTranslation !== undefined;

  const startSurah = initialSurah ?? 1;
  const startAyah = initialAyah ?? 1;
  const startReciter = initialReciter ?? "husary.e";
  const startMushaf = initialMushaf ?? "hafs";
  const startTranslation = initialTranslation ?? defaultTranslation;

  const [surah, setSurah] = useState(startSurah);
  const [ayah, setAyah] = useState(startAyah);
  const [reciter, setReciter] = useState(startReciter);
  const [mushaf, setMushaf] = useState(startMushaf);
  const [translation, setTranslation] = useState(startTranslation);

  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState(() =>
    buildKsuUrl({
      locale,
      surah: startSurah,
      ayah: startAyah,
      mushaf: startMushaf,
      reciter: startReciter,
      translation: startTranslation,
    })
  );

  useEffect(() => {
    if (hasInitialProps) return;
    const saved = loadSavedSettings();
    if (!saved) return;

    const s = saved.surah ?? startSurah;
    const a = saved.ayah ?? startAyah;
    const r = saved.reciter ?? startReciter;
    const m = saved.mushaf ?? startMushaf;
    const tr = saved.translation ?? startTranslation;

    setSurah(s);
    setAyah(a);
    setReciter(r);
    setMushaf(m);
    setTranslation(tr);
    setIframeSrc(buildKsuUrl({ locale, surah: s, ayah: a, mushaf: m, reciter: r, translation: tr }));
    setIframeKey((k) => k + 1);
  }, []);

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
    setIframeKey((k) => k + 1);
    saveSettings({ surah, ayah, reciter, mushaf, translation });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-end">
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
            onChange={(e) => setAyah(parseInt(e.target.value, 10) || 1)}
            onBlur={() => setAyah((v) => Math.max(1, Math.min(maxAyah, v)))}
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

        <Button onClick={handleGo} className="sm:col-span-2 md:col-span-1">{t("go")}</Button>
      </div>

      <iframe
        key={iframeKey}
        src={iframeSrc}
        className="h-[400px] w-full rounded-lg border md:h-[700px]"
        sandbox="allow-scripts allow-same-origin allow-popups"
        allowFullScreen
      />
    </div>
  );
}
