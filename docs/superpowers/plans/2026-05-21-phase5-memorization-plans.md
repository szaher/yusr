# Phase 5: Individual Quran Memorization Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build per-student Quran memorization tracking with moderator review/grading (tajweed scores, mistake tracking), configurable meeting cadence, and a student-facing progress dashboard with Juz grid and surah progress bar.

**Architecture:** Same layered pattern as Phases 3–4: Prisma schema → seed data → validation schemas → service layer → server actions → pages. New `StudentMemorizationPlan` tracks each student's journey independently. `MemorizationReview` captures tasmee sessions with nested `ReviewTajweedScore` and `ReviewMistake`. `TajweedCategory` is admin-managed with 6 seeded core categories. Feature-flagged via `MEMORIZATION_PLANS` and per-group opt-in toggle.

**Tech Stack:** Next.js App Router, Prisma 7.8, Zod, shadcn/ui, next-intl, server actions with FormData

---

## Task 1: Add memorization models to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums after the `RecitationResult` enum (around line 276)**

Add these enums after the `RecitationResult` enum block:

```prisma
enum PaceUnit {
  RUB
  HIZB
  PAGE_COUNT
}

enum MeetingCadence {
  WEEKLY
  BIWEEKLY
  TWICE_WEEKLY
  CUSTOM
}

enum MistakeCategory {
  TAJWEED_ERROR
  WRONG_WORD
  HESITATION
  SKIPPED_AYAH
  REPEATED_AYAH
  OTHER
}
```

- [ ] **Step 2: Add new fields to the Group model (around line 184)**

Add these three fields to the `Group` model, before the `active` field:

```prisma
  meetingCadence         MeetingCadence @default(WEEKLY)
  customCadenceDays      Int?
  memorizationPlansEnabled Boolean     @default(false)
```

- [ ] **Step 3: Add TajweedCategory model**

Add before the `// System` section comment:

```prisma
// ============================================================
// Memorization Plans
// ============================================================

model TajweedCategory {
  id        String   @id @default(cuid())
  nameEn    String
  nameAr    String
  isCore    Boolean  @default(false)
  sortOrder Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reviewScores ReviewTajweedScore[]
}
```

- [ ] **Step 4: Add StudentMemorizationPlan model**

Add after `TajweedCategory`:

```prisma
model StudentMemorizationPlan {
  id                String          @id @default(cuid())
  studentId         String
  student           StudentProfile  @relation(fields: [studentId], references: [id])
  groupId           String
  group             Group           @relation(fields: [groupId], references: [id])
  currentSurahId    Int
  currentSurah      QuranSurah      @relation("planCurrentSurah", fields: [currentSurahId], references: [number])
  currentAyahNumber Int
  paceUnit          PaceUnit        @default(RUB)
  paceValue         Decimal         @default(1)
  meetingCadence    MeetingCadence?
  customCadenceDays Int?
  nextReviewDate    DateTime?
  active            Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  reviews MemorizationReview[]

  @@unique([studentId, groupId])
  @@index([studentId])
  @@index([groupId])
}
```

- [ ] **Step 5: Add MemorizationReview model**

Add after `StudentMemorizationPlan`:

```prisma
model MemorizationReview {
  id               String                  @id @default(cuid())
  planId           String
  plan             StudentMemorizationPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  moderatorId      String
  moderator        User                    @relation("reviewModerator", fields: [moderatorId], references: [id])
  sessionId        String?
  session          WeeklySession?          @relation(fields: [sessionId], references: [id])
  reviewDate       DateTime                @default(now())
  fromSurahNumber  Int
  fromAyah         Int
  toSurahNumber    Int
  toAyah           Int
  recitationResult String
  grade            Int
  notes            String?
  voiceNoteUrl     String?
  nextFromSurahNumber Int
  nextFromAyah     Int
  nextToSurahNumber Int
  nextToAyah       Int
  createdAt        DateTime                @default(now())

  fromSurah QuranSurah @relation("reviewFromSurah", fields: [fromSurahNumber], references: [number])
  toSurah   QuranSurah @relation("reviewToSurah", fields: [toSurahNumber], references: [number])
  nextFromSurah QuranSurah @relation("reviewNextFromSurah", fields: [nextFromSurahNumber], references: [number])
  nextToSurah   QuranSurah @relation("reviewNextToSurah", fields: [nextToSurahNumber], references: [number])

  tajweedScores ReviewTajweedScore[]
  mistakes      ReviewMistake[]

  @@index([planId])
  @@index([moderatorId])
  @@index([sessionId])
  @@index([reviewDate])
}
```

- [ ] **Step 6: Add ReviewTajweedScore and ReviewMistake models**

Add after `MemorizationReview`:

```prisma
model ReviewTajweedScore {
  id         String              @id @default(cuid())
  reviewId   String
  review     MemorizationReview  @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  categoryId String
  category   TajweedCategory     @relation(fields: [categoryId], references: [id])
  score      Int
  notes      String?

  @@unique([reviewId, categoryId])
  @@index([reviewId])
}

model ReviewMistake {
  id       String              @id @default(cuid())
  reviewId String
  review   MemorizationReview  @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  category MistakeCategory
  notes    String

  @@index([reviewId])
}
```

- [ ] **Step 7: Add reverse relations to existing models**

Add to `User` model (after `announcements` relation):

```prisma
  memorizationReviews   MemorizationReview[]   @relation("reviewModerator")
```

Add to `StudentProfile` model (after `leaveRequests` relation):

```prisma
  memorizationPlans  StudentMemorizationPlan[]
```

Add to `Group` model (after `sessions` relation):

```prisma
  memorizationPlans  StudentMemorizationPlan[]
```

Add to `WeeklySession` model (after `leaveRequests` relation):

```prisma
  memorizationReviews MemorizationReview[]
```

Add to `QuranSurah` model (after `reviewRangesTo` relation):

```prisma
  planCurrentSurahs    StudentMemorizationPlan[] @relation("planCurrentSurah")
  reviewFromSurahs     MemorizationReview[] @relation("reviewFromSurah")
  reviewToSurahs       MemorizationReview[] @relation("reviewToSurah")
  reviewNextFromSurahs MemorizationReview[] @relation("reviewNextFromSurah")
  reviewNextToSurahs   MemorizationReview[] @relation("reviewNextToSurah")
```

- [ ] **Step 8: Generate Prisma client and push schema**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: Both commands succeed with no errors.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/generated
git commit -m "feat(phase5): add memorization plan, review, tajweed, and mistake models to schema"
```

---

## Task 2: Add permissions, feature flag, and seed tajweed categories

**Files:**
- Modify: `lib/constants/permissions.ts`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add memorization permissions to constants**

In `lib/constants/permissions.ts`, add these entries to the `PERMISSIONS` object (before `} as const`):

```typescript
  MEMORIZATION_VIEW: "memorization.view",
  MEMORIZATION_MANAGE: "memorization.manage",
  MEMORIZATION_REVIEW: "memorization.review",
  TAJWEED_CATEGORIES_MANAGE: "tajweed_categories.manage",
```

Add memorization permissions to the `moderator` role in `ROLE_PERMISSIONS` (after `PERMISSIONS.LEAVE_REQUESTS_REVIEW`):

```typescript
    PERMISSIONS.MEMORIZATION_VIEW,
    PERMISSIONS.MEMORIZATION_MANAGE,
    PERMISSIONS.MEMORIZATION_REVIEW,
```

- [ ] **Step 2: Add seed function for tajweed categories in `prisma/seed.ts`**

Add this function after the existing `seedFeatureFlags` function:

```typescript
async function seedTajweedCategories() {
  const categories = [
    { nameEn: "Makharij", nameAr: "المخارج", sortOrder: 1 },
    { nameEn: "Sifaat", nameAr: "صفات الحروف", sortOrder: 2 },
    { nameEn: "Noon & Meem Rules", nameAr: "أحكام النون والميم", sortOrder: 3 },
    { nameEn: "Madd", nameAr: "المدود", sortOrder: 4 },
    { nameEn: "Waqf", nameAr: "الوقف والابتداء", sortOrder: 5 },
    { nameEn: "General Fluency", nameAr: "الطلاقة العامة", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.tajweedCategory.upsert({
      where: { id: `core-${cat.sortOrder}` },
      update: { nameEn: cat.nameEn, nameAr: cat.nameAr, sortOrder: cat.sortOrder },
      create: {
        id: `core-${cat.sortOrder}`,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        isCore: true,
        sortOrder: cat.sortOrder,
        active: true,
      },
    });
  }
  console.log("Seeded 6 core tajweed categories");
}
```

- [ ] **Step 3: Add `memorization_plans` feature flag to the `seedFeatureFlags` function**

Add this entry to the `flags` array inside `seedFeatureFlags()`:

```typescript
    { key: "memorization_plans", enabled: true, description: "Individual student memorization plan tracking" },
```

- [ ] **Step 4: Call `seedTajweedCategories()` in the main seed function**

Add `await seedTajweedCategories();` after the existing `await seedFeatureFlags();` call in the `main()` function.

- [ ] **Step 5: Run seed**

```bash
npx prisma db seed
```

Expected: Output includes "Seeded 6 core tajweed categories" and the new permissions are seeded.

- [ ] **Step 6: Commit**

```bash
git add lib/constants/permissions.ts prisma/seed.ts
git commit -m "feat(phase5): add memorization permissions, feature flag, and tajweed category seed data"
```

---

## Task 3: Add validation schemas

**Files:**
- Create: `lib/validations/memorization.ts`

- [ ] **Step 1: Create the validation schemas file**

Create `lib/validations/memorization.ts`:

```typescript
import { z } from "zod";

const paceUnitEnum = z.enum(["RUB", "HIZB", "PAGE_COUNT"]);
const meetingCadenceEnum = z.enum(["WEEKLY", "BIWEEKLY", "TWICE_WEEKLY", "CUSTOM"]);
const recitationResultEnum = z.enum([
  "EXCELLENT",
  "GOOD",
  "ACCEPTABLE",
  "NEEDS_IMPROVEMENT",
  "FAILED",
]);
const mistakeCategoryEnum = z.enum([
  "TAJWEED_ERROR",
  "WRONG_WORD",
  "HESITATION",
  "SKIPPED_AYAH",
  "REPEATED_AYAH",
  "OTHER",
]);

export const createPlanSchema = z
  .object({
    studentId: z.string().min(1),
    groupId: z.string().min(1),
    surahNumber: z.coerce.number().int().min(1).max(114),
    ayahNumber: z.coerce.number().int().min(1),
    paceUnit: paceUnitEnum,
    paceValue: z.coerce.number().min(1),
    meetingCadence: meetingCadenceEnum.optional(),
    customCadenceDays: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.paceUnit === "PAGE_COUNT" && data.paceValue < 1.5) return false;
      return true;
    },
    { message: "Page count pace must be at least 1.5", path: ["paceValue"] }
  );

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z
  .object({
    planId: z.string().min(1),
    paceUnit: paceUnitEnum.optional(),
    paceValue: z.coerce.number().min(1).optional(),
    meetingCadence: meetingCadenceEnum.nullable().optional(),
    customCadenceDays: z.coerce.number().int().min(1).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.paceUnit === "PAGE_COUNT" && data.paceValue != null && data.paceValue < 1.5) return false;
      return true;
    },
    { message: "Page count pace must be at least 1.5", path: ["paceValue"] }
  );

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

const tajweedScoreSchema = z.object({
  categoryId: z.string().min(1),
  score: z.coerce.number().int().min(1).max(10),
  notes: z.string().optional(),
});

const mistakeSchema = z.object({
  category: mistakeCategoryEnum,
  notes: z.string().min(1),
});

export const createReviewSchema = z.object({
  planId: z.string().min(1),
  sessionId: z.string().optional(),
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyah: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyah: z.coerce.number().int().min(1),
  recitationResult: recitationResultEnum,
  grade: z.coerce.number().int().min(0).max(100),
  notes: z.string().optional(),
  voiceNoteUrl: z.string().url().optional().or(z.literal("")),
  nextFromSurahNumber: z.coerce.number().int().min(1).max(114),
  nextFromAyah: z.coerce.number().int().min(1),
  nextToSurahNumber: z.coerce.number().int().min(1).max(114),
  nextToAyah: z.coerce.number().int().min(1),
  tajweedScores: z.array(tajweedScoreSchema).optional(),
  mistakes: z.array(mistakeSchema).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type TajweedScoreInput = z.infer<typeof tajweedScoreSchema>;
export type MistakeInput = z.infer<typeof mistakeSchema>;

export const tajweedCategorySchema = z.object({
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  sortOrder: z.coerce.number().int().min(0),
});

export type TajweedCategoryInput = z.infer<typeof tajweedCategorySchema>;

export const updateGroupCadenceSchema = z.object({
  groupId: z.string().min(1),
  meetingCadence: meetingCadenceEnum,
  customCadenceDays: z.coerce.number().int().min(1).optional(),
  memorizationPlansEnabled: z.coerce.boolean(),
});

export type UpdateGroupCadenceInput = z.infer<typeof updateGroupCadenceSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors related to `memorization.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/memorization.ts
git commit -m "feat(phase5): add memorization validation schemas"
```

---

## Task 4: Add i18n translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add `memorization` namespace and nav key to `messages/en.json`**

Add `"memorization"` nav key to the `nav` object:

```json
"memorization": "Memorization"
```

Add a new top-level `"memorization"` namespace:

```json
"memorization": {
  "title": "Memorization Plans",
  "plan": {
    "title": "Memorization Plan",
    "currentPosition": "Current Position",
    "surah": "Surah",
    "ayah": "Ayah",
    "juz": "Juz",
    "hizb": "Hizb",
    "rub": "Rub'",
    "page": "Page",
    "paceUnit": "Pace Unit",
    "paceValue": "Amount per Review",
    "paceRub": "Rub' (Quarter Hizb)",
    "paceHizb": "Hizb (Half Juz)",
    "pacePageCount": "Page Count",
    "noPlan": "No memorization plan set up for this student yet.",
    "createPlan": "Create Memorization Plan",
    "editPlan": "Edit Plan Settings",
    "savePlan": "Save Plan",
    "initialPosition": "Starting Position",
    "overallProgress": "Overall Progress",
    "nextHomework": "Next Homework",
    "nextReview": "Next Review",
    "active": "Active",
    "inactive": "Inactive"
  },
  "review": {
    "title": "Memorization Review",
    "newReview": "New Review",
    "reviewHistory": "Review History",
    "rangeReviewed": "Range Reviewed",
    "from": "From",
    "to": "To",
    "recitationResult": "Recitation Result",
    "resultExcellent": "Excellent",
    "resultGood": "Good",
    "resultAcceptable": "Acceptable",
    "resultNeedsImprovement": "Needs Improvement",
    "resultFailed": "Failed",
    "grade": "Grade",
    "notes": "Notes",
    "voiceNote": "Voice Note",
    "nextHomework": "Next Homework (Auto-suggested)",
    "saveReview": "Save Review & Update Position",
    "noReviews": "No reviews yet.",
    "date": "Date",
    "range": "Range",
    "result": "Result",
    "mistakes": "Mistakes",
    "mistakeCount": "Mistakes",
    "openReview": "Open Memorization Review",
    "reviewDetail": "Review Detail"
  },
  "tajweed": {
    "title": "Tajweed Categories",
    "scores": "Tajweed Scores",
    "category": "Category",
    "score": "Score",
    "addCategory": "Add Category",
    "editCategory": "Edit Category",
    "nameEn": "Name (English)",
    "nameAr": "Name (Arabic)",
    "sortOrder": "Sort Order",
    "core": "Core",
    "custom": "Custom",
    "save": "Save",
    "noCategories": "No tajweed categories configured.",
    "currentFocus": "Current Tajweed Focus"
  },
  "mistake": {
    "title": "Mistakes",
    "addMistake": "Add Mistake",
    "category": "Category",
    "tajweedError": "Tajweed Error",
    "wrongWord": "Wrong Word",
    "hesitation": "Hesitation",
    "skippedAyah": "Skipped Ayah",
    "repeatedAyah": "Repeated Ayah",
    "other": "Other",
    "note": "Note"
  },
  "cadence": {
    "title": "Meeting Cadence",
    "groupDefault": "Group Default",
    "studentOverride": "Student Override",
    "weekly": "Weekly",
    "biweekly": "Biweekly",
    "twiceWeekly": "Twice a Week",
    "custom": "Custom",
    "customDays": "Days between reviews",
    "inheritGroup": "Inherit from group"
  },
  "dashboard": {
    "title": "Memorization Journey",
    "currentlyMemorizing": "Currently Memorizing",
    "juzGrid": "Juz Progress",
    "surahProgress": "Current Surah Progress",
    "recentReviews": "Recent Reviews",
    "completed": "Completed",
    "inProgress": "In Progress",
    "notStarted": "Not Started",
    "youAreHere": "you are here",
    "ofQuran": "of the Holy Quran",
    "lastReview": "Last Review",
    "juzDetail": "Juz Detail",
    "ayahs": "ayahs"
  },
  "search": {
    "placeholder": "Search student...",
    "noResults": "No students found."
  }
}
```

- [ ] **Step 2: Add corresponding Arabic translations to `messages/ar.json`**

Add `"memorization"` nav key to the `nav` object:

```json
"memorization": "الحفظ"
```

Add a new top-level `"memorization"` namespace with the same structure, Arabic values:

```json
"memorization": {
  "title": "خطط الحفظ",
  "plan": {
    "title": "خطة الحفظ",
    "currentPosition": "الموقع الحالي",
    "surah": "السورة",
    "ayah": "الآية",
    "juz": "الجزء",
    "hizb": "الحزب",
    "rub": "الربع",
    "page": "الصفحة",
    "paceUnit": "وحدة السرعة",
    "paceValue": "المقدار لكل مراجعة",
    "paceRub": "ربع (ربع حزب)",
    "paceHizb": "حزب (نصف جزء)",
    "pacePageCount": "عدد الصفحات",
    "noPlan": "لم يتم إعداد خطة حفظ لهذا الطالب بعد.",
    "createPlan": "إنشاء خطة حفظ",
    "editPlan": "تعديل إعدادات الخطة",
    "savePlan": "حفظ الخطة",
    "initialPosition": "موقع البداية",
    "overallProgress": "التقدم العام",
    "nextHomework": "الواجب القادم",
    "nextReview": "المراجعة القادمة",
    "active": "نشط",
    "inactive": "غير نشط"
  },
  "review": {
    "title": "مراجعة الحفظ",
    "newReview": "مراجعة جديدة",
    "reviewHistory": "سجل المراجعات",
    "rangeReviewed": "النطاق المُراجع",
    "from": "من",
    "to": "إلى",
    "recitationResult": "نتيجة التسميع",
    "resultExcellent": "ممتاز",
    "resultGood": "جيد",
    "resultAcceptable": "مقبول",
    "resultNeedsImprovement": "يحتاج تحسين",
    "resultFailed": "راسب",
    "grade": "الدرجة",
    "notes": "الملاحظات",
    "voiceNote": "مذكرة صوتية",
    "nextHomework": "الواجب القادم (مقترح تلقائياً)",
    "saveReview": "حفظ المراجعة وتحديث الموقع",
    "noReviews": "لا توجد مراجعات بعد.",
    "date": "التاريخ",
    "range": "النطاق",
    "result": "النتيجة",
    "mistakes": "الأخطاء",
    "mistakeCount": "الأخطاء",
    "openReview": "فتح مراجعة الحفظ",
    "reviewDetail": "تفاصيل المراجعة"
  },
  "tajweed": {
    "title": "فئات التجويد",
    "scores": "درجات التجويد",
    "category": "الفئة",
    "score": "الدرجة",
    "addCategory": "إضافة فئة",
    "editCategory": "تعديل الفئة",
    "nameEn": "الاسم (إنجليزي)",
    "nameAr": "الاسم (عربي)",
    "sortOrder": "ترتيب العرض",
    "core": "أساسي",
    "custom": "مخصص",
    "save": "حفظ",
    "noCategories": "لم يتم تكوين فئات تجويد.",
    "currentFocus": "التركيز الحالي للتجويد"
  },
  "mistake": {
    "title": "الأخطاء",
    "addMistake": "إضافة خطأ",
    "category": "الفئة",
    "tajweedError": "خطأ تجويد",
    "wrongWord": "كلمة خاطئة",
    "hesitation": "تردد",
    "skippedAyah": "آية محذوفة",
    "repeatedAyah": "آية مكررة",
    "other": "أخرى",
    "note": "ملاحظة"
  },
  "cadence": {
    "title": "وتيرة اللقاءات",
    "groupDefault": "الافتراضي للمجموعة",
    "studentOverride": "تخصيص الطالب",
    "weekly": "أسبوعياً",
    "biweekly": "كل أسبوعين",
    "twiceWeekly": "مرتين أسبوعياً",
    "custom": "مخصص",
    "customDays": "عدد الأيام بين المراجعات",
    "inheritGroup": "وراثة من المجموعة"
  },
  "dashboard": {
    "title": "رحلة الحفظ",
    "currentlyMemorizing": "يحفظ حالياً",
    "juzGrid": "تقدم الأجزاء",
    "surahProgress": "تقدم السورة الحالية",
    "recentReviews": "المراجعات الأخيرة",
    "completed": "مكتمل",
    "inProgress": "قيد التنفيذ",
    "notStarted": "لم يبدأ",
    "youAreHere": "أنت هنا",
    "ofQuran": "من القرآن الكريم",
    "lastReview": "آخر مراجعة",
    "juzDetail": "تفاصيل الجزء",
    "ayahs": "آيات"
  },
  "search": {
    "placeholder": "ابحث عن طالب...",
    "noResults": "لم يتم العثور على طلاب."
  }
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('messages/en.json')); json.load(open('messages/ar.json')); print('Both JSON files valid')"
```

Expected: "Both JSON files valid"

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(phase5): add memorization i18n translations for English and Arabic"
```

---

## Task 5: Add tajweed category service

**Files:**
- Create: `server/services/tajweed-category.ts`

- [ ] **Step 1: Create the service file**

Create `server/services/tajweed-category.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { TajweedCategoryInput } from "@/lib/validations/memorization";

export async function listTajweedCategories(includeInactive = false) {
  return db.tajweedCategory.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTajweedCategory(
  input: TajweedCategoryInput,
  actorId: string
) {
  const category = await db.tajweedCategory.create({
    data: {
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      sortOrder: input.sortOrder,
      isCore: false,
      active: true,
    },
  });

  await createAuditLog({
    actorId,
    action: "tajweed_category.create",
    entityType: "TajweedCategory",
    entityId: category.id,
    metadata: { nameEn: input.nameEn, nameAr: input.nameAr },
  });

  return category;
}

export async function updateTajweedCategory(
  id: string,
  input: TajweedCategoryInput,
  actorId: string
) {
  const category = await db.tajweedCategory.update({
    where: { id },
    data: {
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      sortOrder: input.sortOrder,
    },
  });

  await createAuditLog({
    actorId,
    action: "tajweed_category.update",
    entityType: "TajweedCategory",
    entityId: id,
    metadata: { nameEn: input.nameEn, nameAr: input.nameAr },
  });

  return category;
}

export async function toggleTajweedCategoryActive(
  id: string,
  actorId: string
) {
  const existing = await db.tajweedCategory.findUnique({ where: { id } });
  if (!existing) throw new Error("Category not found");

  const updated = await db.tajweedCategory.update({
    where: { id },
    data: { active: !existing.active },
  });

  await createAuditLog({
    actorId,
    action: existing.active ? "tajweed_category.deactivate" : "tajweed_category.activate",
    entityType: "TajweedCategory",
    entityId: id,
    metadata: { active: updated.active },
  });

  return updated;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/tajweed-category.ts
git commit -m "feat(phase5): add tajweed category service"
```

---

## Task 6: Add memorization plan service

**Files:**
- Create: `server/services/memorization-plan.ts`

- [ ] **Step 1: Create the plan service**

Create `server/services/memorization-plan.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreatePlanInput, UpdatePlanInput } from "@/lib/validations/memorization";
import type { Decimal } from "@/prisma/generated/prisma/runtime/library";

export async function createPlan(input: CreatePlanInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.create({
    data: {
      studentId: input.studentId,
      groupId: input.groupId,
      currentSurahId: input.surahNumber,
      currentAyahNumber: input.ayahNumber,
      paceUnit: input.paceUnit,
      paceValue: input.paceValue,
      meetingCadence: input.meetingCadence || null,
      customCadenceDays: input.customCadenceDays || null,
    },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.create",
    entityType: "StudentMemorizationPlan",
    entityId: plan.id,
    metadata: {
      studentId: input.studentId,
      groupId: input.groupId,
      surah: input.surahNumber,
      ayah: input.ayahNumber,
    },
  });

  return plan;
}

export async function updatePlan(input: UpdatePlanInput, actorId: string) {
  const data: Record<string, unknown> = {};
  if (input.paceUnit !== undefined) data.paceUnit = input.paceUnit;
  if (input.paceValue !== undefined) data.paceValue = input.paceValue;
  if (input.meetingCadence !== undefined) data.meetingCadence = input.meetingCadence;
  if (input.customCadenceDays !== undefined) data.customCadenceDays = input.customCadenceDays;

  const plan = await db.studentMemorizationPlan.update({
    where: { id: input.planId },
    data,
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.update",
    entityType: "StudentMemorizationPlan",
    entityId: input.planId,
    metadata: data,
  });

  return plan;
}

export async function getPlanByStudent(studentId: string, groupId: string) {
  return db.studentMemorizationPlan.findUnique({
    where: { studentId_groupId: { studentId, groupId } },
    include: {
      currentSurah: { select: { number: true, nameAr: true, nameEn: true, ayahCount: true } },
      group: {
        select: {
          id: true,
          name: true,
          meetingCadence: true,
          customCadenceDays: true,
        },
      },
    },
  });
}

export async function getPlansForGroup(groupId: string) {
  return db.studentMemorizationPlan.findMany({
    where: { groupId, active: true },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, nameAr: true } },
        },
      },
      currentSurah: { select: { number: true, nameAr: true, nameEn: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { student: { user: { name: "asc" } } },
  });
}

export async function getPlansForModerator(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { where: { memorizationPlansEnabled: true }, select: { id: true, name: true } } },
  });

  if (!profile || profile.groups.length === 0) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.studentMemorizationPlan.findMany({
    where: { groupId: { in: groupIds }, active: true },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, nameAr: true } },
        },
      },
      currentSurah: { select: { number: true, nameAr: true, nameEn: true } },
      group: { select: { id: true, name: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getStudentProgress(planId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: { currentSurahId: true, currentAyahNumber: true },
  });

  if (!plan) return null;

  const currentAyah = await db.quranAyah.findUnique({
    where: {
      surahNumber_ayahNumber: {
        surahNumber: plan.currentSurahId,
        ayahNumber: plan.currentAyahNumber,
      },
    },
    select: { juzNumber: true, hizbNumber: true, quarterNumber: true, pageNumber: true },
  });

  if (!currentAyah) return null;

  const totalAyahs = await db.quranAyah.count();
  const completedAyahs = await db.quranAyah.count({
    where: {
      OR: [
        { surahNumber: { lt: plan.currentSurahId } },
        {
          surahNumber: plan.currentSurahId,
          ayahNumber: { lt: plan.currentAyahNumber },
        },
      ],
    },
  });

  const percentage = totalAyahs > 0 ? Math.round((completedAyahs / totalAyahs) * 1000) / 10 : 0;

  return {
    juz: currentAyah.juzNumber,
    hizb: currentAyah.hizbNumber,
    quarter: currentAyah.quarterNumber,
    page: currentAyah.pageNumber,
    percentage,
    completedAyahs,
    totalAyahs,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/memorization-plan.ts
git commit -m "feat(phase5): add memorization plan service"
```

---

## Task 7: Add memorization review service

**Files:**
- Create: `server/services/memorization-review.ts`

- [ ] **Step 1: Create the review service**

Create `server/services/memorization-review.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateReviewInput } from "@/lib/validations/memorization";
import type { MeetingCadence } from "@/prisma/generated/prisma/enums";

function calculateNextReviewDate(
  fromDate: Date,
  cadence: MeetingCadence,
  customDays: number | null
): Date {
  const next = new Date(fromDate);
  switch (cadence) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "TWICE_WEEKLY":
      next.setDate(next.getDate() + 3);
      break;
    case "CUSTOM":
      next.setDate(next.getDate() + (customDays || 7));
      break;
  }
  return next;
}

export async function createReview(input: CreateReviewInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: input.planId },
    include: {
      group: { select: { meetingCadence: true, customCadenceDays: true } },
    },
  });

  if (!plan) throw new Error("Plan not found");

  const effectiveCadence = plan.meetingCadence || plan.group.meetingCadence;
  const effectiveCustomDays = plan.customCadenceDays || plan.group.customCadenceDays;
  const reviewDate = new Date();
  const nextReviewDate = calculateNextReviewDate(reviewDate, effectiveCadence, effectiveCustomDays);

  return db.$transaction(async (tx) => {
    const review = await tx.memorizationReview.create({
      data: {
        planId: input.planId,
        moderatorId: actorId,
        sessionId: input.sessionId || null,
        reviewDate,
        fromSurahNumber: input.fromSurahNumber,
        fromAyah: input.fromAyah,
        toSurahNumber: input.toSurahNumber,
        toAyah: input.toAyah,
        recitationResult: input.recitationResult,
        grade: input.grade,
        notes: input.notes || null,
        voiceNoteUrl: input.voiceNoteUrl || null,
        nextFromSurahNumber: input.nextFromSurahNumber,
        nextFromAyah: input.nextFromAyah,
        nextToSurahNumber: input.nextToSurahNumber,
        nextToAyah: input.nextToAyah,
      },
    });

    if (input.tajweedScores && input.tajweedScores.length > 0) {
      await tx.reviewTajweedScore.createMany({
        data: input.tajweedScores.map((ts) => ({
          reviewId: review.id,
          categoryId: ts.categoryId,
          score: ts.score,
          notes: ts.notes || null,
        })),
      });
    }

    if (input.mistakes && input.mistakes.length > 0) {
      await tx.reviewMistake.createMany({
        data: input.mistakes.map((m) => ({
          reviewId: review.id,
          category: m.category,
          notes: m.notes,
        })),
      });
    }

    await tx.studentMemorizationPlan.update({
      where: { id: input.planId },
      data: {
        currentSurahId: input.toSurahNumber,
        currentAyahNumber: input.toAyah,
        nextReviewDate,
      },
    });

    await createAuditLog({
      actorId,
      action: "memorization_review.create",
      entityType: "MemorizationReview",
      entityId: review.id,
      metadata: {
        planId: input.planId,
        grade: input.grade,
        recitationResult: input.recitationResult,
      },
    });

    return review;
  });
}

export async function getReviewsByPlan(planId: string) {
  return db.memorizationReview.findMany({
    where: { planId },
    include: {
      fromSurah: { select: { nameAr: true, nameEn: true } },
      toSurah: { select: { nameAr: true, nameEn: true } },
      _count: { select: { mistakes: true } },
    },
    orderBy: { reviewDate: "desc" },
  });
}

export async function getReviewDetail(reviewId: string) {
  return db.memorizationReview.findUnique({
    where: { id: reviewId },
    include: {
      fromSurah: { select: { nameAr: true, nameEn: true } },
      toSurah: { select: { nameAr: true, nameEn: true } },
      nextFromSurah: { select: { nameAr: true, nameEn: true } },
      nextToSurah: { select: { nameAr: true, nameEn: true } },
      moderator: { select: { name: true, nameAr: true } },
      tajweedScores: {
        include: { category: { select: { nameEn: true, nameAr: true } } },
        orderBy: { category: { sortOrder: "asc" } },
      },
      mistakes: { orderBy: { id: "asc" } },
    },
  });
}

export async function calculateNextHomework(planId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: {
      currentSurahId: true,
      currentAyahNumber: true,
      paceUnit: true,
      paceValue: true,
    },
  });

  if (!plan) return null;

  const currentAyah = await db.quranAyah.findUnique({
    where: {
      surahNumber_ayahNumber: {
        surahNumber: plan.currentSurahId,
        ayahNumber: plan.currentAyahNumber,
      },
    },
    select: { quarterNumber: true, hizbNumber: true, pageNumber: true },
  });

  if (!currentAyah) return null;

  const paceValue = Number(plan.paceValue);
  let endAyah: { surahNumber: number; ayahNumber: number } | null = null;

  if (plan.paceUnit === "RUB") {
    const targetQuarter = currentAyah.quarterNumber + paceValue;
    const targetAyah = await db.quranAyah.findFirst({
      where: { quarterNumber: { gte: Math.ceil(targetQuarter) } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  } else if (plan.paceUnit === "HIZB") {
    const targetHizb = currentAyah.hizbNumber + paceValue;
    const targetAyah = await db.quranAyah.findFirst({
      where: { hizbNumber: { gte: Math.ceil(targetHizb) } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  } else if (plan.paceUnit === "PAGE_COUNT" && currentAyah.pageNumber) {
    const targetPage = currentAyah.pageNumber + Math.ceil(paceValue);
    const targetAyah = await db.quranAyah.findFirst({
      where: { pageNumber: { gte: targetPage } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  }

  if (!endAyah) {
    endAyah = { surahNumber: 114, ayahNumber: 6 };
  }

  return {
    fromSurahNumber: plan.currentSurahId,
    fromAyah: plan.currentAyahNumber,
    toSurahNumber: endAyah.surahNumber,
    toAyah: endAyah.ayahNumber,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/memorization-review.ts
git commit -m "feat(phase5): add memorization review service with auto-suggestion and cadence calculation"
```

---

## Task 8: Add server actions

**Files:**
- Create: `server/actions/memorization.ts`

- [ ] **Step 1: Create the server actions file**

Create `server/actions/memorization.ts`:

```typescript
"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createPlan,
  updatePlan,
} from "@/server/services/memorization-plan";
import { createReview } from "@/server/services/memorization-review";
import {
  createTajweedCategory,
  updateTajweedCategory,
  toggleTajweedCategoryActive,
} from "@/server/services/tajweed-category";
import {
  createPlanSchema,
  updatePlanSchema,
  createReviewSchema,
  tajweedCategorySchema,
  updateGroupCadenceSchema,
} from "@/lib/validations/memorization";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { createAuditLog } from "@/server/services/audit-log";

export async function createPlanAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createPlan(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function updatePlanAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updatePlan(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function createReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_REVIEW);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const tajweedScores: Array<{ categoryId: string; score: number; notes?: string }> = [];
  let i = 0;
  while (raw[`tajweedScores.${i}.categoryId`]) {
    tajweedScores.push({
      categoryId: raw[`tajweedScores.${i}.categoryId`] as string,
      score: Number(raw[`tajweedScores.${i}.score`]),
      notes: (raw[`tajweedScores.${i}.notes`] as string) || undefined,
    });
    i++;
  }

  const mistakes: Array<{ category: string; notes: string }> = [];
  let j = 0;
  while (raw[`mistakes.${j}.category`]) {
    mistakes.push({
      category: raw[`mistakes.${j}.category`] as string,
      notes: raw[`mistakes.${j}.notes`] as string,
    });
    j++;
  }

  const input = {
    planId: raw.planId as string,
    sessionId: (raw.sessionId as string) || undefined,
    fromSurahNumber: Number(raw.fromSurahNumber),
    fromAyah: Number(raw.fromAyah),
    toSurahNumber: Number(raw.toSurahNumber),
    toAyah: Number(raw.toAyah),
    recitationResult: raw.recitationResult as string,
    grade: Number(raw.grade),
    notes: (raw.notes as string) || undefined,
    voiceNoteUrl: (raw.voiceNoteUrl as string) || undefined,
    nextFromSurahNumber: Number(raw.nextFromSurahNumber),
    nextFromAyah: Number(raw.nextFromAyah),
    nextToSurahNumber: Number(raw.nextToSurahNumber),
    nextToAyah: Number(raw.nextToAyah),
    tajweedScores: tajweedScores.length > 0 ? tajweedScores : undefined,
    mistakes: mistakes.length > 0 ? mistakes : undefined,
  };

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createReview(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  revalidatePath("/ar/student/grades");
  revalidatePath("/en/student/grades");
  return { success: true };
}

export async function createTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = tajweedCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  await createTajweedCategory(parsed.data, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function updateTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData.entries());
  const parsed = tajweedCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  await updateTajweedCategory(id, parsed.data, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function toggleTajweedCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TAJWEED_CATEGORIES_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  await toggleTajweedCategoryActive(id, session.user.id);

  revalidatePath("/ar/admin/settings/tajweed-categories");
  revalidatePath("/en/admin/settings/tajweed-categories");
  return { success: true };
}

export async function updateGroupCadenceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.GROUPS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateGroupCadenceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  await db.group.update({
    where: { id: parsed.data.groupId },
    data: {
      meetingCadence: parsed.data.meetingCadence,
      customCadenceDays: parsed.data.customCadenceDays || null,
      memorizationPlansEnabled: parsed.data.memorizationPlansEnabled,
    },
  });

  await createAuditLog({
    actorId: session.user.id,
    action: "group.update_cadence",
    entityType: "Group",
    entityId: parsed.data.groupId,
    metadata: {
      meetingCadence: parsed.data.meetingCadence,
      memorizationPlansEnabled: parsed.data.memorizationPlansEnabled,
    },
  });

  revalidatePath("/ar/moderator/groups");
  revalidatePath("/en/moderator/groups");
  revalidatePath("/ar/admin/groups");
  revalidatePath("/en/admin/groups");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/actions/memorization.ts
git commit -m "feat(phase5): add memorization server actions"
```

---

## Task 9: Add sidebar navigation entries

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add BookOpenCheck icon import**

Add `BookOpenCheck` to the lucide-react import in `components/layout/sidebar.tsx`:

```typescript
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookOpenCheck,
  Settings,
  // ... rest unchanged
} from "lucide-react";
```

- [ ] **Step 2: Add memorization nav item to moderatorNav**

Add after the `sessions` entry in `moderatorNav`:

```typescript
  { labelKey: "memorization", href: "/moderator/memorization", icon: BookOpenCheck },
```

- [ ] **Step 3: Add memorization nav item to studentNav**

Add after the `grades` entry in `studentNav`:

```typescript
  { labelKey: "memorization", href: "/student/memorization", icon: BookOpenCheck },
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(phase5): add memorization nav items to sidebar"
```

---

## Task 10: Add admin tajweed categories page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/settings/tajweed-categories/page.tsx`

- [ ] **Step 1: Create the admin tajweed categories page**

Create `app/[locale]/(dashboard)/admin/settings/tajweed-categories/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { listTajweedCategories } from "@/server/services/tajweed-category";
import {
  createTajweedCategoryAction,
  updateTajweedCategoryAction,
  toggleTajweedCategoryAction,
} from "@/server/actions/memorization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const createCategory = createTajweedCategoryAction as unknown as (formData: FormData) => void;
const updateCategory = updateTajweedCategoryAction as unknown as (formData: FormData) => void;
const toggleCategory = toggleTajweedCategoryAction as unknown as (formData: FormData) => void;

export default async function TajweedCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization.tajweed");
  const categories = await listTajweedCategories(true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("addCategory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t("nameEn")}</Label>
              <Input id="nameEn" name="nameEn" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameAr">{t("nameAr")}</Label>
              <Input id="nameAr" name="nameAr" required dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
              <div className="flex gap-2">
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue={categories.length + 1}
                />
                <Button type="submit">{t("save")}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("nameEn")}</TableHead>
            <TableHead>{t("nameAr")}</TableHead>
            <TableHead>{t("sortOrder")}</TableHead>
            <TableHead>{t("category")}</TableHead>
            <TableHead>{t("score")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id} className={cat.active ? "" : "opacity-50"}>
              <TableCell>{cat.nameEn}</TableCell>
              <TableCell dir="rtl">{cat.nameAr}</TableCell>
              <TableCell>{cat.sortOrder}</TableCell>
              <TableCell>
                <Badge className={cat.isCore ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                  {cat.isCore ? t("core") : t("custom")}
                </Badge>
              </TableCell>
              <TableCell>
                <form action={toggleCategory} className="inline">
                  <input type="hidden" name="id" value={cat.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {cat.active ? "✓" : "✗"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noCategories")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/settings/tajweed-categories/page.tsx"
git commit -m "feat(phase5): add admin tajweed categories management page"
```

---

## Task 11: Add moderator memorization plans list page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/memorization/page.tsx`

- [ ] **Step 1: Create the moderator memorization list page**

Create `app/[locale]/(dashboard)/moderator/memorization/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlansForModerator } from "@/server/services/memorization-plan";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ModeratorMemorizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("memorization");
  const plans = await getPlansForModerator(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {plans.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "ar" ? "الطالب" : "Student"}</TableHead>
              <TableHead>{t("plan.surah")}</TableHead>
              <TableHead>{t("plan.ayah")}</TableHead>
              <TableHead>{t("plan.nextReview")}</TableHead>
              <TableHead>{t("review.reviewHistory")}</TableHead>
              <TableHead>{locale === "ar" ? "المجموعة" : "Group"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const studentName =
                locale === "ar"
                  ? plan.student.user.nameAr || plan.student.user.name
                  : plan.student.user.name;
              const surahName =
                locale === "ar"
                  ? plan.currentSurah.nameAr
                  : plan.currentSurah.nameEn;

              return (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/memorization/${plan.student.userId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {studentName}
                    </Link>
                  </TableCell>
                  <TableCell>{surahName}</TableCell>
                  <TableCell>{plan.currentAyahNumber}</TableCell>
                  <TableCell>
                    {plan.nextReviewDate
                      ? new Date(plan.nextReviewDate).toLocaleDateString(locale)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-gray-100 text-gray-800">
                      {plan._count.reviews}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.group?.name}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/memorization/page.tsx"
git commit -m "feat(phase5): add moderator memorization plans list page"
```

---

## Task 12: Add moderator student plan detail page with create plan form

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/memorization/[studentId]/page.tsx`

- [ ] **Step 1: Create the student plan detail page**

Create `app/[locale]/(dashboard)/moderator/memorization/[studentId]/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlanByStudent, getStudentProgress } from "@/server/services/memorization-plan";
import { getReviewsByPlan } from "@/server/services/memorization-review";
import { createPlanAction, updatePlanAction } from "@/server/actions/memorization";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const createPlan = createPlanAction as unknown as (formData: FormData) => void;
const updatePlan = updatePlanAction as unknown as (formData: FormData) => void;

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function ModeratorStudentPlanPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: { select: { name: true, nameAr: true } },
      groupStudents: {
        include: { group: { select: { id: true, name: true, memorizationPlansEnabled: true } } },
      },
    },
  });

  if (!studentProfile) notFound();

  const studentName =
    locale === "ar"
      ? studentProfile.user.nameAr || studentProfile.user.name
      : studentProfile.user.name;

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );

  const surahs = await db.quranSurah.findMany({ orderBy: { number: "asc" } });

  if (!enabledGroup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = await getPlanByStudent(studentProfile.id, enabledGroup.group.id);

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("plan.createPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPlan} className="grid gap-4">
              <input type="hidden" name="studentId" value={studentProfile.id} />
              <input type="hidden" name="groupId" value={enabledGroup.group.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("plan.surah")}</Label>
                  <select
                    name="surahNumber"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("plan.ayah")}</Label>
                  <Input name="ayahNumber" type="number" min="1" defaultValue="1" required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("plan.paceUnit")}</Label>
                  <select
                    name="paceUnit"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RUB">{t("plan.paceRub")}</option>
                    <option value="HIZB">{t("plan.paceHizb")}</option>
                    <option value="PAGE_COUNT">{t("plan.pacePageCount")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("plan.paceValue")}</Label>
                  <Input name="paceValue" type="number" step="0.5" min="1" defaultValue="1" required />
                </div>
              </div>

              <Button type="submit">{t("plan.savePlan")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [progress, reviews] = await Promise.all([
    getStudentProgress(plan.id),
    getReviewsByPlan(plan.id),
  ]);

  const surahName =
    locale === "ar" ? plan.currentSurah.nameAr : plan.currentSurah.nameEn;

  const getResultText = (result: string) => {
    const map: Record<string, string> = {
      EXCELLENT: t("review.resultExcellent"),
      GOOD: t("review.resultGood"),
      ACCEPTABLE: t("review.resultAcceptable"),
      NEEDS_IMPROVEMENT: t("review.resultNeedsImprovement"),
      FAILED: t("review.resultFailed"),
    };
    return map[result] || result;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{studentName}</h1>
        <Link href={`/${locale}/moderator/memorization/${studentId}/review`}>
          <Button>{t("review.newReview")}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.currentPosition")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("plan.surah")}</Label>
              <p className="text-sm font-semibold">{surahName}</p>
            </div>
            <div>
              <Label>{t("plan.ayah")}</Label>
              <p className="text-sm font-semibold">
                {plan.currentAyahNumber} / {plan.currentSurah.ayahCount}
              </p>
            </div>
            <div>
              <Label>{t("plan.juz")}</Label>
              <p className="text-sm font-semibold">
                {progress?.juz ?? "—"} / 30
              </p>
            </div>
            <div>
              <Label>{t("plan.overallProgress")}</Label>
              <p className="text-sm font-semibold">
                {progress?.percentage ?? 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.editPlan")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePlan} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="planId" value={plan.id} />
            <div className="space-y-2">
              <Label>{t("plan.paceUnit")}</Label>
              <select
                name="paceUnit"
                defaultValue={plan.paceUnit}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="RUB">{t("plan.paceRub")}</option>
                <option value="HIZB">{t("plan.paceHizb")}</option>
                <option value="PAGE_COUNT">{t("plan.pacePageCount")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("plan.paceValue")}</Label>
              <Input
                name="paceValue"
                type="number"
                step="0.5"
                min="1"
                defaultValue={String(plan.paceValue)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">{t("plan.savePlan")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("review.reviewHistory")}</h2>
        {reviews.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("review.date")}</TableHead>
                <TableHead>{t("review.range")}</TableHead>
                <TableHead>{t("review.result")}</TableHead>
                <TableHead>{t("review.grade")}</TableHead>
                <TableHead>{t("review.mistakeCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((rev) => {
                const fromName = locale === "ar" ? rev.fromSurah.nameAr : rev.fromSurah.nameEn;
                const toName = locale === "ar" ? rev.toSurah.nameAr : rev.toSurah.nameEn;
                return (
                  <TableRow key={rev.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/moderator/memorization/${studentId}/review/${rev.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {new Date(rev.reviewDate).toLocaleDateString(locale)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {fromName} {rev.fromAyah} → {toName} {rev.toAyah}
                    </TableCell>
                    <TableCell>
                      <Badge className={RESULT_COLORS[rev.recitationResult] || ""}>
                        {getResultText(rev.recitationResult)}
                      </Badge>
                    </TableCell>
                    <TableCell>{rev.grade}</TableCell>
                    <TableCell>{rev._count.mistakes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("review.noReviews")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/memorization/[studentId]/page.tsx"
git commit -m "feat(phase5): add moderator student plan detail page with create/edit plan and review history"
```

---

## Task 13: Add moderator review form page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/page.tsx`

This is the main review/tasmee form — the most complex page. It includes: current position banner, range reviewed, recitation result, grade, tajweed scores grid, mistake tracking, notes, voice note, and auto-suggested next homework.

- [ ] **Step 1: Create the review form page**

Create `app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getPlanByStudent, getStudentProgress } from "@/server/services/memorization-plan";
import { calculateNextHomework } from "@/server/services/memorization-review";
import { listTajweedCategories } from "@/server/services/tajweed-category";
import { createReviewAction } from "@/server/actions/memorization";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const createReview = createReviewAction as unknown as (formData: FormData) => void;

export default async function ModeratorReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; studentId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { locale, studentId } = await params;
  const { sessionId } = await searchParams;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: { select: { name: true, nameAr: true } },
      groupStudents: {
        include: { group: { select: { id: true, name: true, memorizationPlansEnabled: true } } },
      },
    },
  });

  if (!studentProfile) notFound();

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );
  if (!enabledGroup) notFound();

  const plan = await getPlanByStudent(studentProfile.id, enabledGroup.group.id);
  if (!plan) notFound();

  const [progress, suggestion, surahs, categories] = await Promise.all([
    getStudentProgress(plan.id),
    calculateNextHomework(plan.id),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
    listTajweedCategories(),
  ]);

  const studentName =
    locale === "ar"
      ? studentProfile.user.nameAr || studentProfile.user.name
      : studentProfile.user.name;
  const surahName =
    locale === "ar" ? plan.currentSurah.nameAr : plan.currentSurah.nameEn;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("review.title")} — {studentName}
      </h1>

      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("plan.currentPosition")}</Label>
              <p className="text-sm font-semibold">
                {surahName} : {plan.currentAyahNumber}
              </p>
            </div>
            <div>
              <Label>{t("plan.juz")}</Label>
              <p className="text-sm font-semibold">{progress?.juz ?? "—"}</p>
            </div>
            <div>
              <Label>{t("plan.hizb")}</Label>
              <p className="text-sm font-semibold">{progress?.hizb ?? "—"}</p>
            </div>
            <div>
              <Label>{t("plan.paceUnit")}</Label>
              <p className="text-sm font-semibold">
                {plan.paceValue.toString()} {t(`plan.pace${plan.paceUnit === "RUB" ? "Rub" : plan.paceUnit === "HIZB" ? "Hizb" : "PageCount"}`)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form action={createReview} className="space-y-6">
        <input type="hidden" name="planId" value={plan.id} />
        {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}

        <Card>
          <CardHeader>
            <CardTitle>{t("review.rangeReviewed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.from")}</Label>
                <div className="flex gap-2">
                  <select
                    name="fromSurahNumber"
                    defaultValue={plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="fromAyah"
                    type="number"
                    min="1"
                    defaultValue={plan.currentAyahNumber}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("review.to")}</Label>
                <div className="flex gap-2">
                  <select
                    name="toSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="toAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah || plan.currentAyahNumber}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("review.recitationResult")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.result")}</Label>
                <select
                  name="recitationResult"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EXCELLENT">{t("review.resultExcellent")}</option>
                  <option value="GOOD">{t("review.resultGood")}</option>
                  <option value="ACCEPTABLE">{t("review.resultAcceptable")}</option>
                  <option value="NEEDS_IMPROVEMENT">{t("review.resultNeedsImprovement")}</option>
                  <option value="FAILED">{t("review.resultFailed")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("review.grade")}</Label>
                <Input name="grade" type="number" min="0" max="100" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tajweed.scores")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="grid gap-2 sm:grid-cols-3 items-center">
                    <input type="hidden" name={`tajweedScores.${idx}.categoryId`} value={cat.id} />
                    <Label>{locale === "ar" ? cat.nameAr : cat.nameEn}</Label>
                    <Input
                      name={`tajweedScores.${idx}.score`}
                      type="number"
                      min="1"
                      max="10"
                      placeholder="/10"
                    />
                    <Input
                      name={`tajweedScores.${idx}.notes`}
                      placeholder={t("review.notes")}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("review.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                name="notes"
                rows={3}
                placeholder={t("review.notes")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("review.voiceNote")}</Label>
              <Input name="voiceNoteUrl" type="url" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle>{t("review.nextHomework")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("review.from")}</Label>
                <div className="flex gap-2">
                  <select
                    name="nextFromSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="nextFromAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah ? suggestion.toAyah + 1 : 1}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("review.to")}</Label>
                <div className="flex gap-2">
                  <select
                    name="nextToSurahNumber"
                    defaultValue={suggestion?.toSurahNumber || plan.currentSurahId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="nextToAyah"
                    type="number"
                    min="1"
                    defaultValue={suggestion?.toAyah || 1}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg">
          {t("review.saveReview")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/page.tsx"
git commit -m "feat(phase5): add moderator review form page with tajweed scores, mistakes, and auto-suggestion"
```

---

## Task 14: Add moderator review detail page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/[reviewId]/page.tsx`

- [ ] **Step 1: Create the review detail page**

Create `app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/[reviewId]/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getReviewDetail } from "@/server/services/memorization-review";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
};

const MISTAKE_LABELS: Record<string, string> = {
  TAJWEED_ERROR: "mistake.tajweedError",
  WRONG_WORD: "mistake.wrongWord",
  HESITATION: "mistake.hesitation",
  SKIPPED_AYAH: "mistake.skippedAyah",
  REPEATED_AYAH: "mistake.repeatedAyah",
  OTHER: "mistake.other",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string; reviewId: string }>;
}) {
  const { locale, reviewId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("memorization");
  const review = await getReviewDetail(reviewId);
  if (!review) notFound();

  const fromName = locale === "ar" ? review.fromSurah.nameAr : review.fromSurah.nameEn;
  const toName = locale === "ar" ? review.toSurah.nameAr : review.toSurah.nameEn;
  const nextFromName = locale === "ar" ? review.nextFromSurah.nameAr : review.nextFromSurah.nameEn;
  const nextToName = locale === "ar" ? review.nextToSurah.nameAr : review.nextToSurah.nameEn;
  const moderatorName = locale === "ar"
    ? review.moderator.nameAr || review.moderator.name
    : review.moderator.name;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("review.reviewDetail")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("review.rangeReviewed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("review.range")}</Label>
              <p className="text-sm font-semibold">
                {fromName} {review.fromAyah} → {toName} {review.toAyah}
              </p>
            </div>
            <div>
              <Label>{t("review.date")}</Label>
              <p className="text-sm">{new Date(review.reviewDate).toLocaleDateString(locale)}</p>
            </div>
            <div>
              <Label>{locale === "ar" ? "المشرف" : "Moderator"}</Label>
              <p className="text-sm">{moderatorName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("review.result")}</Label>
              <div className="mt-1">
                <Badge className={RESULT_COLORS[review.recitationResult] || ""}>
                  {t(`review.result${review.recitationResult.charAt(0) + review.recitationResult.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}`)}
                </Badge>
              </div>
            </div>
            <div>
              <Label>{t("review.grade")}</Label>
              <p className="text-2xl font-bold">{review.grade}/100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {review.tajweedScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tajweed.scores")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.tajweedScores.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">
                    {locale === "ar" ? ts.category.nameAr : ts.category.nameEn}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ts.score}/10</span>
                    {ts.notes && (
                      <span className="text-xs text-muted-foreground">({ts.notes})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {review.mistakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mistake.title")} ({review.mistakes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.mistakes.map((m) => (
                <div key={m.id} className="flex items-start gap-2 border-b pb-2">
                  <Badge variant="outline" className="shrink-0">
                    {t(MISTAKE_LABELS[m.category] || "mistake.other")}
                  </Badge>
                  <span className="text-sm">{m.notes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {review.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle>{t("review.nextHomework")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold">
            {nextFromName} {review.nextFromAyah} → {nextToName} {review.nextToAyah}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/[reviewId]/page.tsx"
git commit -m "feat(phase5): add moderator review detail page"
```

---

## Task 15: Add student memorization dashboard page

**Files:**
- Create: `app/[locale]/(dashboard)/student/memorization/page.tsx`

- [ ] **Step 1: Create the student memorization dashboard**

Create `app/[locale]/(dashboard)/student/memorization/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentProgress } from "@/server/services/memorization-plan";
import { getReviewsByPlan } from "@/server/services/memorization-review";
import { db } from "@/server/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function StudentMemorizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("memorization");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      groupStudents: {
        include: { group: { select: { id: true, name: true, memorizationPlansEnabled: true } } },
      },
    },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledGroup = studentProfile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );

  if (!enabledGroup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = await db.studentMemorizationPlan.findUnique({
    where: {
      studentId_groupId: {
        studentId: studentProfile.id,
        groupId: enabledGroup.group.id,
      },
    },
    include: {
      currentSurah: { select: { number: true, nameAr: true, nameEn: true, ayahCount: true } },
    },
  });

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("plan.noPlan")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [progress, reviews] = await Promise.all([
    getStudentProgress(plan.id),
    getReviewsByPlan(plan.id),
  ]);

  const surahNameAr = plan.currentSurah.nameAr;
  const surahNameEn = plan.currentSurah.nameEn;

  const getResultText = (result: string) => {
    const map: Record<string, string> = {
      EXCELLENT: t("review.resultExcellent"),
      GOOD: t("review.resultGood"),
      ACCEPTABLE: t("review.resultAcceptable"),
      NEEDS_IMPROVEMENT: t("review.resultNeedsImprovement"),
      FAILED: t("review.resultFailed"),
    };
    return map[result] || result;
  };

  const lastReview = reviews[0];

  // Build juz completion data
  const completedJuz = progress ? progress.juz - 1 : 0;
  const currentJuz = progress?.juz || 1;
  const juzData = Array.from({ length: 30 }, (_, i) => {
    const juzNum = i + 1;
    if (juzNum < currentJuz) return { number: juzNum, status: "completed" as const };
    if (juzNum === currentJuz) return { number: juzNum, status: "current" as const };
    return { number: juzNum, status: "upcoming" as const };
  });

  // Surah progress: rub's within current surah
  const surahAyahs = await db.quranAyah.findMany({
    where: { surahNumber: plan.currentSurah.number },
    select: { ayahNumber: true, quarterNumber: true },
    orderBy: { ayahNumber: "asc" },
  });

  const quarters = new Set(surahAyahs.map((a) => a.quarterNumber));
  const sortedQuarters = Array.from(quarters).sort((a, b) => a - b);
  const currentQuarter = progress?.quarter || sortedQuarters[0];

  const quarterData = sortedQuarters.map((q) => {
    if (q < (currentQuarter || 0)) return { number: q, status: "completed" as const };
    if (q === currentQuarter) return { number: q, status: "current" as const };
    return { number: q, status: "upcoming" as const };
  });

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-xl bg-gradient-to-br from-green-900 to-green-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">
              {t("dashboard.currentlyMemorizing")}
            </p>
            <p className="mt-1 text-2xl font-bold">{surahNameAr}</p>
            <p className="text-sm opacity-90">
              {surahNameEn} · {t("plan.ayah")} {plan.currentAyahNumber} / {plan.currentSurah.ayahCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">{t("plan.overallProgress")}</p>
            <p className="text-3xl font-bold">{progress?.percentage ?? 0}%</p>
            <p className="text-xs opacity-80">{t("dashboard.ofQuran")}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm opacity-90">
          <span>{t("plan.juz")} <strong>{progress?.juz ?? "—"}</strong>/30</span>
          <span>{t("plan.hizb")} <strong>{progress?.hizb ?? "—"}</strong>/60</span>
          <span>
            {t("plan.nextReview")}{" "}
            <strong>
              {plan.nextReviewDate
                ? new Date(plan.nextReviewDate).toLocaleDateString(locale)
                : "—"}
            </strong>
          </span>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("plan.nextHomework")}</p>
            <p className="mt-1 font-semibold">
              {lastReview
                ? `${locale === "ar" ? lastReview.toSurah.nameAr : lastReview.toSurah.nameEn} ${lastReview.toAyah + 1}+`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("tajweed.currentFocus")}</p>
            <p className="mt-1 font-semibold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">{t("dashboard.lastReview")}</p>
            {lastReview ? (
              <>
                <p className="mt-1 font-semibold">
                  {new Date(lastReview.reviewDate).toLocaleDateString(locale)} · {lastReview.grade}
                </p>
                <Badge className={RESULT_COLORS[lastReview.recitationResult] || ""}>
                  {getResultText(lastReview.recitationResult)}
                </Badge>
              </>
            ) : (
              <p className="mt-1 font-semibold">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Juz Grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("dashboard.juzGrid")}
          </p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-600" />
              {t("dashboard.completed")}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm border-2 border-green-600" />
              {t("dashboard.inProgress")}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted" />
              {t("dashboard.notStarted")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-15 gap-1">
          {juzData.map((j) => (
            <div
              key={j.number}
              className={`flex aspect-square items-center justify-center rounded text-xs font-semibold ${
                j.status === "completed"
                  ? "bg-green-600 text-white"
                  : j.status === "current"
                    ? "border-2 border-green-600 font-bold"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {j.number}
            </div>
          ))}
        </div>
      </div>

      {/* Current Surah Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("dashboard.surahProgress")}</CardTitle>
            <span className="text-sm font-semibold text-green-600">
              {Math.round(
                ((plan.currentAyahNumber - 1) / plan.currentSurah.ayahCount) * 100
              )}
              %
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {surahNameAr} · {surahNameEn} · {plan.currentAyahNumber} / {plan.currentSurah.ayahCount} {t("dashboard.ayahs")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-0.5">
            {quarterData.map((q) => (
              <div
                key={q.number}
                className={`h-7 flex-1 flex items-center justify-center text-[9px] font-semibold first:rounded-s last:rounded-e ${
                  q.status === "completed"
                    ? "bg-green-600 text-white"
                    : q.status === "current"
                      ? "border-2 border-green-600"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {q.status === "completed" ? "✓" : `R${q.number}`}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">
          {t("dashboard.recentReviews")}
        </h2>
        {reviews.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("review.date")}</TableHead>
                <TableHead>{t("review.range")}</TableHead>
                <TableHead>{t("review.result")}</TableHead>
                <TableHead>{t("review.grade")}</TableHead>
                <TableHead>{t("review.mistakeCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.slice(0, 10).map((rev) => {
                const fromName = locale === "ar" ? rev.fromSurah.nameAr : rev.fromSurah.nameEn;
                const toName = locale === "ar" ? rev.toSurah.nameAr : rev.toSurah.nameEn;
                return (
                  <TableRow key={rev.id}>
                    <TableCell>
                      {new Date(rev.reviewDate).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      {fromName} {rev.fromAyah} → {toName} {rev.toAyah}
                    </TableCell>
                    <TableCell>
                      <Badge className={RESULT_COLORS[rev.recitationResult] || ""}>
                        {getResultText(rev.recitationResult)}
                      </Badge>
                    </TableCell>
                    <TableCell>{rev.grade}</TableCell>
                    <TableCell>{rev._count.mistakes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("review.noReviews")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/memorization/page.tsx"
git commit -m "feat(phase5): add student memorization dashboard with juz grid and surah progress bar"
```

---

## Task 16: Add "Memorization Review" link to weekly session grading page

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx`

- [ ] **Step 1: Add the memorization review link button**

In `app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx`, add a Link import if not already present:

```typescript
import Link from "next/link";
```

Then, inside each student's `<Card>` block (after the grading form's submit `<Button>` around line 319), add:

```tsx
                  <div className="border-t pt-4 mt-4">
                    <Link
                      href={`/${locale}/moderator/memorization/${ss.student.userId}/review?sessionId=${sessionDetail.id}`}
                    >
                      <Button variant="outline" className="w-full">
                        {t("openMemorizationReview")}
                      </Button>
                    </Link>
                  </div>
```

- [ ] **Step 2: Add the i18n key for the button**

Add to the `sessions` namespace in both `messages/en.json` and `messages/ar.json`:

English:
```json
"openMemorizationReview": "Open Memorization Review"
```

Arabic:
```json
"openMemorizationReview": "فتح مراجعة الحفظ"
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx" messages/en.json messages/ar.json
git commit -m "feat(phase5): add memorization review link to weekly session grading page"
```

---

## Task 17: Add group cadence settings to moderator groups page

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/groups/page.tsx`

- [ ] **Step 1: Add cadence settings form to the groups page**

In the moderator groups page, after each group's existing content, add a cadence settings form. Import the action:

```typescript
import { updateGroupCadenceAction } from "@/server/actions/memorization";
const updateGroupCadence = updateGroupCadenceAction as unknown as (formData: FormData) => void;
```

Then add the memorization translations:

```typescript
const mt = await getTranslations("memorization.cadence");
```

Add the cadence form inside each group's card:

```tsx
<div className="border-t pt-4 mt-4">
  <h3 className="font-semibold mb-2">{mt("title")}</h3>
  <form action={updateGroupCadence} className="grid gap-3 sm:grid-cols-3">
    <input type="hidden" name="groupId" value={group.id} />
    <div className="space-y-1">
      <Label>{mt("groupDefault")}</Label>
      <select
        name="meetingCadence"
        defaultValue={group.meetingCadence || "WEEKLY"}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="WEEKLY">{mt("weekly")}</option>
        <option value="BIWEEKLY">{mt("biweekly")}</option>
        <option value="TWICE_WEEKLY">{mt("twiceWeekly")}</option>
        <option value="CUSTOM">{mt("custom")}</option>
      </select>
    </div>
    <div className="space-y-1">
      <Label>{mt("customDays")}</Label>
      <Input
        name="customCadenceDays"
        type="number"
        min="1"
        defaultValue={group.customCadenceDays ?? ""}
      />
    </div>
    <div className="space-y-1">
      <Label>{locale === "ar" ? "تفعيل خطط الحفظ" : "Enable Memorization Plans"}</Label>
      <div className="flex items-center gap-2 h-10">
        <input
          type="checkbox"
          name="memorizationPlansEnabled"
          value="true"
          defaultChecked={group.memorizationPlansEnabled}
          className="h-4 w-4"
        />
        <Button type="submit" size="sm">{locale === "ar" ? "حفظ" : "Save"}</Button>
      </div>
    </div>
  </form>
</div>
```

Note: The exact insertion point depends on the current structure of the moderator groups page. The form should be added inside each group's card rendering loop.

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/groups/page.tsx"
git commit -m "feat(phase5): add meeting cadence and memorization plans toggle to moderator groups page"
```

---

## Task 18: Add Tailwind grid-cols-15 utility

**Files:**
- Modify: `app/globals.css` or `tailwind.config.ts`

- [ ] **Step 1: Check if grid-cols-15 exists in Tailwind config**

```bash
grep -r "grid-cols-15\|gridTemplateColumns" tailwind.config.ts 2>/dev/null
```

- [ ] **Step 2: Add grid-cols-15 to Tailwind config**

If not present, add to `tailwind.config.ts` inside `theme.extend`:

```typescript
gridTemplateColumns: {
  '15': 'repeat(15, minmax(0, 1fr))',
},
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(phase5): add grid-cols-15 Tailwind utility for juz grid"
```

---

## Task 19: Verify the full build compiles

**Files:** None (verification only)

- [ ] **Step 1: Run Prisma generate**

```bash
npx prisma generate
```

Expected: Success

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No errors (or only pre-existing ones unrelated to phase 5)

- [ ] **Step 3: Run Next.js build check**

```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds. All new pages compile.

- [ ] **Step 4: Commit any fixes if needed**

If there are TypeScript or build errors from the above steps, fix them and commit:

```bash
git add -A
git commit -m "fix(phase5): resolve build errors"
```

---

## Deferred to Phase 5.1

The following items from the spec are intentionally deferred — they build on top of Phase 5 but are not required for the core flow to work:

- **Student juz detail page** (`/student/memorization/juz/[juzNumber]`) — drill-down view showing hizb/rub'/surah breakdown within a specific juz. The juz grid on the student dashboard already shows progress; this adds navigable detail.
- **Student profile memorization summary card** — small widget on the student profile page linking to the memorization dashboard.
- **Mistake tracking client-side UX** — the review form currently uses indexed FormData fields for mistakes. A client component with add/remove buttons would improve the moderator experience during live tasmee.
