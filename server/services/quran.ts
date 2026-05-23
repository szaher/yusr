import { db } from "@/server/db/client";

export async function getSurahList() {
  return db.quranSurah.findMany({
    orderBy: { number: "asc" },
    select: { number: true, nameAr: true, nameEn: true, ayahCount: true, revelationType: true },
  });
}

export async function getAyahsBySurah(surahNumber: number) {
  return db.quranAyah.findMany({
    where: { surahNumber },
    orderBy: { ayahNumber: "asc" },
    select: {
      ayahNumber: true,
      surahNumber: true,
      juzNumber: true,
      hizbNumber: true,
      pageNumber: true,
      textAr: true,
      textEn: true,
      surah: { select: { nameAr: true, nameEn: true } },
    },
  });
}

export async function getAyahsByJuz(juzNumber: number) {
  return db.quranAyah.findMany({
    where: { juzNumber },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    select: {
      ayahNumber: true,
      surahNumber: true,
      juzNumber: true,
      hizbNumber: true,
      pageNumber: true,
      textAr: true,
      textEn: true,
      surah: { select: { nameAr: true, nameEn: true } },
    },
  });
}

export async function getAyahsByPage(pageNumber: number) {
  return db.quranAyah.findMany({
    where: { pageNumber: pageNumber },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    select: {
      ayahNumber: true,
      surahNumber: true,
      juzNumber: true,
      hizbNumber: true,
      pageNumber: true,
      textAr: true,
      textEn: true,
      surah: { select: { nameAr: true, nameEn: true } },
    },
  });
}

export async function getAyahsByHizb(hizbNumber: number) {
  return db.quranAyah.findMany({
    where: { hizbNumber },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    select: {
      ayahNumber: true,
      surahNumber: true,
      juzNumber: true,
      hizbNumber: true,
      pageNumber: true,
      textAr: true,
      textEn: true,
      surah: { select: { nameAr: true, nameEn: true } },
    },
  });
}
