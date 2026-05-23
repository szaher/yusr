import { writeFileSync } from "fs";
import { join } from "path";

interface ApiAyah {
  number: number;
  text: string;
  surah: { number: number };
  numberInSurah: number;
  page: number;
}

interface ApiResponse {
  code: number;
  data: { surahs: { number: number; ayahs: ApiAyah[] }[] };
}

interface FlatAyah {
  surahNumber: number;
  ayahNumber: number;
  text: string;
  page: number;
}

async function fetchEdition(edition: string): Promise<FlatAyah[]> {
  const url = `https://api.alquran.cloud/v1/quran/${edition}`;
  console.log(`Fetching ${edition}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${edition}: ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  return json.data.surahs.flatMap((s) =>
    s.ayahs.map((a) => ({
      surahNumber: s.number,
      ayahNumber: a.numberInSurah,
      text: a.text,
      page: a.page,
    }))
  );
}

async function main() {
  const [arabic, english] = await Promise.all([
    fetchEdition("quran-uthmani"),
    fetchEdition("en.sahih"),
  ]);

  console.log(`Arabic ayahs: ${arabic.length}, English ayahs: ${english.length}`);

  const englishMap = new Map(
    english.map((a) => [`${a.surahNumber}:${a.ayahNumber}`, a.text])
  );

  const merged = arabic.map((a) => ({
    surahNumber: a.surahNumber,
    ayahNumber: a.ayahNumber,
    textAr: a.text,
    textEn: englishMap.get(`${a.surahNumber}:${a.ayahNumber}`) ?? "",
    page: a.page,
  }));

  const outPath = join(__dirname, "..", "data", "quran-ayah-text.json");
  writeFileSync(outPath, JSON.stringify(merged, null, 0));
  console.log(`Wrote ${merged.length} ayahs to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
