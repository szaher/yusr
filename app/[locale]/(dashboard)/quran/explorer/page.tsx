import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { getSurahList, getAyahsBySurah, getAyahsByJuz, getAyahsByHizb, getAyahsByPage } from "@/server/services/quran";
import { notFound } from "next/navigation";
import { MushafPage } from "@/components/quran/mushaf-page";
import { MushafPaginator } from "@/components/quran/mushaf-paginator";
import { QuranNav, type ActiveFilter } from "@/components/quran/quran-nav";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function QuranTextExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ surah?: string; juz?: string; hizb?: string; page?: string; p?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("quran_explorer");
  if (!enabled) notFound();

  const t = await getTranslations("quranReader");
  const sp = await searchParams;

  const surahs = await getSurahList();

  let activeFilter: ActiveFilter;
  if (sp.surah) {
    activeFilter = { type: "surah", value: parseInt(sp.surah, 10) };
  } else if (sp.hizb) {
    activeFilter = { type: "hizb", value: parseInt(sp.hizb, 10) };
  } else if (sp.juz) {
    activeFilter = { type: "juz", value: parseInt(sp.juz, 10) };
  } else {
    activeFilter = { type: "page", value: sp.page ? parseInt(sp.page, 10) : 1 };
  }

  let ayahs;

  if (activeFilter.type === "page") {
    ayahs = await getAyahsByPage(activeFilter.value);
  } else if (activeFilter.type === "hizb") {
    ayahs = await getAyahsByHizb(activeFilter.value);
  } else if (activeFilter.type === "juz") {
    ayahs = await getAyahsByJuz(activeFilter.value);
  } else {
    const currentSurah = surahs.find((s) => s.number === activeFilter.value);
    if (!currentSurah) notFound();
    ayahs = await getAyahsBySurah(activeFilter.value);
  }

  const pages = groupByPage(ayahs);
  const currentPageIdx = sp.p ? parseInt(sp.p, 10) - 1 : 0;
  const pageIdx = Math.max(0, Math.min(currentPageIdx, pages.length - 1));
  const currentMushafPage = pages[pageIdx];

  const filterParam = activeFilter.type === "page"
    ? `page=${activeFilter.value}`
    : activeFilter.type === "surah"
    ? `surah=${activeFilter.value}`
    : activeFilter.type === "juz"
    ? `juz=${activeFilter.value}`
    : `hizb=${activeFilter.value}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <Badge variant="outline" className="text-xs">
            {t("experimental")}
          </Badge>
        </div>
        <Link
          href={`/${locale}/quran`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("backToExplorer")}
        </Link>
      </div>

      <QuranNav surahs={surahs} locale={locale} activeFilter={activeFilter} />

      {activeFilter.type === "page" ? (
        <MushafPage
          ayahs={currentMushafPage?.ayahs ?? []}
          pageNumber={activeFilter.value}
          locale={locale}
        />
      ) : (
        <>
          <MushafPage
            ayahs={currentMushafPage?.ayahs ?? []}
            pageNumber={currentMushafPage?.pageNumber ?? 1}
            locale={locale}
            totalPages={pages.length}
            prevPageHref={pageIdx > 0 ? `?${filterParam}&p=${pageIdx}` : null}
            nextPageHref={pageIdx < pages.length - 1 ? `?${filterParam}&p=${pageIdx + 2}` : null}
          />
          {pages.length > 1 && (
            <MushafPaginator
              pages={pages.map((p) => p.pageNumber)}
              currentIndex={pageIdx}
              filterParam={filterParam}
            />
          )}
        </>
      )}
    </div>
  );
}

function groupByPage(ayahs: { pageNumber?: number | null; [key: string]: unknown }[]) {
  const pageMap = new Map<number, typeof ayahs>();
  for (const ayah of ayahs) {
    const pn = ayah.pageNumber ?? 0;
    if (!pageMap.has(pn)) pageMap.set(pn, []);
    pageMap.get(pn)!.push(ayah);
  }
  return Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, pageAyahs]) => ({ pageNumber, ayahs: pageAyahs as Ayah[] }));
}

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
