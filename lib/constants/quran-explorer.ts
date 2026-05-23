export const QURAN_RECITERS = [
  { id: "husary.e", nameEn: "Al-Husary", nameAr: "الحصري" },
  { id: "husary.m", nameEn: "Al-Husary (Muallim)", nameAr: "الحصري (المعلم)" },
  { id: "husary.t", nameEn: "Al-Husary (Mujawwad)", nameAr: "الحصري (مجود)" },
  { id: "sudais", nameEn: "As-Sudais", nameAr: "السديس" },
  { id: "shuraym", nameEn: "Ash-Shuraim", nameAr: "الشريم" },
  { id: "afasy", nameEn: "Al-Afasy", nameAr: "العفاسي" },
  { id: "minshawy.m", nameEn: "Al-Minshawi", nameAr: "المنشاوي" },
  { id: "minshawy.t", nameEn: "Al-Minshawi (Mujawwad)", nameAr: "المنشاوي (مجود)" },
  { id: "abdulbasit.m", nameEn: "Abdul Basit", nameAr: "عبد الباسط" },
  { id: "abdulbasit.t", nameEn: "Abdul Basit (Mujawwad)", nameAr: "عبد الباسط (مجود)" },
  { id: "ghamdi", nameEn: "Al-Ghamdi", nameAr: "الغامدي" },
  { id: "ajamy", nameEn: "Al-Ajamy", nameAr: "العجمي" },
  { id: "maiqly", nameEn: "Al-Muaiqly", nameAr: "المعيقلي" },
  { id: "qatami", nameEn: "Al-Qatami", nameAr: "القطامي" },
  { id: "dossari.y", nameEn: "Yasser Ad-Dossari", nameAr: "ياسر الدوسري" },
  { id: "jibreel", nameEn: "Muhammad Jibreel", nameAr: "محمد جبريل" },
  { id: "shatri", nameEn: "Abu Bakr Ash-Shatri", nameAr: "أبو بكر الشاطري" },
  { id: "basfar", nameEn: "Abdullah Basfar", nameAr: "عبد الله بصفر" },
  { id: "ayyub", nameEn: "Muhammad Ayyub", nameAr: "محمد أيوب" },
  { id: "rifai", nameEn: "Hani Ar-Rifai", nameAr: "هاني الرفاعي" },
  { id: "tablawi", nameEn: "At-Tablawi", nameAr: "الطبلاوي" },
  { id: "fares", nameEn: "Fares Abbad", nameAr: "فارس عباد" },
] as const;

export const MUSHAF_OPTIONS = [
  { id: "hafs", labelEn: "Hafs", labelAr: "حفص" },
  { id: "hafs-tajweed", labelEn: "Hafs (Tajweed)", labelAr: "حفص (تجويد)" },
  { id: "warsh", labelEn: "Warsh", labelAr: "ورش" },
] as const;

export const TRANSLATION_OPTIONS = [
  { id: "ar_mu", labelEn: "Arabic (Al-Muyassar)", labelAr: "التفسير الميسر" },
  { id: "ar_baghawy", labelEn: "Tafsir Al-Baghawi", labelAr: "تفسير البغوي" },
  { id: "ar_katheer", labelEn: "Tafsir Ibn Kathir", labelAr: "تفسير ابن كثير" },
  { id: "ar_qortoby", labelEn: "Tafsir Al-Qurtubi", labelAr: "تفسير القرطبي" },
  { id: "ar_tabary", labelEn: "Tafsir At-Tabari", labelAr: "تفسير الطبري" },
  { id: "en_sh", labelEn: "English (Sahih Intl)", labelAr: "إنجليزي (صحيح)" },
] as const;

export function buildKsuUrl(params: {
  locale: string;
  surah: number;
  ayah: number;
  mushaf: string;
  reciter: string;
  translation: string;
}): string {
  const lang = params.locale === "ar" ? "ar" : "en";
  return `https://quran.ksu.edu.sa/index.php?l=${lang}#aya=${params.surah}_${params.ayah}&m=${params.mushaf}&qaree=${params.reciter}&trans=${params.translation}`;
}
