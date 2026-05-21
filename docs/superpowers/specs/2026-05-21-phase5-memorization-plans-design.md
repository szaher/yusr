# Phase 5: Individual Quran Memorization Plans

## Overview

Per-student Quran memorization tracking system with moderator review/grading interface, configurable meeting cadence, tajweed-specific grading, mistake tracking, and a student-facing progress dashboard with Juz grid and surah progress visualization.

This system is **hybrid**: existing group-level assignments (Phase 3) remain for group-wide homework (tajweed, general revision), while a new `StudentMemorizationPlan` tracks each student's individual Quran memorization journey. The feature is optional — controlled by a feature flag and per-group opt-in toggle.

## Data Model

### New Models

#### `StudentMemorizationPlan`

Tracks a student's individual memorization journey: where they are, their pace, and their review schedule.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `studentId` | String (FK → User) | The student |
| `groupId` | String (FK → Group) | The group context |
| `currentSurahId` | Int (FK → QuranSurah) | Current surah position |
| `currentAyahId` | Int (FK → QuranAyah) | Current ayah position |
| `paceUnit` | Enum: `RUB`, `HIZB`, `PAGE_COUNT` | Unit for auto-suggesting next homework |
| `paceValue` | Decimal | Amount per review (min 1.5 for PAGE_COUNT) |
| `meetingCadence` | Enum (nullable): `WEEKLY`, `BIWEEKLY`, `TWICE_WEEKLY`, `CUSTOM` | Per-student override; null = inherit from group |
| `customCadenceDays` | Int (nullable) | Days between reviews when cadence is CUSTOM |
| `nextReviewDate` | DateTime (nullable) | Auto-calculated after each review |
| `active` | Boolean | Soft delete |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Constraints:**
- Unique on `(studentId, groupId)` — one plan per student per group
- `paceValue` minimum is 1.5 when `paceUnit` is `PAGE_COUNT`, minimum 1 for `RUB` and `HIZB`

#### `MemorizationReview`

Captures a single review/tasmee session between a moderator and student.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `planId` | String (FK → StudentMemorizationPlan) | The student's plan |
| `moderatorId` | String (FK → User) | Reviewing moderator |
| `sessionId` | String (FK → WeeklySession, nullable) | Linked weekly session (null for standalone reviews) |
| `reviewDate` | DateTime | When the review occurred |
| `fromSurahId` | Int (FK → QuranSurah) | Start of reviewed range |
| `fromAyah` | Int | Starting ayah number |
| `toSurahId` | Int (FK → QuranSurah) | End of reviewed range |
| `toAyah` | Int | Ending ayah number |
| `recitationResult` | Enum: `EXCELLENT`, `GOOD`, `ACCEPTABLE`, `NEEDS_IMPROVEMENT`, `FAILED` | Overall recitation quality |
| `grade` | Int | Numeric grade 0-100 |
| `notes` | String (nullable) | General feedback text |
| `voiceNoteUrl` | String (nullable) | URL to recorded voice note |
| `nextFromSurahId` | Int (FK → QuranSurah) | Agreed next homework start surah |
| `nextFromAyah` | Int | Agreed next homework start ayah |
| `nextToSurahId` | Int (FK → QuranSurah) | Agreed next homework end surah |
| `nextToAyah` | Int | Agreed next homework end ayah |
| `createdAt` | DateTime | |

**Behavior:** On save, the plan's `currentSurahId`/`currentAyahId` is updated to `toSurahId`/`toAyah`, and `nextReviewDate` is recalculated based on effective cadence.

#### `ReviewTajweedScore`

Per-review scores broken out by tajweed category.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `reviewId` | String (FK → MemorizationReview) | Parent review |
| `categoryId` | String (FK → TajweedCategory) | Which tajweed category |
| `score` | Int | Score 1-10 |
| `notes` | String (nullable) | Category-specific notes |

**Constraint:** Unique on `(reviewId, categoryId)` — one score per category per review.

#### `ReviewMistake`

Individual mistakes logged during a review.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `reviewId` | String (FK → MemorizationReview) | Parent review |
| `category` | Enum: `TAJWEED_ERROR`, `WRONG_WORD`, `HESITATION`, `SKIPPED_AYAH`, `REPEATED_AYAH`, `OTHER` | Mistake type |
| `notes` | String | Description of the mistake |

#### `TajweedCategory`

Configurable tajweed grading categories managed by admins.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `nameEn` | String | English name |
| `nameAr` | String | Arabic name |
| `isCore` | Boolean | true = shipped default (can't be deleted, only deactivated) |
| `sortOrder` | Int | Display order |
| `active` | Boolean | Whether shown in new review forms |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Seed data (6 core categories):**
1. Makharij / المخارج
2. Sifaat / صفات الحروف
3. Noon & Meem Rules / أحكام النون والميم
4. Madd / المدود
5. Waqf / الوقف والابتداء
6. General Fluency / الطلاقة العامة

### Modified Models

#### `Group` — new fields

| Field | Type | Description |
|---|---|---|
| `meetingCadence` | Enum: `WEEKLY`, `BIWEEKLY`, `TWICE_WEEKLY`, `CUSTOM` | Group default cadence (default: `WEEKLY`) |
| `customCadenceDays` | Int (nullable) | Days between reviews for CUSTOM cadence |
| `memorizationPlansEnabled` | Boolean | Per-group opt-in toggle (default: false) |

### Enums

```
PaceUnit: RUB | HIZB | PAGE_COUNT
MeetingCadence: WEEKLY | BIWEEKLY | TWICE_WEEKLY | CUSTOM
MistakeCategory: TAJWEED_ERROR | WRONG_WORD | HESITATION | SKIPPED_AYAH | REPEATED_AYAH | OTHER
```

`RecitationResult` already exists: `EXCELLENT | GOOD | ACCEPTABLE | NEEDS_IMPROVEMENT | FAILED`

## Moderator Review Flow

### Entry Points

Two ways to access the review form — both lead to the same form:

**A. Standalone review** — Moderator navigates to a student's memorization plan page (from the students list or group page). Searches/selects the student, sees their current position, and opens a new review. No weekly session required.

**B. Inside weekly session** — When grading a student during an existing weekly session (Phase 4 flow), a "Memorization Review" button links to the review form pre-filled with `sessionId`. The review is linked to the session record.

### Review Form

The form captures:

1. **Current position banner** (read-only) — shows the student's current surah, ayah, juz, hizb, and pace setting
2. **Range reviewed** — surah/ayah pickers for start and end of what was recited
3. **Recitation result** — dropdown: Excellent/Good/Acceptable/Needs Improvement/Failed
4. **Grade** — numeric input 0-100
5. **Tajweed scores** — grid of all active `TajweedCategory` entries, each with a 1-10 score input and optional notes
6. **Mistakes** — repeatable section: pick category (dropdown) + add note text, with add/remove buttons. Displayed as a list below the input.
7. **Notes** — free-text general feedback
8. **Voice note** — upload or record
9. **Next homework** (auto-suggested) — surah/ayah pickers for the next assignment range, pre-populated based on the student's `paceUnit`/`paceValue` from their current position. Moderator can adjust.

### On Save

- Creates `MemorizationReview` with all related `ReviewTajweedScore` and `ReviewMistake` records
- Updates `StudentMemorizationPlan.currentSurahId`/`currentAyahId` to the reviewed range end
- Calculates and sets `nextReviewDate` based on effective cadence (student override > group default)
- Logs to audit trail

### Auto-suggestion Logic for Next Homework

Given the student's current position (surah + ayah) and pace setting:

- **RUB**: find the current rub' (quarter-hizb), advance by `paceValue` rub' units. Map back to surah/ayah using `QuranQuarter` → `QuranAyah` reference data.
- **HIZB**: find the current hizb, advance by `paceValue` hizb units. Map back similarly.
- **PAGE_COUNT**: find the current page number from `QuranAyah.page`, advance by `paceValue` pages (minimum 1.5). Find the first ayah of the target page as the end point.

The suggestion is pre-filled but editable — the moderator always has final say.

## Student Dashboard

### Layout (top to bottom)

**1. Hero Card** — dark green gradient background:
- Current surah name (Arabic + English)
- Current ayah / total ayahs in surah
- Overall Quran progress percentage
- Position: Juz X/30, Hizb X/60
- Next review date

**2. Quick Info Cards** — three cards in a row:
- Next homework (surah + ayah range, unit description)
- Current tajweed focus (from most recent assignment or moderator note)
- Last review (date, grade, result, mistake count)

**3. Juz Grid** — 30 squares arranged 15×2:
- Completed juz: solid green
- In-progress juz: bordered green with fill proportional to completion
- Not started: gray
- Clicking a juz square navigates to a detail page showing hizb/rub' breakdown and surah detail within that juz

**4. Current Surah Progress Bar** — segmented horizontal bar:
- Each segment is one rub' within the current surah
- Completed rub's filled green with checkmark label
- Current rub' highlighted with green border
- Upcoming rub's gray
- Hizb markers displayed below the bar with "you are here" indicator

**5. Recent Reviews Table** — columns: Date, Range, Result, Grade, Mistakes. Sorted by date descending. Links to review detail.

### Student Profile Integration

The student profile page shows a summary card with:
- Current surah and ayah
- Juz/Hizb/Rub' position
- Overall progress percentage
- Link to full memorization dashboard

## Meeting Cadence

### Group-level default

Configured on the group settings page (existing page, new section). Options:
- Weekly (default) — aligns with existing `weeklyDay`/`weeklyTime`
- Biweekly — every two weeks
- Twice weekly — two sessions per week
- Custom — specify interval in days

### Per-student override

On the student's memorization plan, moderators can override the group cadence. When set, the student's `nextReviewDate` is calculated from their personal cadence rather than the group's. When null (default), inherits from group.

### Next review date calculation

After a review is saved:
1. Get effective cadence: student override if set, otherwise group default
2. Calculate next date: `reviewDate + cadenceDays`
   - WEEKLY → +7 days
   - BIWEEKLY → +14 days
   - TWICE_WEEKLY → +3 or +4 days (alternating)
   - CUSTOM → +customCadenceDays

## Tajweed Category Management (Admin)

Admin settings page with CRUD for tajweed categories:

- **List**: table with columns — Name (EN), Name (AR), Core/Custom badge, Sort Order, Active toggle
- **Add**: form with `nameEn`, `nameAr`, `sortOrder`. New categories are always `isCore: false`
- **Edit**: same form. Core categories can have names edited but cannot be deleted, only deactivated
- **Delete**: custom categories only. Soft-delete via `active: false` if referenced by existing reviews; hard-delete if unreferenced

Deactivated categories are hidden from new review forms but preserved in historical review data.

## Permissions & Feature Toggle

### Feature Flag

`MEMORIZATION_PLANS` — when disabled, all memorization plan UI (pages, nav items, review forms, student timeline) is hidden. Uses existing `FeatureFlag` model.

### Per-group opt-in

`Group.memorizationPlansEnabled` toggle. When disabled for a group, moderators use only group-level assignments (Phase 3 behavior). When enabled, the memorization plan features appear for that group's students.

### Permissions

| Permission | Description | Default Roles |
|---|---|---|
| `memorization.view` | View memorization plans and reviews | Admin, Moderator |
| `memorization.manage` | Create/edit plans, set pace, configure cadence | Admin, Moderator |
| `memorization.review` | Conduct reviews, grade, log mistakes | Admin, Moderator |
| `tajweed_categories.manage` | Manage tajweed category list | Admin |

Students can view their own plan, timeline, and reviews implicitly (scoped by `studentId`, no separate permission).

## Pages

### New Pages

| Page | Path | Role | Description |
|---|---|---|---|
| Memorization Plans | `/moderator/memorization` | Moderator | List of students with active plans in moderator's groups |
| Student Plan Detail | `/moderator/memorization/[studentId]` | Moderator | Student's plan detail + review history + start new review |
| New Review | `/moderator/memorization/[studentId]/review` | Moderator | The review form |
| Review Detail | `/moderator/memorization/[studentId]/review/[reviewId]` | Moderator | View a past review's details |
| Memorization Dashboard | `/student/memorization` | Student | Juz grid + surah progress bar + reviews |
| Juz Detail | `/student/memorization/juz/[juzNumber]` | Student | Hizb/rub'/surah detail for a specific juz |
| Tajweed Categories | `/admin/settings/tajweed-categories` | Admin | CRUD for tajweed categories |

### Modified Pages

| Page | Change |
|---|---|
| Group Settings (moderator + admin) | Add meeting cadence section + memorization plans enabled toggle |
| Weekly Session Grading | Add "Memorization Review" link button for each student |
| Student Profile | Add memorization summary card with link to dashboard |
| Student Dashboard | Add memorization overview widget (if plan exists) |

## i18n Keys

New namespace: `memorization.*`

Key areas:
- `memorization.plan.*` — plan fields, status labels
- `memorization.review.*` — review form labels, results, mistake categories
- `memorization.tajweed.*` — category names, score labels
- `memorization.dashboard.*` — progress labels, juz grid, surah bar
- `memorization.cadence.*` — meeting frequency options

## Service Layer

### `memorization-plan.service.ts`

- `createPlan(studentId, groupId, initialSurahId, initialAyahId, paceUnit, paceValue)`
- `updatePlan(planId, updates)` — pace, cadence overrides
- `getPlanByStudent(studentId, groupId)`
- `getPlansForGroup(groupId)` — moderator list view
- `getStudentProgress(planId)` — computed juz/hizb/rub'/page/percentage from current position

### `memorization-review.service.ts`

- `createReview(data)` — transactional: creates review + tajweed scores + mistakes + updates plan position + calculates next review date
- `getReviewsByPlan(planId, pagination)`
- `getReviewDetail(reviewId)`
- `calculateNextHomework(planId)` — auto-suggestion logic

### `tajweed-category.service.ts`

- `listCategories(includeInactive?)`
- `createCategory(nameEn, nameAr, sortOrder)`
- `updateCategory(id, updates)`
- `toggleActive(id)`

## Validation Schemas (Zod)

- `createPlanSchema` — studentId, groupId, surahId, ayahId, paceUnit, paceValue (with conditional min based on unit)
- `updatePlanSchema` — partial plan updates
- `createReviewSchema` — full review form validation including nested tajweed scores array and mistakes array
- `tajweedCategorySchema` — nameEn, nameAr, sortOrder

## Audit Logging

All mutations logged to existing `AuditLog`:
- `MEMORIZATION_PLAN_CREATED/UPDATED`
- `MEMORIZATION_REVIEW_CREATED`
- `TAJWEED_CATEGORY_CREATED/UPDATED/DEACTIVATED`
