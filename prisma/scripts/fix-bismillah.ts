import fs from "fs";
import path from "path";

const JSON_PATH = path.join(__dirname, "../data/quran-ayah-text.json");

interface AyahEntry {
  surahNumber: number;
  ayahNumber: number;
  textAr: string;
  textEn: string;
  page: number;
}

function main() {
  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const data: AyahEntry[] = JSON.parse(raw);

  const s1a1 = data.find((d) => d.surahNumber === 1 && d.ayahNumber === 1);
  if (!s1a1) throw new Error("Surah 1 ayah 1 not found");

  const canonicalBismillah = s1a1.textAr.replace(/^﻿/, "");

  const shaddaVariant = canonicalBismillah.replace("بِسْمِ", "بِّسْمِ");

  let fixed = 0;
  let skipped = 0;

  for (const entry of data) {
    if (entry.ayahNumber !== 1) continue;
    if (entry.surahNumber === 1 || entry.surahNumber === 9) continue;

    let stripped: string | null = null;

    if (entry.textAr.startsWith(canonicalBismillah)) {
      stripped = entry.textAr.substring(canonicalBismillah.length).trimStart();
    } else if (entry.textAr.startsWith(shaddaVariant)) {
      stripped = entry.textAr.substring(shaddaVariant.length).trimStart();
    }

    if (stripped !== null) {
      entry.textAr = stripped;
      fixed++;
    } else {
      console.log(`WARNING: Surah ${entry.surahNumber} ayah 1 did not match any Bismillah pattern`);
      console.log(`  Text: ${entry.textAr.substring(0, 60)}`);
      skipped++;
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

  console.log(`Fixed: ${fixed} surahs`);
  console.log(`Skipped: ${skipped} surahs`);

  const s1check = data.find((d) => d.surahNumber === 1 && d.ayahNumber === 1);
  const s2check = data.find((d) => d.surahNumber === 2 && d.ayahNumber === 1);
  const s9check = data.find((d) => d.surahNumber === 9 && d.ayahNumber === 1);
  const s95check = data.find((d) => d.surahNumber === 95 && d.ayahNumber === 1);

  console.log("\nVerification:");
  console.log(`  Surah 1 ayah 1: ${s1check?.textAr.substring(0, 40)}`);
  console.log(`  Surah 2 ayah 1: ${s2check?.textAr.substring(0, 40)}`);
  console.log(`  Surah 9 ayah 1: ${s9check?.textAr.substring(0, 40)}`);
  console.log(`  Surah 95 ayah 1: ${s95check?.textAr.substring(0, 40)}`);
}

main();
