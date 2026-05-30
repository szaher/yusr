# Phase 13: Memorization Plan Templates & Pace Management

## Goal

Provide default memorization plan templates (1/4 hizb and 1.5 pages per session) and give moderators the ability to adjust pace — either for a single session or permanently — so students always know exactly what to prepare next.

## Architecture

Builds on the existing `StudentMemorizationPlan` model (Phase 5) and `MemorizationReview` flow. Adds a template system for reusable pace presets and a one-time override mechanism on the plan. A new `computeNextRange` service function handles the Quran position math for both RUB and PAGE_COUNT pace units.

## Feature Flag

`memorization_plan_templates` — gates template management UI and the enhanced review form. The underlying range calculation service is always available (used internally by existing review flow).

---

## 1. Plan Templates

### New Model: `MemorizationPlanTemplate`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String @id @default(cuid())` | |
| `name` | `String` | English name |
| `nameAr` | `String` | Arabic name |
| `paceUnit` | `PaceUnit` | RUB, HIZB, or PAGE_COUNT |
| `paceValue` | `Decimal` | e.g., 1, 1.5, 0.5 |
| `description` | `String?` | Optional explanation |
| `isDefault` | `Boolean @default(false)` | System-seeded templates |
| `createdById` | `String?` | null for system defaults |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

Relations:
- `createdBy` → `User?` (nullable, null = system-seeded)
- `plans` → `StudentMemorizationPlan[]`

### Seeded Defaults

| id | name | nameAr | paceUnit | paceValue | description |
|----|------|--------|----------|-----------|-------------|
| `tpl-rub` | Quarter Hizb | ربع حزب | RUB | 1 | 1/4 hizb (~2.5 pages) per session |
| `tpl-page` | Page and Half | صفحة ونصف | PAGE_COUNT | 1.5 | 1.5 pages per session |

Both seeded with `isDefault: true` and `createdById: null`.

### Template CRUD

- Admin can create, edit, and delete non-default templates
- Default templates cannot be deleted, only edited
- Moderators can view all templates when creating student plans

---

## 2. One-Time Override on StudentMemorizationPlan

### Schema Change

Add to `StudentMemorizationPlan`:

| Field | Type | Notes |
|-------|------|-------|
| `templateId` | `String?` | FK → `MemorizationPlanTemplate`, optional reference |
| `nextOverride` | `Json?` | One-time pace override for next session |

`templateId` records which template was used to create the plan. The actual `paceUnit`/`paceValue` are copied to the plan so it's self-contained — changing a template doesn't retroactively change existing plans.

### nextOverride Schema

When set (not null):

```json
{
  "paceUnit": "RUB",
  "paceValue": 1.5,
  "note": "أضف 3 آيات إضافية"
}
```

- `paceUnit` — the pace unit for the next session only
- `paceValue` — the pace value for the next session only
- `note` — optional moderator note explaining the adjustment

### Override Lifecycle

1. Moderator sets override via "Adjust pace → Next session only"
2. `nextOverride` is stored on the plan
3. When the next review is created, `computeNextRange` uses the override's pace instead of the plan's default
4. After the review is saved, `nextOverride` is cleared back to `null`
5. Subsequent sessions revert to the plan's default `paceUnit`/`paceValue`

### Permanent Change

When the moderator chooses "From now on" instead:
- `paceUnit` and `paceValue` on the plan are updated directly (existing `updatePlan` function)
- `templateId` is cleared (plan is now custom)
- No override is set

---

## 3. Range Calculation Service

### `computeNextRange(startSurah, startAyah, paceUnit, paceValue)`

Returns `{ fromSurah, fromAyah, toSurah, toAyah }`.

**Input:** Current position (the ayah *after* the last memorized ayah) and pace.

**Logic by pace unit:**

#### RUB (Quarter Hizb)

1. Look up the `quarterNumber` of the starting ayah from `QuranAyah`
2. Compute target quarter: `startQuarter + floor(paceValue)` (for paceValue=1, advance 1 quarter)
3. If `paceValue` has a fractional part (e.g., 1.5 quarters), find the midpoint ayah within the next quarter
4. Find the last ayah that falls within the target quarter
5. Handle end-of-Quran: cap at surah 114, last ayah

#### PAGE_COUNT

1. Look up the `pageNumber` of the starting ayah from `QuranAyah`
2. Compute target page: `startPage + floor(paceValue)`
3. If `paceValue` has a fractional part (e.g., 1.5 pages), find the midpoint ayah on the next page
4. Find the last ayah on the target page
5. Handle end-of-Quran: cap at surah 114, last ayah

#### HIZB

Same as RUB but using `hizbNumber` instead of `quarterNumber`. Advance by `paceValue` hizbs.

### Usage Points

1. **Review form auto-suggestion** — when moderator opens the review form, `computeNextRange` pre-fills the "Next assignment" fields using the plan's pace (or `nextOverride` if set). The moderator can edit these before saving.
2. **Student dashboard** — shows "Your next memorization" range computed from the plan's current position + pace.
3. **Override consumption** — after a review is saved with the computed range, if `nextOverride` was used, it's cleared.

### Effective Pace Resolution

```
function getEffectivePace(plan):
  if plan.nextOverride is not null:
    return { unit: nextOverride.paceUnit, value: nextOverride.paceValue }
  return { unit: plan.paceUnit, value: plan.paceValue }
```

---

## 4. UI Changes

### 4a. Moderator: Create Student Plan

When creating a plan for a student, the form includes:
- **Template dropdown**: lists all templates + "Custom" option
- Selecting a template pre-fills `paceUnit` and `paceValue`
- Selecting "Custom" shows manual pace fields
- Starting position (surah + ayah) — same as current

### 4b. Moderator: Review Form Enhancement

After grading a recitation, the review form's "Next Assignment" section:
- Shows the auto-computed next range (from `computeNextRange`)
- Range fields are editable — moderator can adjust
- **"Adjust pace" expandable section** with:
  - Pace unit dropdown (RUB / PAGE_COUNT / HIZB)
  - Pace value input
  - **Scope toggle**: "Next session only" | "From now on"
  - Optional note field (for "next session only")
- If scope is "Next session only": sets `nextOverride` on the plan
- If scope is "From now on": updates `paceUnit`/`paceValue` on the plan

### 4c. Student Dashboard

Shows under the memorization section:
- Current pace (e.g., "ربع حزب لكل حلقة")
- Next memorization range (surah:ayah → surah:ayah)
- If there's an override, show a note: "تعديل مؤقت: [note]"

### 4d. Admin: Template Management

Under admin settings:
- List all templates (default + custom)
- Create new template
- Edit template (name, pace, description)
- Delete non-default templates
- Default templates show a badge, cannot be deleted

---

## 5. i18n Keys

New namespace `memorization` (or extend existing):

| Key | ar | en |
|-----|----|----|
| `planTemplate` | قالب الخطة | Plan Template |
| `quarterHizb` | ربع حزب | Quarter Hizb |
| `pageAndHalf` | صفحة ونصف | Page and Half |
| `custom` | مخصص | Custom |
| `adjustPace` | تعديل الوتيرة | Adjust Pace |
| `nextSessionOnly` | الحلقة القادمة فقط | Next Session Only |
| `fromNowOn` | من الآن فصاعداً | From Now On |
| `nextMemorization` | الحفظ القادم | Next Memorization |
| `temporaryAdjustment` | تعديل مؤقت | Temporary Adjustment |
| `paceUnit` | وحدة الوتيرة | Pace Unit |
| `paceValue` | مقدار الوتيرة | Pace Value |
| `templateName` | اسم القالب | Template Name |
| `defaultTemplate` | قالب افتراضي | Default Template |
| `perSession` | لكل حلقة | Per Session |

---

## 6. API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/memorization/templates` | List all templates |
| POST | `/api/memorization/templates` | Create template (admin) |
| PUT | `/api/memorization/templates/[id]` | Update template (admin) |
| DELETE | `/api/memorization/templates/[id]` | Delete template (admin, non-default only) |
| POST | `/api/memorization/plans/[planId]/override` | Set next-session override |
| DELETE | `/api/memorization/plans/[planId]/override` | Clear override |
| GET | `/api/memorization/plans/[planId]/next-range` | Compute next range for a plan |

---

## 7. Seed Data

Add to `prisma/seed.ts` (in `seedSystemSettings` or new `seedPlanTemplates`):
- Upsert the two default templates (`tpl-rub`, `tpl-page`)

Add to `prisma/demo-seed.ts`:
- Assign templates to existing demo student plans
- Set one override on a student to demonstrate the feature

---

## 8. Prerequisite: Fix QuranAyah hizb/quarter Data

The current seed (`prisma/seed.ts` line 257-258) computes `hizbNumber` and `quarterNumber` incorrectly — it derives both from `juzNumber` alone (`hizbNum = juzNum * 2 - 1`, `quarterNum = hizbNum * 4 - 3`), which assigns every ayah in a juz the same hizb and quarter. The database currently has only 30 distinct quarter values instead of 240.

**Fix required before this phase:** Update `seedQuranData()` to use proper hizb and quarter boundary data (similar to how juz boundaries already exist in `prisma/data/quran-juz-boundaries.ts`). We need hizb boundary data (60 boundaries) and quarter boundary data (240 boundaries) to correctly assign each ayah to its hizb and quarter.

This is a Task 0 prerequisite — the RUB pace calculation depends on correct quarter numbers.

---

## 9. Testing Considerations

- `computeNextRange` — unit test with known Quran positions, verify surah boundary crossings, end-of-Quran capping, fractional pace values
- Override lifecycle — create override, verify it's used in next range calculation, verify it's cleared after review
- Template CRUD — admin can create/edit/delete, default templates protected
- Page-based calculation — verify 1.5 pages produces correct ayah ranges
- RUB-based calculation — verify quarter boundaries are respected
