# Quran Data Model & Seeding

## Overview

Yusr Academy's Quran data is a read-only reference dataset seeded during database initialization. The data includes 114 surahs, 6236 ayahs, with complete boundary metadata for juz, hizb, and quarter-hizb divisions.

---

## Data Models

### QuranSurah
**Total**: 114 surahs

```prisma
model QuranSurah {
  number         Int    @id           // 1-114
  nameAr         String                // "الفاتحة"
  nameEn         String                // "Al-Fatihah"
  revelationType String                // "Meccan" or "Medinan"
  ayahCount      Int                   // Number of ayahs
  ayahs          QuranAyah[]
}
```

### QuranAyah
**Total**: 6236 ayahs

```prisma
model QuranAyah {
  id            Int        @id @default(autoincrement())
  surahNumber   Int        // FK to QuranSurah
  ayahNumber    Int        // Ayah number within surah (1-based)
  juzNumber     Int        // 1-30
  hizbNumber    Int        // 1-60
  quarterNumber Int        // 1-240
  pageNumber    Int?       // Mushaf page (1-604)
  textAr        String?    // Arabic text
  textEn        String?    // English translation
  surah         QuranSurah @relation(...)

  @@unique([surahNumber, ayahNumber])
  @@index([juzNumber])
  @@index([hizbNumber])
  @@index([quarterNumber])
}
```

### QuranJuz
**Total**: 30 juz

```prisma
model QuranJuz {
  number Int     @id  // 1-30
  nameAr String?      // "الجزء ١"
}
```

### QuranHizb
**Total**: 60 hizbs (2 per juz)

```prisma
model QuranHizb {
  number    Int @id  // 1-60
  juzNumber Int      // Parent juz (1-30)
}
```

### QuranQuarter
**Total**: 240 quarters (4 per hizb, also called "rub")

```prisma
model QuranQuarter {
  number     Int @id  // 1-240
  hizbNumber Int      // Parent hizb (1-60)
}
```

---

## Data Sources

### Surah Metadata

**File**: `prisma/data/quran-surahs.ts`

```typescript
export const QURAN_SURAHS = [
  { number: 1, nameAr: "الفاتحة", nameEn: "Al-Fatihah", revelationType: "Meccan", ayahCount: 7 },
  { number: 2, nameAr: "البقرة", nameEn: "Al-Baqarah", revelationType: "Medinan", ayahCount: 286 },
  // ... 112 more
];
```

### Juz Boundaries

**File**: `prisma/data/quran-juz-boundaries.ts`

```typescript
export const JUZ_BOUNDARIES = [
  { juz: 1, surah: 1, ayah: 1 },    // Juz 1 starts at Al-Fatihah 1:1
  { juz: 2, surah: 2, ayah: 142 },  // Juz 2 starts at Al-Baqarah 2:142
  // ... 28 more boundaries
];
```

### Hizb Boundaries

**File**: `prisma/data/quran-hizb-boundaries.ts`

```typescript
export const HIZB_BOUNDARIES = [
  { hizb: 1, surah: 1, ayah: 1 },
  { hizb: 2, surah: 2, ayah: 26 },
  { hizb: 3, surah: 2, ayah: 44 },
  // ... 57 more
];
```

### Quarter Boundaries

**File**: `prisma/data/quran-quarter-boundaries.ts`

```typescript
export const QUARTER_BOUNDARIES = [
  { quarter: 1, surah: 1, ayah: 1 },
  { quarter: 2, surah: 1, ayah: 5 },
  { quarter: 3, surah: 2, ayah: 6 },
  { quarter: 4, surah: 2, ayah: 16 },
  // ... 236 more
];
```

### Ayah Text & Page Numbers

**File**: `prisma/data/quran-ayah-text.json`

```json
[
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "textAr": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "textEn": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    "page": 1
  },
  // ... 6235 more
]
```

**Total Size**: ~2.5 MB JSON file

---

## Seeding Process

**File**: `prisma/seed.ts`

### Step 1: Seed Surahs

```typescript
for (const surah of QURAN_SURAHS) {
  await prisma.quranSurah.upsert({
    where: { number: surah.number },
    update: {},
    create: surah,
  });
}
```

### Step 2: Seed Juz, Hizb, Quarter Metadata

```typescript
// 30 juz
for (let i = 1; i <= 30; i++) {
  await prisma.quranJuz.upsert({
    where: { number: i },
    update: {},
    create: { number: i, nameAr: `الجزء ${i}` },
  });
}

// 60 hizbs
for (let i = 1; i <= 60; i++) {
  await prisma.quranHizb.upsert({
    where: { number: i },
    update: {},
    create: { number: i, juzNumber: Math.ceil(i / 2) },
  });
}

// 240 quarters
for (let i = 1; i <= 240; i++) {
  await prisma.quranQuarter.upsert({
    where: { number: i },
    update: {},
    create: { number: i, hizbNumber: Math.ceil(i / 4) },
  });
}
```

### Step 3: Compute Juz/Hizb/Quarter for Each Ayah

```typescript
function getJuzForAyah(surahNum: number, ayahNum: number): number {
  let juz = 1;
  for (const boundary of sortedBoundaries) {
    if (
      surahNum > boundary.surah ||
      (surahNum === boundary.surah && ayahNum >= boundary.ayah)
    ) {
      juz = boundary.juz;
    }
  }
  return juz;
}

// Similar for getHizbForAyah() and getQuarterForAyah()
```

**Algorithm**:
1. Sort boundaries by (surah, ayah)
2. For each ayah, find the latest boundary that starts before or at this ayah
3. Assign that boundary's juz/hizb/quarter number

### Step 4: Create Ayahs with Boundaries

```typescript
for (const surah of QURAN_SURAHS) {
  const ayahData = [];
  for (let a = 1; a <= surah.ayahCount; a++) {
    const juzNum = getJuzForAyah(surah.number, a);
    const hizbNum = getHizbForAyah(surah.number, a);
    const quarterNum = getQuarterForAyah(surah.number, a);
    const text = textMap.get(`${surah.number}:${a}`);

    ayahData.push({
      surahNumber: surah.number,
      ayahNumber: a,
      juzNumber: juzNum,
      hizbNumber: hizbNum,
      quarterNumber: quarterNum,
      pageNumber: text?.page ?? null,
      textAr: text?.textAr ?? null,
      textEn: text?.textEn ?? null,
    });
  }

  await prisma.quranAyah.createMany({
    data: ayahData,
    skipDuplicates: true,
  });
}
```

### Step 5: Batch Update Ayah Text

```typescript
const BATCH_SIZE = 500;
for (let i = 0; i < quranAyahText.length; i += BATCH_SIZE) {
  const batch = quranAyahText.slice(i, i + BATCH_SIZE);
  await prisma.$transaction(
    batch.map((entry) =>
      prisma.quranAyah.update({
        where: { 
          surahNumber_ayahNumber: { 
            surahNumber: entry.surahNumber, 
            ayahNumber: entry.ayahNumber 
          } 
        },
        data: { 
          textAr: entry.textAr, 
          textEn: entry.textEn, 
          pageNumber: entry.page 
        },
      })
    )
  );
}
```

**Why separate steps?**
- Step 4 creates ayahs quickly (no text, smaller payload)
- Step 5 updates text in batches (avoids transaction timeout)

---

## Memorization Position Math

### Computing Total Ayahs Before

Used to calculate absolute progress through the Quran:

```typescript
// For Al-Baqarah (surah 2), ayah 100:
const totalBefore = QURAN_SURAHS
  .filter((s) => s.number < 2)
  .reduce((sum, s) => sum + s.ayahCount, 0);

const total = totalBefore + 100;  // = 7 (from Al-Fatihah) + 100 = 107
```

### Computing Next Review Range

**Input**:
- Current position: `{ surahId: 2, ayahNumber: 100 }`
- Pace: `{ unit: "RUB", value: 1 }` (1 quarter-hizb)

**Logic**:
1. Find current ayah's quarterNumber (e.g., 15)
2. Add paceValue (e.g., 15 + 1 = 16)
3. Find first ayah in quarter 16
4. That's the next "to" position

**Service**: `server/services/memorization-review.ts`

```typescript
export async function computeNextRange(
  startSurahId: number,
  startAyah: number,
  paceUnit: PaceUnit,
  paceValue: number
) {
  if (paceUnit === "RUB") {
    // Get current ayah
    const current = await db.quranAyah.findFirst({
      where: { surahNumber: startSurahId, ayahNumber: startAyah },
    });
    
    // Find next quarter
    const targetQuarter = current.quarterNumber + paceValue;
    
    // Get first ayah in that quarter
    const nextAyah = await db.quranAyah.findFirst({
      where: { quarterNumber: targetQuarter },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    });
    
    return {
      nextFromSurahNumber: startSurahId,
      nextFromAyah: startAyah,
      nextToSurahNumber: nextAyah.surahNumber,
      nextToAyah: nextAyah.ayahNumber,
    };
  }
  
  // Similar logic for HIZB and PAGE_COUNT
}
```

### Page-Based Pace

**Challenge**: Pages don't have explicit boundaries in the data.

**Solution**: Use `pageNumber` field to find ayahs on target pages.

Example: "Memorize 1.5 pages per session"

```typescript
const currentPage = currentAyah.pageNumber; // e.g., 10
const targetPage = currentPage + Math.ceil(paceValue); // 10 + 2 = 12

// Find last ayah on target page
const lastAyahOnPage = await db.quranAyah.findFirst({
  where: { pageNumber: targetPage },
  orderBy: [{ surahNumber: "desc" }, { ayahNumber: "desc" }],
});

// Next range is from current position to end of target page
```

---

## Quran Services

**File**: `server/services/quran.ts`

### getSurahList()
Returns all 114 surahs.

### getAyahsBySurah(surahNumber)
Returns all ayahs for a specific surah.

### getAyahsByJuz(juzNumber)
Returns all ayahs in a juz (1-30).

### getAyahsByPage(pageNumber)
Returns all ayahs on a Mushaf page (1-604).

### getAyahsByHizb(hizbNumber)
Returns all ayahs in a hizb (1-60).

---

## Data Integrity

### Constraints

- `QuranAyah.surahNumber` FK to `QuranSurah.number`
- Unique constraint: `[surahNumber, ayahNumber]`
- Indexes on `juzNumber`, `hizbNumber`, `quarterNumber` for fast boundary queries

### Validation

During seeding, verify:
- Total ayahs = 6236
- All surahs have correct ayahCount
- All ayahs have juz/hizb/quarter assigned
- Page numbers range from 1-604

---

## System Settings

Quran data metadata stored in `SystemSetting`:

```typescript
{
  key: "quran_dataset_source",
  value: "tanzil.net",
  description: "Source of Quran metadata"
},
{
  key: "quran_dataset_version",
  value: "1.0",
  description: "Version of Quran dataset"
},
{
  key: "quran_dataset_import_date",
  value: "2026-05-31T...",
  description: "Date of last Quran data import"
},
{
  key: "default_riwayah",
  value: "hafs_an_asim",
  description: "Default Quran recitation style"
}
```

---

## Quran Explorer Feature

**Feature Flag**: `quran_explorer` (enabled by default)

**Features**:
- Browse by surah, juz, or page
- View ayah text (Arabic + English)
- Navigate between surahs/juz/pages
- Bookmark ayahs (future)

**Routes** (under `quran_explorer` flag):
- `/ar/quran` - Quran explorer landing
- `/ar/quran/surah/[number]` - Surah view
- `/ar/quran/juz/[number]` - Juz view
- `/ar/quran/page/[number]` - Page view

---

## Future Enhancements

1. **Audio Recitation**: Link ayahs to audio files (e.g., from EveryAyah.com)
2. **Tafsir**: Add commentary (tafsir) to ayahs
3. **Word-by-Word Translation**: Breakdown each Arabic word
4. **Tajweed Highlighting**: Color-code tajweed rules
5. **Search**: Full-text search across Arabic and English text
6. **Bookmarks**: Allow users to bookmark ayahs
7. **Reading Progress**: Track which ayahs a student has read

---

## Performance Considerations

### Index Usage

All boundary queries use indexes:

```sql
-- Fast: Uses index
SELECT * FROM QuranAyah WHERE juzNumber = 1;

-- Fast: Uses index
SELECT * FROM QuranAyah WHERE hizbNumber = 5;

-- Fast: Uses unique index
SELECT * FROM QuranAyah WHERE surahNumber = 2 AND ayahNumber = 100;
```

### Caching

Surah list is static and can be cached indefinitely:

```typescript
import { unstable_cache } from "next/cache";

export const getSurahListCached = unstable_cache(
  async () => getSurahList(),
  ["quran-surahs"],
  { revalidate: false } // Never revalidate (static data)
);
```

### Bundle Size

- `quran-ayah-text.json`: 2.5 MB (not sent to client, server-only)
- Boundary files: ~50 KB total (not sent to client)
- Seeded data in database: ~10 MB

---

## Updating Quran Data

**Warning**: Quran data is considered immutable. Updates should only be made to fix errors.

### Process

1. Update source file (`quran-ayah-text.json` or boundary files)
2. Drop and recreate database (or manually delete affected rows)
3. Re-run seed: `pnpm db:seed`
4. Update `quran_dataset_version` and `quran_dataset_import_date` in SystemSetting
5. Create audit log documenting the change

**DO NOT**:
- Change surah/ayah numbers (breaks all references)
- Delete surahs or ayahs (breaks foreign keys)
- Change boundary logic without thorough testing

---

## Data Provenance

- **Surah metadata**: Public domain (names, ayah counts, revelation type)
- **Boundaries**: Standard juz/hizb/quarter divisions used in printed Mushafs
- **Arabic text**: Public domain (Uthmanic script)
- **English translation**: Public domain (various sources, attribution TBD)
- **Page numbers**: Based on 604-page Mushaf layout (Madinah Mushaf)

---

## Testing Quran Data

### Seed Verification

```bash
pnpm db:seed
# Should output:
# Seeded 114 surahs
# Seeded 30 juz
# Seeded 60 hizb
# Seeded 240 quarter-hizbs
# Seeded 6236 ayahs
# Updated 6236 ayahs with Arabic + English text
```

### Query Tests

```typescript
// Test: Al-Fatihah has 7 ayahs
const fatihah = await db.quranSurah.findUnique({ where: { number: 1 } });
expect(fatihah.ayahCount).toBe(7);

// Test: Al-Baqarah 2:1 is in Juz 1
const ayah = await db.quranAyah.findFirst({
  where: { surahNumber: 2, ayahNumber: 1 },
});
expect(ayah.juzNumber).toBe(1);

// Test: Total ayahs = 6236
const total = await db.quranAyah.count();
expect(total).toBe(6236);
```
