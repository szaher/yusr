import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { QuranExplorer } from "@/components/quran/quran-explorer";

export default async function QuranExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    surah?: string;
    ayah?: string;
    reciter?: string;
    mushaf?: string;
    trans?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("quranExplorer");
  const sp = await searchParams;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <QuranExplorer
        initialSurah={sp.surah ? parseInt(sp.surah, 10) : undefined}
        initialAyah={sp.ayah ? parseInt(sp.ayah, 10) : undefined}
        initialReciter={sp.reciter}
        initialMushaf={sp.mushaf}
        initialTranslation={sp.trans}
      />
    </div>
  );
}
