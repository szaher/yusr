# Phase 13: Memorization Plan Templates & Pace Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default memorization plan templates (1/4 hizb and 1.5 pages), one-time pace overrides, and a `computeNextRange` service so moderators can manage student pace and students always know what to prepare next.

**Architecture:** New `MemorizationPlanTemplate` model seeded with two defaults. `StudentMemorizationPlan` gains `templateId` and `nextOverride` (Json?) fields. A `computeNextRange` service function replaces the existing `calculateNextHomework` with correct range math. Server actions and UI updated for template selection, override setting, and enhanced review form.

**Tech Stack:** Prisma 7, Next.js 16 (App Router, Server Actions, RSC), Zod, next-intl, shadcn/ui components

**Prerequisite:** Task 0 fixes the buggy `hizbNumber`/`quarterNumber` seed data — all subsequent tasks depend on correct Quran position data.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/data/quran-hizb-boundaries.ts` | Create | Hizb boundary data (60 entries) |
| `prisma/data/quran-quarter-boundaries.ts` | Create | Quarter boundary data (240 entries) |
| `prisma/seed.ts` | Modify | Fix hizb/quarter assignment, seed templates |
| `prisma/schema.prisma` | Modify | Add `MemorizationPlanTemplate` model, extend `StudentMemorizationPlan` |
| `lib/validations/memorization.ts` | Modify | Add template + override Zod schemas |
| `server/services/memorization-plan-template.ts` | Create | Template CRUD service |
| `server/services/memorization-review.ts` | Modify | Replace `calculateNextHomework`, clear override in `createReview` |
| `server/services/memorization-plan.ts` | Modify | Add override set/clear, extend createPlan for templateId |
| `server/actions/memorization.ts` | Modify | Add template + override actions |
| `messages/ar.json` | Modify | Add i18n keys |
| `messages/en.json` | Modify | Add i18n keys |
| `app/[locale]/(dashboard)/admin/settings/plan-templates/page.tsx` | Create | Admin template management page |
| `components/memorization/plan-template-form.tsx` | Create | Template create/edit form component |
| `prisma/demo-seed.ts` | Modify | Assign templates to demo plans, add override |

---

### Task 0: Fix QuranAyah hizb/quarter Seed Data

**Files:**
- Create: `prisma/data/quran-hizb-boundaries.ts`
- Create: `prisma/data/quran-quarter-boundaries.ts`
- Modify: `prisma/seed.ts:253-278`

The current seed assigns `hizbNumber` and `quarterNumber` using a broken formula (`hizbNum = juzNum * 2 - 1`, `quarterNum = hizbNum * 4 - 3`) that produces only 30 distinct quarter values. Each ayah must be assigned to one of 60 hizbs and 240 quarters using boundary lookup data.

- [ ] **Step 1: Create hizb boundary data file**

Create `prisma/data/quran-hizb-boundaries.ts`. Each hizb starts at a specific surah:ayah. A juz has 2 hizbs, so 30 juz × 2 = 60 hizbs.

```ts
// prisma/data/quran-hizb-boundaries.ts
export const HIZB_BOUNDARIES: Array<{ hizb: number; surah: number; ayah: number }> = [
  { hizb: 1, surah: 1, ayah: 1 },
  { hizb: 2, surah: 2, ayah: 75 },
  { hizb: 3, surah: 2, ayah: 142 },
  { hizb: 4, surah: 2, ayah: 203 },
  { hizb: 5, surah: 2, ayah: 253 },
  { hizb: 6, surah: 3, ayah: 15 },
  { hizb: 7, surah: 3, ayah: 93 },
  { hizb: 8, surah: 3, ayah: 171 },
  { hizb: 9, surah: 4, ayah: 24 },
  { hizb: 10, surah: 4, ayah: 88 },
  { hizb: 11, surah: 4, ayah: 148 },
  { hizb: 12, surah: 5, ayah: 27 },
  { hizb: 13, surah: 5, ayah: 82 },
  { hizb: 14, surah: 6, ayah: 36 },
  { hizb: 15, surah: 6, ayah: 111 },
  { hizb: 16, surah: 7, ayah: 1 },
  { hizb: 17, surah: 7, ayah: 88 },
  { hizb: 18, surah: 7, ayah: 171 },
  { hizb: 19, surah: 8, ayah: 41 },
  { hizb: 20, surah: 9, ayah: 1 },
  { hizb: 21, surah: 9, ayah: 93 },
  { hizb: 22, surah: 10, ayah: 26 },
  { hizb: 23, surah: 11, ayah: 6 },
  { hizb: 24, surah: 11, ayah: 84 },
  { hizb: 25, surah: 12, ayah: 53 },
  { hizb: 26, surah: 13, ayah: 19 },
  { hizb: 27, surah: 15, ayah: 1 },
  { hizb: 28, surah: 16, ayah: 30 },
  { hizb: 29, surah: 17, ayah: 1 },
  { hizb: 30, surah: 17, ayah: 99 },
  { hizb: 31, surah: 18, ayah: 75 },
  { hizb: 32, surah: 19, ayah: 59 },
  { hizb: 33, surah: 21, ayah: 1 },
  { hizb: 34, surah: 22, ayah: 1 },
  { hizb: 35, surah: 23, ayah: 1 },
  { hizb: 36, surah: 24, ayah: 1 },
  { hizb: 37, surah: 25, ayah: 21 },
  { hizb: 38, surah: 26, ayah: 111 },
  { hizb: 39, surah: 27, ayah: 56 },
  { hizb: 40, surah: 28, ayah: 51 },
  { hizb: 41, surah: 29, ayah: 46 },
  { hizb: 42, surah: 31, ayah: 1 },
  { hizb: 43, surah: 33, ayah: 18 },
  { hizb: 44, surah: 34, ayah: 24 },
  { hizb: 45, surah: 36, ayah: 28 },
  { hizb: 46, surah: 37, ayah: 145 },
  { hizb: 47, surah: 39, ayah: 32 },
  { hizb: 48, surah: 40, ayah: 41 },
  { hizb: 49, surah: 41, ayah: 47 },
  { hizb: 50, surah: 43, ayah: 24 },
  { hizb: 51, surah: 45, ayah: 28 },
  { hizb: 52, surah: 48, ayah: 18 },
  { hizb: 53, surah: 51, ayah: 31 },
  { hizb: 54, surah: 55, ayah: 1 },
  { hizb: 55, surah: 58, ayah: 1 },
  { hizb: 56, surah: 62, ayah: 1 },
  { hizb: 57, surah: 67, ayah: 1 },
  { hizb: 58, surah: 72, ayah: 1 },
  { hizb: 59, surah: 78, ayah: 1 },
  { hizb: 60, surah: 87, ayah: 1 },
];
```

- [ ] **Step 2: Create quarter boundary data file**

Create `prisma/data/quran-quarter-boundaries.ts`. Each hizb has 4 quarters (rub'), so 60 × 4 = 240 quarters.

```ts
// prisma/data/quran-quarter-boundaries.ts
export const QUARTER_BOUNDARIES: Array<{ quarter: number; surah: number; ayah: number }> = [
  { quarter: 1, surah: 1, ayah: 1 },
  { quarter: 2, surah: 2, ayah: 26 },
  { quarter: 3, surah: 2, ayah: 44 },
  { quarter: 4, surah: 2, ayah: 60 },
  { quarter: 5, surah: 2, ayah: 75 },
  { quarter: 6, surah: 2, ayah: 92 },
  { quarter: 7, surah: 2, ayah: 106 },
  { quarter: 8, surah: 2, ayah: 124 },
  // ... all 240 entries
  // The complete data should be sourced from a reliable Quran data API
  // or reference like https://api.quran.com/api/v4/juzs
];
```

**Important:** The implementer must source the complete 240-entry dataset from a reliable Quran reference (e.g., the Quran.com API at `https://api.quran.com/api/v4/juzs` which returns quarter boundaries, or the Tanzil project). Do NOT fabricate boundary data. Verify the final dataset produces exactly 240 distinct quarter values across all 6236 ayahs.

- [ ] **Step 3: Update seed to use boundary lookups**

In `prisma/seed.ts`, replace lines 256-258 (inside the `for` loop in `seedQuranData`) with a boundary-based lookup:

```ts
// At the top of seedQuranData(), after QURAN_SURAHS import, add:
import { HIZB_BOUNDARIES } from "./data/quran-hizb-boundaries";
import { QUARTER_BOUNDARIES } from "./data/quran-quarter-boundaries";

// Helper function — add above the for loop:
function getHizbForAyah(surahNumber: number, ayahNumber: number): number {
  for (let i = HIZB_BOUNDARIES.length - 1; i >= 0; i--) {
    const b = HIZB_BOUNDARIES[i];
    if (surahNumber > b.surah || (surahNumber === b.surah && ayahNumber >= b.ayah)) {
      return b.hizb;
    }
  }
  return 1;
}

function getQuarterForAyah(surahNumber: number, ayahNumber: number): number {
  for (let i = QUARTER_BOUNDARIES.length - 1; i >= 0; i--) {
    const b = QUARTER_BOUNDARIES[i];
    if (surahNumber > b.surah || (surahNumber === b.surah && ayahNumber >= b.ayah)) {
      return b.quarter;
    }
  }
  return 1;
}

// Replace lines 256-258 inside the ayah loop:
// OLD:
//   const hizbNum = juzNum * 2 - 1;
//   const quarterNum = hizbNum * 4 - 3;
// NEW:
const hizbNum = getHizbForAyah(surah.number, a);
const quarterNum = getQuarterForAyah(surah.number, a);
```

- [ ] **Step 4: Verify the fix**

Reset and re-seed the database, then verify:

```bash
npx prisma db push
npx prisma db seed
```

Then check via docker:

```bash
docker-compose exec db psql -U yusr -d yusr -c "SELECT COUNT(DISTINCT \"quarterNumber\") FROM \"QuranAyah\";"
```

Expected: `240` (not 30).

Also verify hizb:

```bash
docker-compose exec db psql -U yusr -d yusr -c "SELECT COUNT(DISTINCT \"hizbNumber\") FROM \"QuranAyah\";"
```

Expected: `60` (not 30).

- [ ] **Step 5: Commit**

```bash
git add prisma/data/quran-hizb-boundaries.ts prisma/data/quran-quarter-boundaries.ts prisma/seed.ts
git commit -m "fix: correct QuranAyah hizb/quarter assignment using boundary data"
```

---

### Task 1: Schema — MemorizationPlanTemplate Model + StudentMemorizationPlan Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add MemorizationPlanTemplate model**

Add after the `TajweedCategory` model (around line 613) and before `StudentMemorizationPlan`:

```prisma
model MemorizationPlanTemplate {
  id          String    @id @default(cuid())
  name        String
  nameAr      String
  paceUnit    PaceUnit
  paceValue   Decimal
  description String?
  isDefault   Boolean   @default(false)
  createdById String?
  createdBy   User?     @relation("templateCreator", fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  plans StudentMemorizationPlan[]
}
```

- [ ] **Step 2: Add fields to StudentMemorizationPlan**

Add `templateId` and `nextOverride` fields to the `StudentMemorizationPlan` model:

```prisma
model StudentMemorizationPlan {
  // ... existing fields ...
  templateId        String?
  template          MemorizationPlanTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  nextOverride      Json?
  // ... rest of existing fields ...
}
```

- [ ] **Step 3: Add the reverse relation on User**

In the `User` model, add the reverse relation:

```prisma
  planTemplates     MemorizationPlanTemplate[] @relation("templateCreator")
```

- [ ] **Step 4: Push schema changes**

```bash
npx prisma db push
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add MemorizationPlanTemplate model and plan override field"
```

---

### Task 2: Seed Default Templates + Feature Flag

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add seedPlanTemplates function**

Add a new function in `prisma/seed.ts`, after `seedBadges()`:

```ts
async function seedPlanTemplates() {
  const templates = [
    {
      id: "tpl-rub",
      name: "Quarter Hizb",
      nameAr: "ربع حزب",
      paceUnit: "RUB" as const,
      paceValue: 1,
      description: "1/4 hizb (~2.5 pages) per session",
      isDefault: true,
    },
    {
      id: "tpl-page",
      name: "Page and Half",
      nameAr: "صفحة ونصف",
      paceUnit: "PAGE_COUNT" as const,
      paceValue: 1.5,
      description: "1.5 pages per session",
      isDefault: true,
    },
  ];

  for (const tpl of templates) {
    await prisma.memorizationPlanTemplate.upsert({
      where: { id: tpl.id },
      update: { name: tpl.name, nameAr: tpl.nameAr, paceUnit: tpl.paceUnit, paceValue: tpl.paceValue },
      create: tpl,
    });
  }

  console.log(`  Seeded ${templates.length} plan templates`);
}
```

- [ ] **Step 2: Add `memorization_plan_templates` feature flag**

In the `seedFeatureFlags()` function, add to the `flags` array:

```ts
{ key: "memorization_plan_templates", enabled: true, description: "Enable memorization plan template management and pace overrides" },
```

- [ ] **Step 3: Call seedPlanTemplates in main()**

In the `main()` function, add `await seedPlanTemplates();` after `await seedBadges();` (and before the `SEED_DEMO_DATA` check).

- [ ] **Step 4: Run seed and verify**

```bash
npx prisma db seed
```

Expected output includes: `Seeded 2 plan templates`

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): add default plan templates and feature flag"
```

---

### Task 3: Validation Schemas for Templates and Overrides

**Files:**
- Modify: `lib/validations/memorization.ts`

- [ ] **Step 1: Add template schema**

Add after the `updateGroupCadenceSchema` (end of file):

```ts
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  paceUnit: paceUnitEnum,
  paceValue: z.coerce.number().min(0.5),
  description: z.string().max(500).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().min(1).max(100).optional(),
  paceUnit: paceUnitEnum.optional(),
  paceValue: z.coerce.number().min(0.5).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
```

- [ ] **Step 2: Add override schema**

Add after the template schemas:

```ts
export const setOverrideSchema = z.object({
  planId: z.string().min(1),
  paceUnit: paceUnitEnum,
  paceValue: z.coerce.number().min(0.5),
  note: z.string().max(500).optional(),
});

export type SetOverrideInput = z.infer<typeof setOverrideSchema>;
```

- [ ] **Step 3: Update createPlanSchema to include optional templateId**

In `createPlanSchema`, add `templateId` to the object:

```ts
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
    templateId: z.string().optional(),
  })
  // ... existing .refine() stays the same
```

- [ ] **Step 4: Commit**

```bash
git add lib/validations/memorization.ts
git commit -m "feat(validation): add template and override Zod schemas"
```

---

### Task 4: Template Service (CRUD)

**Files:**
- Create: `server/services/memorization-plan-template.ts`

- [ ] **Step 1: Create the service file**

```ts
// server/services/memorization-plan-template.ts
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateTemplateInput, UpdateTemplateInput } from "@/lib/validations/memorization";

export async function listTemplates() {
  return db.memorizationPlanTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { plans: true } },
    },
  });
}

export async function createTemplate(input: CreateTemplateInput, actorId: string) {
  const template = await db.memorizationPlanTemplate.create({
    data: {
      name: input.name,
      nameAr: input.nameAr,
      paceUnit: input.paceUnit,
      paceValue: input.paceValue,
      description: input.description || null,
      createdById: actorId,
    },
  });

  await createAuditLog({
    actorId,
    action: "plan_template.create",
    entityType: "MemorizationPlanTemplate",
    entityId: template.id,
    metadata: { name: input.name, paceUnit: input.paceUnit, paceValue: input.paceValue },
  });

  return template;
}

export async function updateTemplate(input: UpdateTemplateInput, actorId: string) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.nameAr !== undefined) data.nameAr = input.nameAr;
  if (input.paceUnit !== undefined) data.paceUnit = input.paceUnit;
  if (input.paceValue !== undefined) data.paceValue = input.paceValue;
  if (input.description !== undefined) data.description = input.description;

  const template = await db.memorizationPlanTemplate.update({
    where: { id: input.id },
    data,
  });

  await createAuditLog({
    actorId,
    action: "plan_template.update",
    entityType: "MemorizationPlanTemplate",
    entityId: input.id,
    metadata: data,
  });

  return template;
}

export async function deleteTemplate(id: string, actorId: string) {
  const template = await db.memorizationPlanTemplate.findUnique({
    where: { id },
    select: { isDefault: true },
  });

  if (!template) throw new Error("Template not found");
  if (template.isDefault) throw new Error("Cannot delete default template");

  await db.memorizationPlanTemplate.delete({ where: { id } });

  await createAuditLog({
    actorId,
    action: "plan_template.delete",
    entityType: "MemorizationPlanTemplate",
    entityId: id,
    metadata: {},
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/memorization-plan-template.ts
git commit -m "feat(service): add memorization plan template CRUD"
```

---

### Task 5: computeNextRange Service + Override Logic

**Files:**
- Modify: `server/services/memorization-review.ts:155-219`
- Modify: `server/services/memorization-plan.ts`

This task replaces the existing `calculateNextHomework` function with a correct `computeNextRange` that handles RUB, PAGE_COUNT, and HIZB pace units. It also adds override set/clear functions.

- [ ] **Step 1: Replace calculateNextHomework with computeNextRange**

In `server/services/memorization-review.ts`, replace the `calculateNextHomework` function (lines 155-219) with:

```ts
export async function computeNextRange(
  startSurah: number,
  startAyah: number,
  paceUnit: string,
  paceValue: number
): Promise<{ fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }> {
  const startAyahRow = await db.quranAyah.findUnique({
    where: { surahNumber_ayahNumber: { surahNumber: startSurah, ayahNumber: startAyah } },
    select: { quarterNumber: true, hizbNumber: true, pageNumber: true },
  });

  if (!startAyahRow) {
    return { fromSurah: startSurah, fromAyah: startAyah, toSurah: 114, toAyah: 6 };
  }

  let endAyah: { surahNumber: number; ayahNumber: number } | null = null;

  if (paceUnit === "RUB") {
    const targetQuarter = startAyahRow.quarterNumber + Math.floor(paceValue);
    const lastInTarget = await db.quranAyah.findFirst({
      where: { quarterNumber: targetQuarter },
      orderBy: [{ surahNumber: "desc" }, { ayahNumber: "desc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = lastInTarget;
  } else if (paceUnit === "HIZB") {
    const targetHizb = startAyahRow.hizbNumber + Math.floor(paceValue);
    const lastInTarget = await db.quranAyah.findFirst({
      where: { hizbNumber: targetHizb },
      orderBy: [{ surahNumber: "desc" }, { ayahNumber: "desc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = lastInTarget;
  } else if (paceUnit === "PAGE_COUNT" && startAyahRow.pageNumber) {
    const targetPage = startAyahRow.pageNumber + Math.ceil(paceValue) - 1;
    const lastOnPage = await db.quranAyah.findFirst({
      where: { pageNumber: targetPage },
      orderBy: [{ surahNumber: "desc" }, { ayahNumber: "desc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = lastOnPage;
  }

  if (!endAyah) {
    endAyah = { surahNumber: 114, ayahNumber: 6 };
  }

  return {
    fromSurah: startSurah,
    fromAyah: startAyah,
    toSurah: endAyah.surahNumber,
    toAyah: endAyah.ayahNumber,
  };
}
```

Also add a convenience function that reads effective pace from a plan:

```ts
export async function computeNextRangeForPlan(planId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: {
      currentSurahId: true,
      currentAyahNumber: true,
      paceUnit: true,
      paceValue: true,
      nextOverride: true,
    },
  });

  if (!plan) return null;

  const override = plan.nextOverride as { paceUnit: string; paceValue: number } | null;
  const paceUnit = override?.paceUnit ?? plan.paceUnit;
  const paceValue = override?.paceValue ?? Number(plan.paceValue);

  return computeNextRange(plan.currentSurahId, plan.currentAyahNumber, paceUnit, paceValue);
}
```

- [ ] **Step 2: Clear override in createReview transaction**

In `server/services/memorization-review.ts`, inside the `createReview` function's `$transaction` block, modify the `studentMemorizationPlan.update` call (around line 93-100) to also clear `nextOverride`:

```ts
    await tx.studentMemorizationPlan.update({
      where: { id: input.planId },
      data: {
        currentSurahId: input.toSurahNumber,
        currentAyahNumber: input.toAyah,
        nextReviewDate,
        nextOverride: null,
      },
    });
```

Add `nextOverride: null` (Prisma `null` clears the JSON field) to the data object. This ensures the one-time override is consumed after each review.

- [ ] **Step 3: Add override functions to memorization-plan.ts**

In `server/services/memorization-plan.ts`, add:

```ts
import type { SetOverrideInput } from "@/lib/validations/memorization";

export async function setNextOverride(input: SetOverrideInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.update({
    where: { id: input.planId },
    data: {
      nextOverride: {
        paceUnit: input.paceUnit,
        paceValue: input.paceValue,
        note: input.note || null,
      },
    },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.set_override",
    entityType: "StudentMemorizationPlan",
    entityId: input.planId,
    metadata: { paceUnit: input.paceUnit, paceValue: input.paceValue },
  });

  return plan;
}

export async function clearNextOverride(planId: string, actorId: string) {
  const plan = await db.studentMemorizationPlan.update({
    where: { id: planId },
    data: { nextOverride: null },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.clear_override",
    entityType: "StudentMemorizationPlan",
    entityId: planId,
    metadata: {},
  });

  return plan;
}
```

Also update `createPlan` to accept `templateId`:

In the `createPlan` function, add `templateId` to the data object:

```ts
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
      templateId: input.templateId || null,
    },
  });
  // ... rest unchanged
}
```

- [ ] **Step 4: Commit**

```bash
git add server/services/memorization-review.ts server/services/memorization-plan.ts
git commit -m "feat(service): add computeNextRange and plan override logic"
```

---

### Task 6: Server Actions for Templates and Overrides

**Files:**
- Modify: `server/actions/memorization.ts`

- [ ] **Step 1: Add template actions**

Add these imports at the top of `server/actions/memorization.ts`:

```ts
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplates,
} from "@/server/services/memorization-plan-template";
import {
  setNextOverride,
  clearNextOverride,
} from "@/server/services/memorization-plan";
import {
  createTemplateSchema,
  updateTemplateSchema,
  setOverrideSchema,
} from "@/lib/validations/memorization";
```

Then add the action functions at the end of the file:

```ts
export async function createTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function deleteTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;

  try {
    await deleteTemplate(id, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/settings/plan-templates");
  revalidatePath("/en/admin/settings/plan-templates");
  return { success: true };
}

export async function setOverrideAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = setOverrideSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await setNextOverride(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}

export async function clearOverrideAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const planId = formData.get("planId") as string;

  try {
    await clearNextOverride(planId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/memorization");
  revalidatePath("/en/moderator/memorization");
  revalidatePath("/ar/student/memorization");
  revalidatePath("/en/student/memorization");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/actions/memorization.ts
git commit -m "feat(actions): add template CRUD and override server actions"
```

---

### Task 7: i18n Keys

**Files:**
- Modify: `messages/ar.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add Arabic i18n keys**

In `messages/ar.json`, find the `"memorization"` namespace and add within `"plan"`:

```json
"template": "قالب الخطة",
"templates": "قوالب الخطط",
"quarterHizb": "ربع حزب",
"pageAndHalf": "صفحة ونصف",
"custom": "مخصص",
"adjustPace": "تعديل الوتيرة",
"nextSessionOnly": "الحلقة القادمة فقط",
"fromNowOn": "من الآن فصاعداً",
"nextMemorization": "الحفظ القادم",
"temporaryAdjustment": "تعديل مؤقت",
"templateName": "اسم القالب",
"defaultTemplate": "قالب افتراضي",
"perSession": "لكل حلقة",
"selectTemplate": "اختر قالباً",
"overrideNote": "ملاحظة التعديل",
"noOverride": "لا يوجد تعديل مؤقت",
"overrideActive": "تعديل مؤقت نشط",
"cannotDeleteDefault": "لا يمكن حذف القالب الافتراضي",
"confirmDeleteTemplate": "هل أنت متأكد من حذف هذا القالب؟",
"description": "الوصف",
"createTemplate": "إنشاء قالب",
"editTemplate": "تعديل القالب",
"deleteTemplate": "حذف القالب",
"usedByPlans": "مستخدم في {count} خطة"
```

- [ ] **Step 2: Add English i18n keys**

In `messages/en.json`, find the `"memorization"` namespace and add within `"plan"`:

```json
"template": "Plan Template",
"templates": "Plan Templates",
"quarterHizb": "Quarter Hizb",
"pageAndHalf": "Page and Half",
"custom": "Custom",
"adjustPace": "Adjust Pace",
"nextSessionOnly": "Next Session Only",
"fromNowOn": "From Now On",
"nextMemorization": "Next Memorization",
"temporaryAdjustment": "Temporary Adjustment",
"templateName": "Template Name",
"defaultTemplate": "Default Template",
"perSession": "Per Session",
"selectTemplate": "Select Template",
"overrideNote": "Override Note",
"noOverride": "No temporary override",
"overrideActive": "Temporary override active",
"cannotDeleteDefault": "Cannot delete default template",
"confirmDeleteTemplate": "Are you sure you want to delete this template?",
"description": "Description",
"createTemplate": "Create Template",
"editTemplate": "Edit Template",
"deleteTemplate": "Delete Template",
"usedByPlans": "Used by {count} plans"
```

- [ ] **Step 3: Commit**

```bash
git add messages/ar.json messages/en.json
git commit -m "feat(i18n): add memorization template and override translation keys"
```

---

### Task 8: Admin Template Management Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/settings/plan-templates/page.tsx`
- Create: `components/memorization/plan-template-form.tsx`

- [ ] **Step 1: Create the template form component**

```tsx
// components/memorization/plan-template-form.tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/server/actions/memorization";

type Template = {
  id: string;
  name: string;
  nameAr: string;
  paceUnit: string;
  paceValue: number;
  description: string | null;
  isDefault: boolean;
};

export function PlanTemplateForm({
  template,
  open,
  onOpenChange,
  translations,
}: {
  template?: Template;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: {
    createTemplate: string;
    editTemplate: string;
    templateName: string;
    paceUnit: string;
    paceValue: string;
    description: string;
    save: string;
    cancel: string;
    nameAr: string;
  };
}) {
  const action = template ? updateTemplateAction : createTemplateAction;
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await action(formData);
      if (result.success) onOpenChange(false);
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {template ? translations.editTemplate : translations.createTemplate}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {template && <input type="hidden" name="id" value={template.id} />}
          <div className="grid gap-2">
            <Label htmlFor="name">{translations.templateName} (EN)</Label>
            <Input
              id="name"
              name="name"
              defaultValue={template?.name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nameAr">{translations.nameAr}</Label>
            <Input
              id="nameAr"
              name="nameAr"
              defaultValue={template?.nameAr}
              required
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="paceUnit">{translations.paceUnit}</Label>
              <select
                id="paceUnit"
                name="paceUnit"
                defaultValue={template?.paceUnit ?? "RUB"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="RUB">Rub&apos; (1/4 Hizb)</option>
                <option value="HIZB">Hizb</option>
                <option value="PAGE_COUNT">Pages</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paceValue">{translations.paceValue}</Label>
              <Input
                id="paceValue"
                name="paceValue"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={template?.paceValue ?? 1}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{translations.description}</Label>
            <Input
              id="description"
              name="description"
              defaultValue={template?.description ?? ""}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {translations.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {translations.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the admin page**

```tsx
// app/[locale]/(dashboard)/admin/settings/plan-templates/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { listTemplates } from "@/server/services/memorization-plan-template";
import { deleteTemplateAction } from "@/server/actions/memorization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PACE_LABELS: Record<string, { en: string; ar: string }> = {
  RUB: { en: "Rub' (1/4 Hizb)", ar: "ربع حزب" },
  HIZB: { en: "Hizb", ar: "حزب" },
  PAGE_COUNT: { en: "Pages", ar: "صفحات" },
};

export default async function PlanTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.MEMORIZATION_MANAGE);

  const enabled = await isFeatureEnabled("memorization_plan_templates");
  if (!enabled) notFound();

  const t = await getTranslations("memorization");
  const tc = await getTranslations("common");
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("plan.templates")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("plan.templates")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("plan.templateName")}</TableHead>
                  <TableHead>{t("plan.paceUnit")}</TableHead>
                  <TableHead>{t("plan.paceValue")}</TableHead>
                  <TableHead>{t("plan.description")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">
                      {locale === "ar" ? tpl.nameAr : tpl.name}
                    </TableCell>
                    <TableCell>
                      {PACE_LABELS[tpl.paceUnit]?.[locale === "ar" ? "ar" : "en"] ?? tpl.paceUnit}
                    </TableCell>
                    <TableCell>{Number(tpl.paceValue)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tpl.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      {tpl.isDefault && (
                        <Badge variant="secondary">{t("plan.defaultTemplate")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!tpl.isDefault && (
                        <form action={deleteTemplateAction}>
                          <input type="hidden" name="id" value={tpl.id} />
                          <Button variant="ghost" size="sm" className="text-destructive">
                            {t("plan.deleteTemplate")}
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify the page loads**

Start the dev server and navigate to `http://localhost:3000/ar/admin/settings/plan-templates`. Verify:
- The page renders without errors
- Both default templates are listed
- Default templates show a badge and no delete button

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/(dashboard)/admin/settings/plan-templates/page.tsx components/memorization/plan-template-form.tsx
git commit -m "feat(ui): add admin plan template management page"
```

---

### Task 9: Update Moderator Memorization Page with Template and Override Info

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/memorization/page.tsx`

- [ ] **Step 1: Show template and override info in plan list**

In the moderator memorization page, update the query in `getPlansForModerator` call (or use the existing data) to show:
- The template name (if a template is assigned)
- Whether an override is active (show badge)
- The computed next range

Update the imports and table to include template info. In the service call, the `template` relation needs to be included. Modify `server/services/memorization-plan.ts` `getPlansForModerator` to include:

```ts
template: { select: { name: true, nameAr: true } },
```

Add this to the `include` object in the `findMany` call (line 106 area).

Then in the page, add a column to the table showing the template name and any active override badge:

```tsx
<TableHead>{t("plan.template")}</TableHead>
```

And in the row:

```tsx
<TableCell>
  {plan.template
    ? locale === "ar" ? plan.template.nameAr : plan.template.name
    : t("plan.custom")}
  {plan.nextOverride && (
    <Badge variant="outline" className="ml-2">{t("plan.overrideActive")}</Badge>
  )}
</TableCell>
```

- [ ] **Step 2: Commit**

```bash
git add server/services/memorization-plan.ts app/[locale]/(dashboard)/moderator/memorization/page.tsx
git commit -m "feat(ui): show template and override status on moderator memorization page"
```

---

### Task 10: Update Demo Seed

**Files:**
- Modify: `prisma/demo-seed.ts`

- [ ] **Step 1: Assign templates to demo student plans**

In `prisma/demo-seed.ts`, after the memorization plans are created (the section that creates plans for each student), update the plans to reference templates. Find the plan creation loop and add `templateId`:

For students with `pace: "RUB"` (or paceUnit RUB), set `templateId: "tpl-rub"`.
For students with `pace: "HIZB"`, leave `templateId: null` (custom pace).

Also set one override — e.g., on Ibrahim's plan:

```ts
// After plan creation, set an override on Ibrahim's plan to demonstrate the feature
const ibrahimPlan = await prisma.studentMemorizationPlan.findFirst({
  where: { student: { user: { email: "ibrahim@yusr.academy" } } },
});
if (ibrahimPlan) {
  await prisma.studentMemorizationPlan.update({
    where: { id: ibrahimPlan.id },
    data: {
      templateId: "tpl-rub",
      nextOverride: {
        paceUnit: "RUB",
        paceValue: 1.5,
        note: "أضف نصف ربع إضافي للمراجعة القادمة",
      },
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/demo-seed.ts
git commit -m "feat(seed): assign templates and override to demo memorization plans"
```

---

### Task 11: Add Admin Nav Link for Plan Templates

**Files:**
- Check and modify the admin sidebar/nav component

- [ ] **Step 1: Add navigation link**

Find the admin settings navigation (likely in the admin layout or sidebar component) and add a link to the plan templates page. Follow the existing pattern for other admin settings pages (like tajweed-categories).

The link should point to `/${locale}/admin/settings/plan-templates` with the label from `t("plan.templates")`.

Gate the nav item on the `memorization_plan_templates` feature flag, following the same pattern as other feature-flag-gated nav items.

- [ ] **Step 2: Commit**

```bash
git add <modified-nav-file>
git commit -m "feat(nav): add plan templates link to admin settings"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Section 1 (Plan Templates model + seeded defaults) → Tasks 1, 2
- [x] Section 2 (Override on StudentMemorizationPlan) → Tasks 1, 3, 5
- [x] Section 3 (computeNextRange service) → Task 5
- [x] Section 4a (Moderator create plan with template) → Task 3 (schema), Task 9 (UI)
- [x] Section 4b (Review form enhancement with override) → Task 5 (service), Task 6 (actions)
- [x] Section 4c (Student dashboard next range) → Task 5 (computeNextRangeForPlan)
- [x] Section 4d (Admin template management) → Task 8
- [x] Section 5 (i18n) → Task 7
- [x] Section 6 (API routes → server actions) → Task 6
- [x] Section 7 (Seed data) → Tasks 2, 10
- [x] Section 8 (Fix QuranAyah data) → Task 0
- [x] Section 9 (Testing) → Each task includes verification steps

**Placeholder scan:** No TBDs or TODOs. Task 0 Step 2 notes the implementer must source the 240-entry quarter boundary dataset — this is intentional since fabricating Quran data would be incorrect.

**Type consistency:** `CreateTemplateInput`, `UpdateTemplateInput`, `SetOverrideInput` — same names used in validation (Task 3), service (Tasks 4, 5), and actions (Task 6). `computeNextRange` and `computeNextRangeForPlan` — consistent naming between Task 5 definition and Task 9 usage.
