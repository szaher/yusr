# Phase 11b: Student Progress Tracking — Design Spec

## Goal

Add memorization milestone detection, weekly review streak tracking, custom moderator-defined goals, and progress pages for admin, moderator, and student roles. Milestones are auto-detected when a student's memorization position crosses Quran structural boundaries (juz, hizb, surah). Notifications fire on milestone achievement.

## Background

Memorization progress is tracked per student via `StudentMemorizationPlan` (current position: surah + ayah) and `MemorizationReview` (review history with grades). The `createReview` function in `memorization-review.ts` updates the plan's `currentSurahId`/`currentAyahNumber` in a transaction. `QuranAyah` has `juzNumber`, `hizbNumber`, `quarterNumber` fields that define structural boundaries. The analytics service already computes `memorizationProgress` (avg review grade) and basic KPIs.

What's missing: milestone/achievement tracking, review streaks, custom goals, and dedicated progress pages.

## Data Model

### New: StudentMilestone

Records achieved milestones — both auto-detected and custom goal completions.

```prisma
model StudentMilestone {
  id         String              @id @default(cuid())
  studentId  String
  student    StudentProfile      @relation(fields: [studentId], references: [id])
  planId     String
  plan       StudentMemorizationPlan @relation(fields: [planId], references: [id])
  type       String
  value      String
  label      String
  achievedAt DateTime            @default(now())

  @@unique([studentId, type, value])
  @@index([studentId])
  @@index([planId])
}
```

- `type`: one of `JUZ_COMPLETE`, `HIZB_COMPLETE`, `SURAH_COMPLETE`, `CUSTOM_GOAL`
- `value`: the numeric identifier as string — juz number ("1"–"30"), hizb number ("1"–"60"), surah number ("1"–"114"), or custom goal ID
- `label`: human-readable text, e.g. "Completed Juz 1 — الجُزْءُ الأوَّل", "Memorized Surah Al-Baqarah"
- Unique constraint on `[studentId, type, value]` prevents duplicate milestones

### New: CustomGoal

Moderator-defined memorization targets per student plan.

```prisma
model CustomGoal {
  id                 String              @id @default(cuid())
  planId             String
  plan               StudentMemorizationPlan @relation(fields: [planId], references: [id])
  createdById        String
  createdBy          User                @relation("goalCreator", fields: [createdById], references: [id])
  targetSurahNumber  Int
  targetAyahNumber   Int
  targetSurah        QuranSurah          @relation(fields: [targetSurahNumber], references: [number])
  deadline           DateTime?
  completedAt        DateTime?
  title              String
  createdAt          DateTime            @default(now())

  @@index([planId])
}
```

- `targetSurahNumber` + `targetAyahNumber`: the position the student must reach or pass
- `deadline`: optional target date
- `completedAt`: null while in progress, set when student reaches the target
- `title`: moderator-provided label (e.g., "Complete Surah Yasin by June")

### Reverse Relations

Add to `StudentProfile`:
```prisma
milestones StudentMilestone[]
```

Add to `StudentMemorizationPlan`:
```prisma
milestones  StudentMilestone[]
customGoals CustomGoal[]
```

Add to `User`:
```prisma
createdGoals CustomGoal[] @relation("goalCreator")
```

Add to `QuranSurah`:
```prisma
customGoals CustomGoal[]
```

### Review Streaks — No Model Needed

Streaks are computed on the fly from `MemorizationReview.reviewDate`. Group reviews by ISO week number, count consecutive weeks (from most recent backward) with at least one review. No separate model needed — the review table is the source of truth.

### Existing Models (no changes)

- `MemorizationReview` — review history, already has `reviewDate`
- `QuranAyah` — has `juzNumber`, `hizbNumber` for boundary detection
- `QuranSurah` — has `ayahCount` for surah completion detection
- `Notification` — used for milestone notifications

## Feature Flag

Key: `progress_tracking`. Seed default: `enabled: true`.

Sidebar nav entries for `/admin/progress`, `/moderator/progress`, `/student/progress` gated by this flag.

## Service Layer

### server/services/progress.ts

#### Milestone Detection

- `checkMilestones(planId, previousSurahNumber, previousAyahNumber, newSurahNumber, newAyahNumber)` — called after each review updates the plan position. Logic:
  1. Query `QuranAyah` for the old and new positions to get their `juzNumber`, `hizbNumber`, `surahNumber`
  2. If `newJuz > oldJuz`: for each crossed juz boundary, create `JUZ_COMPLETE` milestone
  3. If `newHizb > oldHizb`: for each crossed hizb boundary, create `HIZB_COMPLETE` milestone
  4. If `newSurah > oldSurah`: for each surah between old and new (exclusive of the new one unless at ayah 1 of the next), check if the old surah was completed. Create `SURAH_COMPLETE` milestone for completed surahs.
  5. Skip creating duplicates — the unique constraint handles this, but check first to avoid unnecessary errors
  6. For each new milestone: create notification to student (type `MILESTONE_ACHIEVED`) and to the plan's group moderator

- `checkCustomGoals(planId, newSurahNumber, newAyahNumber)` — called alongside `checkMilestones`. Logic:
  1. Query active custom goals for the plan (`completedAt IS NULL`)
  2. For each goal, compare student's new position to `targetSurahNumber`/`targetAyahNumber`
  3. A goal is complete when the student's position is at or past the target (compare surah first, then ayah within same surah)
  4. Mark complete: set `completedAt = now()`, create `CUSTOM_GOAL` milestone, notify student + moderator

#### Query Functions

- `getStudentMilestones(studentProfileId, limit?)` — all milestones ordered by `achievedAt` desc. Default limit 50.
- `getReviewStreak(studentProfileId)` — returns `{ currentStreak: number, longestStreak: number }`. Logic: query all `MemorizationReview` dates for the student's active plans, group by ISO week, count consecutive weeks from most recent backward for current streak. Scan all weeks for longest streak.
- `getStudentProgressSummary(studentProfileId)` — aggregates:
  - `quranPercentage`: from existing `getStudentProgress(planId)` — percentage of total ayahs
  - `juzCompleted`: count of `JUZ_COMPLETE` milestones
  - `surahsCompleted`: count of `SURAH_COMPLETE` milestones
  - `reviewStreak`: current and longest from `getReviewStreak`
  - `latestMilestone`: most recent milestone
  - `totalMilestones`: count
- `getGroupProgressOverview(groupId)` — for each student in the group: name, Quran %, juz count, current streak, last review date. Sorted by Quran % descending.
- `getSchoolProgressStats()` — school-wide:
  - `milestonesThisMonth`: count of milestones in last 30 days
  - `studentsWithActivePlans`: count
  - `avgQuranPercentage`: average across all active plans
  - `topStreak`: highest current review streak
- `getTopPerformers(limit?)` — students with most milestones, default top 10
- `getMilestonesByMonth()` — monthly counts grouped by type for last 6 months
- `getGroupProgressComparison()` — avg Quran % per group for comparison chart

#### Custom Goal Management

- `createCustomGoal(planId, data, actorId)` — create a goal with validation (target must be ahead of current position). Creates audit log.
- `getCustomGoals(planId)` — list all goals for a plan, active first then completed
- `deleteCustomGoal(goalId, actorId)` — delete an incomplete goal. Creates audit log.

### server/actions/progress.ts

Server actions for:
- `createCustomGoalAction(planId, data)` — moderator creates a goal. Validates moderator owns the group.
- `deleteCustomGoalAction(goalId)` — moderator deletes an incomplete goal.

### Hook into createReview

In `server/services/memorization-review.ts`, after the transaction in `createReview` that updates the plan's current position:

1. Capture the old position (surah + ayah) before the update
2. After the transaction commits, call `checkMilestones(planId, oldSurah, oldAyah, newSurah, newAyah)`
3. Also call `checkCustomGoals(planId, newSurah, newAyah)`

## Pages

### Student: /student/progress

1. **KPI Cards** (top row):
   - Quran % complete (from plan's ayah position / total 6236)
   - Juz completed (count / 30)
   - Current review streak (weeks)
   - Longest review streak (weeks)

2. **Active Custom Goals** (if any):
   - Card per goal: title, target surah/ayah, deadline (if set), progress bar
   - Completed goals shown with checkmark

3. **Milestone Timeline**:
   - Chronological list (most recent first)
   - Icon per type: trophy (juz), star (surah), flag (hizb), target (custom goal)
   - Date and label for each

4. **Monthly Reviews Chart** (LineChartCard):
   - Reviews per month, last 6 months

### Moderator: /moderator/progress

1. **Group Selector** (same pattern as attendance page — Badge tabs)

2. **Group Progress Table**:
   - Columns: Student Name, Quran %, Juz Count, Current Streak, Last Review
   - Click row → `/moderator/progress/[studentId]`
   - Sorted by Quran % descending

3. **Recent Milestones Feed**:
   - Latest milestones across the selected group, last 10
   - Student name + milestone label + date

4. **Add Custom Goal Button**:
   - Opens inline form or card: select student, set target surah/ayah, optional deadline, title
   - Calls `createCustomGoalAction`

### Moderator: /moderator/progress/[studentId]

1. **Student Header**: Name, group, Quran %

2. **KPI Cards**: Same as student view (%, juz, streaks)

3. **Custom Goals Section**:
   - List of goals with status (active/completed)
   - Add goal form
   - Delete button on incomplete goals

4. **Milestone Timeline**: Same as student view

5. **Monthly Reviews Chart**

### Admin: /admin/progress

1. **KPI Cards**:
   - Milestones this month
   - Students with active plans
   - Average Quran %
   - Top review streak

2. **Milestones by Month Chart** (StackedBarChartCard):
   - Stacked bars: JUZ (gold), SURAH (green), HIZB (blue), CUSTOM (purple)
   - Last 6 months

3. **Group Comparison Chart** (BarChartCard):
   - Average Quran % per group

4. **Top Performers Table**:
   - Columns: Student Name, Group, Quran %, Milestones, Current Streak
   - Top 10 by milestone count

## i18n Keys

Namespace: `progress`

```
title, myProgress, groupProgress, schoolProgress,
quranPercentage, juzCompleted, juzCount,
currentStreak, longestStreak, weeksStreak,
milestones, milestonesThisMonth, recentMilestones,
milestone_JUZ_COMPLETE, milestone_HIZB_COMPLETE,
milestone_SURAH_COMPLETE, milestone_CUSTOM_GOAL,
customGoals, addGoal, deleteGoal, goalTitle,
targetSurah, targetAyah, deadline, completed, active, inProgress,
progressPercentage, noMilestones, noActiveGoals,
studentsWithPlans, avgQuranPercentage, topStreak,
topPerformers, monthlyReviews, groupComparison,
lastReview, reviewCount, goalCompleted, goalDeleted,
confirmDeleteGoal
```

Arabic translations follow existing app patterns.

## Sidebar Navigation

Add to all three role nav arrays in `components/layout/sidebar.tsx`:

- Admin: `{ labelKey: "progress", href: "/admin/progress", icon: TrendingUp, featureFlag: "progress_tracking" }`
- Moderator: `{ labelKey: "progress", href: "/moderator/progress", icon: TrendingUp, featureFlag: "progress_tracking" }`
- Student: `{ labelKey: "progress", href: "/student/progress", icon: TrendingUp, featureFlag: "progress_tracking" }`

Nav label i18n key: `nav.progress` = "Progress" / "التقدم"

## Milestone Detection Logic (Detail)

### Position Comparison

The Quran is ordered: Surah 1 Ayah 1 → Surah 1 Ayah 7 → Surah 2 Ayah 1 → ... → Surah 114 Ayah 6.

To compare positions: `(surahNumber, ayahNumber)` tuples are compared lexicographically — surah first, then ayah.

A position "passes" a target when:
- `newSurah > targetSurah`, OR
- `newSurah === targetSurah && newAyah >= targetAyah`

### Juz/Hizb Boundary Detection

Query `QuranAyah` for the old and new positions to get their `juzNumber` and `hizbNumber`.

When the new position's `juzNumber` is greater than the old position's `juzNumber`, the student has entered a new juz — meaning they completed the previous one(s). Create `JUZ_COMPLETE` milestones for juz numbers `oldJuz` through `newJuz - 1`. Same logic for hizb: create `HIZB_COMPLETE` milestones for hizb numbers `oldHizb` through `newHizb - 1`.

For surah completion: if `newSurahNumber > oldSurahNumber`, the student moved to a new surah — meaning they completed the old one. Create `SURAH_COMPLETE` for surah numbers `oldSurah` through `newSurah - 1`.

### Edge Cases

- Student jumps multiple juz in one review (bulk assignment): create milestones for each
- Same milestone already exists (re-review): unique constraint prevents duplicates, catch and skip
- Student moves backward (correction): don't delete milestones — once achieved, they stay
- Student has no plan: skip milestone checks
- First review ever: old position is the plan's starting position

## Notification Flow

When `checkMilestones` creates a new milestone:
1. Notify the student: type `MILESTONE_ACHIEVED`, title "Milestone: {label}", body includes encouragement
2. Notify the moderator of the student's group: same type, title includes student name
3. No deduplication needed — the milestone unique constraint prevents duplicate milestones, so notifications only fire once

When `checkCustomGoals` completes a goal:
1. Same notification pattern as structural milestones
2. Goal title included in notification

## Audit Logging

- `CUSTOM_GOAL_CREATE` — moderator creates a goal (metadata: planId, title, target)
- `CUSTOM_GOAL_DELETE` — moderator deletes a goal (metadata: goalId, title)

## Constraints & Edge Cases

- A student with no active memorization plan sees empty progress page with "No active plan" message
- Review streaks use ISO weeks (Mon–Sun) to avoid timezone issues
- Milestones are permanent — correcting a review backward doesn't remove them
- Custom goals can only target positions ahead of the student's current position (validated on creation)
- Deleting a custom goal that's already completed is not allowed
- The `CUSTOM_GOAL` milestone's `value` field stores the goal ID, allowing linking back

## Out of Scope

- Parent accounts and parent notifications (Phase 11c)
- Gamification (badges, leaderboards, points beyond milestones)
- Social sharing of milestones
- Push notifications (in-app only)
- Milestone certificates or printable reports
