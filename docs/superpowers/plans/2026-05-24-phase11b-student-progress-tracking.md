# Phase 11b: Student Progress Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add memorization milestone detection, weekly review streak tracking, custom moderator-defined goals, and progress pages for admin, moderator, and student roles.

**Architecture:** Event-driven milestone detection hooks into the existing `createReview` flow. After a review updates a student's Quran position, the system checks for crossed structural boundaries (juz, hizb, surah) and custom goal completions. Progress pages aggregate milestones, streaks, and position data using server-side queries.

**Tech Stack:** Next.js 16 (App Router, `params: Promise<{}>`), Prisma 7 (`db push`, no migrations), TypeScript, Recharts, next-intl, Sonner toasts

**Design Spec:** `docs/superpowers/specs/2026-05-24-phase11b-student-progress-tracking-design.md`

---

## File Structure

### Create
- `server/services/progress.ts` — milestone detection, query functions, custom goal CRUD
- `server/actions/progress.ts` — server actions for custom goals
- `components/progress/milestone-timeline.tsx` — reusable milestone display
- `components/progress/custom-goal-form.tsx` — moderator goal creation/management
- `app/[locale]/(dashboard)/student/progress/page.tsx`
- `app/[locale]/(dashboard)/moderator/progress/page.tsx`
- `app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx`
- `app/[locale]/(dashboard)/admin/progress/page.tsx`

### Modify
- `prisma/schema.prisma` — StudentMilestone + CustomGoal models, reverse relations
- `prisma/seed.ts` — `progress_tracking` feature flag
- `server/services/memorization-review.ts` — hook milestone detection into `createReview`
- `components/layout/sidebar.tsx` — add progress nav entries (TrendingUp icon)
- `messages/en.json` — progress namespace i18n keys
- `messages/ar.json` — progress namespace i18n keys

---

## Key Patterns (Reference)

These patterns are established in the codebase. Follow them exactly.

**Page component:** `params: Promise<{ locale: string }>`, `await params`, `setRequestLocale(locale)`, `await requireApprovedUser()`, feature flag check with `notFound()`, `getTranslations("progress")`, `Promise.all([...])` for data.

**Notification:** `createNotification({ recipientId, type, title, body? })` from `@/server/services/notification`.

**Audit:** `createAuditLog({ actorId, action, entityType, entityId, metadata? })` from `@/server/services/audit-log`.

**Server action:** `"use server"`, `requireApprovedUser()`, call service, `revalidatePath(...)`, return `{ success: true }`.

**Moderator group access:** `db.moderatorProfile.findUnique({ where: { userId }, select: { groups: { where: { active: true }, select: { id, name } } } })`.

**Student profile lookup:** `db.studentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } })`.

**Group → Moderator userId:** `db.group.findUnique({ where: { id }, select: { moderator: { select: { userId: true } } } })` — Group has `moderatorId String?` → `ModeratorProfile` which has `userId String`.

---

### Task 1: Schema + Seed

**Files:**
- Modify: `prisma/schema.prisma` — lines 41 (User), 131 (StudentProfile), 557 (QuranSurah), 628 (StudentMemorizationPlan), after 751 (new models)
- Modify: `prisma/seed.ts` — line 80 (feature flags array)

- [ ] **Step 1: Add reverse relations to existing models**

In `prisma/schema.prisma`:

After line 41 (inside User model, after `createdExamInstances`), add:
```prisma
  createdGoals         CustomGoal[]       @relation("goalCreator")
```

After line 131 (inside StudentProfile model, after `examSubmissions`), add:
```prisma
  milestones         StudentMilestone[]
```

After line 557 (inside QuranSurah model, after `examQuestionsTo`), add:
```prisma
  customGoalTargets  CustomGoal[]       @relation("goalTargetSurah")
```

After line 628 (inside StudentMemorizationPlan model, after `reviews MemorizationReview[]`), add:
```prisma
  milestones    StudentMilestone[]
  customGoals   CustomGoal[]
```

- [ ] **Step 2: Add StudentMilestone and CustomGoal models**

After the `AttendanceAlertConfig` model (after line 751), add:

```prisma
model StudentMilestone {
  id         String                  @id @default(cuid())
  studentId  String
  student    StudentProfile          @relation(fields: [studentId], references: [id])
  planId     String
  plan       StudentMemorizationPlan @relation(fields: [planId], references: [id])
  type       String
  value      String
  label      String
  achievedAt DateTime                @default(now())

  @@unique([studentId, type, value])
  @@index([studentId])
  @@index([planId])
}

model CustomGoal {
  id                String                  @id @default(cuid())
  planId            String
  plan              StudentMemorizationPlan @relation(fields: [planId], references: [id])
  createdById       String
  createdBy         User                    @relation("goalCreator", fields: [createdById], references: [id])
  targetSurahNumber Int
  targetAyahNumber  Int
  targetSurah       QuranSurah              @relation("goalTargetSurah", fields: [targetSurahNumber], references: [number])
  deadline          DateTime?
  completedAt       DateTime?
  title             String
  createdAt         DateTime                @default(now())

  @@index([planId])
}
```

- [ ] **Step 3: Add feature flag to seed**

In `prisma/seed.ts`, in the `flags` array inside `seedFeatureFlags()`, add after the `moderator_voice_notes` entry (line 80) and before `quran_explorer` (line 81):

```typescript
    { key: "progress_tracking", enabled: true, description: "Student progress tracking, milestones, and goals" },
```

- [ ] **Step 4: Push schema and regenerate client**

Run: `npx prisma db push`

Expected: Schema pushed successfully, Prisma Client regenerated.

- [ ] **Step 5: Run seed to create feature flag**

Run: `npx prisma db seed`

Expected: Output includes "Seeded 15 feature flags" (was 14).

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -5`

Expected: No new errors (pre-existing permission test errors are OK).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(progress): add StudentMilestone and CustomGoal schema + seed flag"
```

---

### Task 2: Sidebar Navigation + i18n Keys

**Files:**
- Modify: `components/layout/sidebar.tsx` — lines 29 (imports), 53 (admin), 67 (moderator), 82 (student)
- Modify: `messages/en.json` — add `nav.progress` + `progress` namespace
- Modify: `messages/ar.json` — add `nav.progress` + `progress` namespace

- [ ] **Step 1: Add TrendingUp import and nav entries**

In `components/layout/sidebar.tsx`:

Add `TrendingUp` to the lucide-react import (line 8):
```typescript
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookOpenCheck,
  Settings,
  FileText,
  ClipboardList,
  Layers,
  UsersRound,
  ToggleLeft,
  ScrollText,
  Calendar,
  Award,
  CalendarOff,
  Megaphone,
  Headset,
  ClipboardCheck,
  CalendarCheck,
  BookOpenText,
  BookType,
  TrendingUp,
} from "lucide-react";
```

In `adminNav` array, after the attendance entry (line 53), add:
```typescript
  { labelKey: "progress", href: "/admin/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
```

In `moderatorNav` array, after the attendance entry (line 67), add:
```typescript
  { labelKey: "progress", href: "/moderator/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
```

In `studentNav` array, after the attendance entry (line 82), add:
```typescript
  { labelKey: "progress", href: "/student/progress", icon: TrendingUp, featureFlag: "progress_tracking" },
```

- [ ] **Step 2: Add English i18n keys**

In `messages/en.json`, add `"progress"` to the `nav` object:
```json
"progress": "Progress"
```

Add a new top-level `"progress"` namespace:
```json
"progress": {
  "title": "Progress",
  "myProgress": "My Progress",
  "groupProgress": "Group Progress",
  "schoolProgress": "School Progress",
  "quranPercentage": "Quran Memorized",
  "juzCompleted": "Juz Completed",
  "juzCount": "{count} / 30",
  "currentStreak": "Current Streak",
  "longestStreak": "Longest Streak",
  "weeksStreak": "{count} weeks",
  "milestones": "Milestones",
  "milestonesThisMonth": "Milestones This Month",
  "recentMilestones": "Recent Milestones",
  "milestone_JUZ_COMPLETE": "Juz Complete",
  "milestone_HIZB_COMPLETE": "Hizb Complete",
  "milestone_SURAH_COMPLETE": "Surah Complete",
  "milestone_CUSTOM_GOAL": "Goal Achieved",
  "customGoals": "Custom Goals",
  "addGoal": "Add Goal",
  "deleteGoal": "Delete",
  "goalTitle": "Goal Title",
  "targetSurah": "Target Surah",
  "targetAyah": "Target Ayah",
  "deadline": "Deadline",
  "completed": "Completed",
  "active": "Active",
  "inProgress": "In Progress",
  "progressPercentage": "{value}%",
  "noMilestones": "No milestones yet",
  "noActiveGoals": "No active goals",
  "noPlan": "No active memorization plan",
  "studentsWithPlans": "Students with Plans",
  "avgQuranPercentage": "Avg Quran %",
  "topStreak": "Top Streak",
  "topPerformers": "Top Performers",
  "monthlyReviews": "Monthly Reviews",
  "groupComparison": "Progress by Group",
  "milestonesByMonth": "Milestones by Month",
  "lastReview": "Last Review",
  "reviewCount": "Reviews",
  "goalCompleted": "Goal completed",
  "goalDeleted": "Goal deleted",
  "goalCreated": "Goal created",
  "confirmDeleteGoal": "Delete this goal?",
  "studentName": "Student Name",
  "group": "Group",
  "na": "N/A"
}
```

- [ ] **Step 3: Add Arabic i18n keys**

In `messages/ar.json`, add `"progress"` to the `nav` object:
```json
"progress": "التقدم"
```

Add a new top-level `"progress"` namespace:
```json
"progress": {
  "title": "التقدم",
  "myProgress": "تقدمي",
  "groupProgress": "تقدم المجموعة",
  "schoolProgress": "تقدم المدرسة",
  "quranPercentage": "نسبة الحفظ",
  "juzCompleted": "الأجزاء المكتملة",
  "juzCount": "{count} / 30",
  "currentStreak": "السلسلة الحالية",
  "longestStreak": "أطول سلسلة",
  "weeksStreak": "{count} أسابيع",
  "milestones": "الإنجازات",
  "milestonesThisMonth": "إنجازات هذا الشهر",
  "recentMilestones": "آخر الإنجازات",
  "milestone_JUZ_COMPLETE": "إتمام جزء",
  "milestone_HIZB_COMPLETE": "إتمام حزب",
  "milestone_SURAH_COMPLETE": "إتمام سورة",
  "milestone_CUSTOM_GOAL": "تحقيق هدف",
  "customGoals": "الأهداف المخصصة",
  "addGoal": "إضافة هدف",
  "deleteGoal": "حذف",
  "goalTitle": "عنوان الهدف",
  "targetSurah": "السورة المستهدفة",
  "targetAyah": "الآية المستهدفة",
  "deadline": "الموعد النهائي",
  "completed": "مكتمل",
  "active": "نشط",
  "inProgress": "قيد التنفيذ",
  "progressPercentage": "{value}٪",
  "noMilestones": "لا توجد إنجازات بعد",
  "noActiveGoals": "لا توجد أهداف نشطة",
  "noPlan": "لا توجد خطة حفظ نشطة",
  "studentsWithPlans": "طلاب لديهم خطط",
  "avgQuranPercentage": "متوسط نسبة الحفظ",
  "topStreak": "أعلى سلسلة",
  "topPerformers": "أفضل الطلاب",
  "monthlyReviews": "المراجعات الشهرية",
  "groupComparison": "التقدم حسب المجموعة",
  "milestonesByMonth": "الإنجازات حسب الشهر",
  "lastReview": "آخر مراجعة",
  "reviewCount": "المراجعات",
  "goalCompleted": "تم إكمال الهدف",
  "goalDeleted": "تم حذف الهدف",
  "goalCreated": "تم إنشاء الهدف",
  "confirmDeleteGoal": "هل تريد حذف هذا الهدف؟",
  "studentName": "اسم الطالب",
  "group": "المجموعة",
  "na": "غ/م"
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -i progress || echo "No progress errors"`

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx messages/en.json messages/ar.json
git commit -m "feat(progress): add sidebar nav entries and i18n keys"
```

---

### Task 3: Progress Service — Milestone Detection

**Files:**
- Create: `server/services/progress.ts`

- [ ] **Step 1: Create progress service with milestone detection functions**

Create `server/services/progress.ts`:

```typescript
import { db } from "@/server/db/client";
import { createNotification } from "@/server/services/notification";
import { createAuditLog } from "@/server/services/audit-log";

const TOTAL_QURAN_AYAHS = 6236;

async function getQuranPercentage(surahNumber: number, ayahNumber: number): Promise<number> {
  const covered = await db.quranAyah.count({
    where: {
      OR: [
        { surahNumber: { lt: surahNumber } },
        { surahNumber: surahNumber, ayahNumber: { lte: ayahNumber } },
      ],
    },
  });
  return Math.round((covered / TOTAL_QURAN_AYAHS) * 100);
}

export async function checkMilestones(
  planId: string,
  oldSurahNumber: number,
  oldAyahNumber: number,
  newSurahNumber: number,
  newAyahNumber: number,
) {
  const [oldAyah, newAyah] = await Promise.all([
    db.quranAyah.findUnique({
      where: { surahNumber_ayahNumber: { surahNumber: oldSurahNumber, ayahNumber: oldAyahNumber } },
      select: { juzNumber: true, hizbNumber: true },
    }),
    db.quranAyah.findUnique({
      where: { surahNumber_ayahNumber: { surahNumber: newSurahNumber, ayahNumber: newAyahNumber } },
      select: { juzNumber: true, hizbNumber: true },
    }),
  ]);

  if (!oldAyah || !newAyah) return;

  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: {
      studentId: true,
      student: { select: { userId: true } },
      group: { select: { moderator: { select: { userId: true } } } },
    },
  });
  if (!plan) return;

  const newMilestones: { type: string; value: string; label: string }[] = [];

  if (newAyah.juzNumber > oldAyah.juzNumber) {
    for (let juz = oldAyah.juzNumber; juz < newAyah.juzNumber; juz++) {
      const juzInfo = await db.quranJuz.findUnique({ where: { number: juz } });
      newMilestones.push({
        type: "JUZ_COMPLETE",
        value: String(juz),
        label: `Completed Juz ${juz}${juzInfo?.nameAr ? ` — ${juzInfo.nameAr}` : ""}`,
      });
    }
  }

  if (newAyah.hizbNumber > oldAyah.hizbNumber) {
    for (let hizb = oldAyah.hizbNumber; hizb < newAyah.hizbNumber; hizb++) {
      newMilestones.push({
        type: "HIZB_COMPLETE",
        value: String(hizb),
        label: `Completed Hizb ${hizb}`,
      });
    }
  }

  if (newSurahNumber > oldSurahNumber) {
    const surahs = await db.quranSurah.findMany({
      where: { number: { gte: oldSurahNumber, lt: newSurahNumber } },
      select: { number: true, nameAr: true, nameEn: true },
      orderBy: { number: "asc" },
    });
    for (const surah of surahs) {
      newMilestones.push({
        type: "SURAH_COMPLETE",
        value: String(surah.number),
        label: `Memorized Surah ${surah.nameEn} — ${surah.nameAr}`,
      });
    }
  }

  for (const m of newMilestones) {
    try {
      await db.studentMilestone.create({
        data: {
          studentId: plan.studentId,
          planId,
          type: m.type,
          value: m.value,
          label: m.label,
        },
      });

      await createNotification({
        recipientId: plan.student.userId,
        type: "MILESTONE_ACHIEVED",
        title: m.label,
      });

      if (plan.group.moderator?.userId) {
        await createNotification({
          recipientId: plan.group.moderator.userId,
          type: "MILESTONE_ACHIEVED",
          title: m.label,
        });
      }
    } catch {
      // Unique constraint violation — milestone already exists
    }
  }
}

export async function checkCustomGoals(
  planId: string,
  newSurahNumber: number,
  newAyahNumber: number,
) {
  const goals = await db.customGoal.findMany({
    where: { planId, completedAt: null },
  });

  if (goals.length === 0) return;

  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: {
      studentId: true,
      student: { select: { userId: true } },
      group: { select: { moderator: { select: { userId: true } } } },
    },
  });
  if (!plan) return;

  for (const goal of goals) {
    const reached =
      newSurahNumber > goal.targetSurahNumber ||
      (newSurahNumber === goal.targetSurahNumber && newAyahNumber >= goal.targetAyahNumber);

    if (reached) {
      await db.customGoal.update({
        where: { id: goal.id },
        data: { completedAt: new Date() },
      });

      try {
        await db.studentMilestone.create({
          data: {
            studentId: plan.studentId,
            planId,
            type: "CUSTOM_GOAL",
            value: goal.id,
            label: goal.title,
          },
        });
      } catch {
        // Duplicate milestone
      }

      await createNotification({
        recipientId: plan.student.userId,
        type: "MILESTONE_ACHIEVED",
        title: `Goal Completed: ${goal.title}`,
      });

      if (plan.group.moderator?.userId) {
        await createNotification({
          recipientId: plan.group.moderator.userId,
          type: "MILESTONE_ACHIEVED",
          title: `Goal Completed: ${goal.title}`,
        });
      }
    }
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No progress errors"`

- [ ] **Step 3: Commit**

```bash
git add server/services/progress.ts
git commit -m "feat(progress): add milestone detection and custom goal checking"
```

---

### Task 4: Progress Service — Student Query Functions

**Files:**
- Modify: `server/services/progress.ts` — append query functions

- [ ] **Step 1: Add getStudentMilestones, getReviewStreak, getStudentProgressSummary, and getReviewsByMonth**

Append to `server/services/progress.ts`:

```typescript
export async function getStudentMilestones(studentProfileId: string, limit = 50) {
  return db.studentMilestone.findMany({
    where: { studentId: studentProfileId },
    orderBy: { achievedAt: "desc" },
    take: limit,
  });
}

function getMonday(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.getTime();
}

export async function getReviewStreak(studentProfileId: string) {
  const reviews = await db.memorizationReview.findMany({
    where: { plan: { studentId: studentProfileId, active: true } },
    select: { reviewDate: true },
    orderBy: { reviewDate: "desc" },
  });

  if (reviews.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const mondaySet = new Set(reviews.map((r) => getMonday(r.reviewDate)));
  const ascending = Array.from(mondaySet).sort((a, b) => a - b);

  const thisMonday = getMonday(new Date());
  let currentStreak = 0;
  let check = thisMonday;
  if (!mondaySet.has(check)) check -= WEEK_MS;
  while (mondaySet.has(check)) {
    currentStreak++;
    check -= WEEK_MS;
  }

  let longestStreak = 1;
  let streak = 1;
  for (let i = 1; i < ascending.length; i++) {
    if (ascending[i] - ascending[i - 1] === WEEK_MS) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  return { currentStreak, longestStreak };
}

export async function getStudentProgressSummary(studentProfileId: string) {
  const plan = await db.studentMemorizationPlan.findFirst({
    where: { studentId: studentProfileId, active: true },
    select: { id: true, currentSurahId: true, currentAyahNumber: true },
  });

  if (!plan) return null;

  const [quranPercentage, milestones, streak] = await Promise.all([
    getQuranPercentage(plan.currentSurahId, plan.currentAyahNumber),
    db.studentMilestone.findMany({
      where: { studentId: studentProfileId },
      orderBy: { achievedAt: "desc" },
    }),
    getReviewStreak(studentProfileId),
  ]);

  return {
    planId: plan.id,
    quranPercentage,
    juzCompleted: milestones.filter((m) => m.type === "JUZ_COMPLETE").length,
    surahsCompleted: milestones.filter((m) => m.type === "SURAH_COMPLETE").length,
    reviewStreak: streak,
    latestMilestone: milestones[0] ?? null,
    totalMilestones: milestones.length,
  };
}

export async function getReviewsByMonth(studentProfileId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const reviews = await db.memorizationReview.findMany({
    where: {
      plan: { studentId: studentProfileId, active: true },
      reviewDate: { gte: sixMonthsAgo },
    },
    select: { reviewDate: true },
  });

  const months: Record<string, { label: string; value: number }> = {};
  for (const r of reviews) {
    const d = new Date(r.reviewDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    if (!months[key]) months[key] = { label, value: 0 };
    months[key].value++;
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No progress errors"`

- [ ] **Step 3: Commit**

```bash
git add server/services/progress.ts
git commit -m "feat(progress): add student query functions — milestones, streaks, summary"
```

---

### Task 5: Progress Service — Group and School Query Functions

**Files:**
- Modify: `server/services/progress.ts` — append group/school queries

- [ ] **Step 1: Add getGroupProgressOverview**

Append to `server/services/progress.ts`:

```typescript
export async function getGroupProgressOverview(groupId: string) {
  const groupStudents = await db.groupStudent.findMany({
    where: { groupId },
    select: {
      student: {
        select: {
          id: true,
          user: { select: { name: true } },
          memorizationPlans: {
            where: { groupId, active: true },
            select: { id: true, currentSurahId: true, currentAyahNumber: true },
            take: 1,
          },
        },
      },
    },
  });

  const results = await Promise.all(
    groupStudents.map(async (gs) => {
      const plan = gs.student.memorizationPlans[0];
      if (!plan) {
        return {
          studentId: gs.student.id,
          studentName: gs.student.user.name,
          quranPercentage: 0,
          juzCount: 0,
          currentStreak: 0,
          lastReview: null as Date | null,
        };
      }

      const [quranPct, juzCount, streak, latest] = await Promise.all([
        getQuranPercentage(plan.currentSurahId, plan.currentAyahNumber),
        db.studentMilestone.count({ where: { studentId: gs.student.id, type: "JUZ_COMPLETE" } }),
        getReviewStreak(gs.student.id),
        db.memorizationReview.findFirst({
          where: { planId: plan.id },
          orderBy: { reviewDate: "desc" },
          select: { reviewDate: true },
        }),
      ]);

      return {
        studentId: gs.student.id,
        studentName: gs.student.user.name,
        quranPercentage: quranPct,
        juzCount,
        currentStreak: streak.currentStreak,
        lastReview: latest?.reviewDate ?? null,
      };
    })
  );

  return results.sort((a, b) => b.quranPercentage - a.quranPercentage);
}
```

- [ ] **Step 2: Add getSchoolProgressStats, getTopPerformers, getMilestonesByMonth, getGroupProgressComparison**

Append to `server/services/progress.ts`:

```typescript
export async function getSchoolProgressStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [milestonesThisMonth, activePlans] = await Promise.all([
    db.studentMilestone.count({ where: { achievedAt: { gte: thirtyDaysAgo } } }),
    db.studentMemorizationPlan.findMany({
      where: { active: true },
      select: { currentSurahId: true, currentAyahNumber: true, studentId: true },
    }),
  ]);

  let avgQuranPercentage = 0;
  let topStreak = 0;

  if (activePlans.length > 0) {
    const percentages = await Promise.all(
      activePlans.map((p) => getQuranPercentage(p.currentSurahId, p.currentAyahNumber))
    );
    avgQuranPercentage = Math.round(
      percentages.reduce((a, b) => a + b, 0) / percentages.length
    );

    const studentIds = [...new Set(activePlans.map((p) => p.studentId))];
    const streaks = await Promise.all(
      studentIds.map(async (id) => (await getReviewStreak(id)).currentStreak)
    );
    topStreak = Math.max(0, ...streaks);
  }

  return {
    milestonesThisMonth,
    studentsWithActivePlans: activePlans.length,
    avgQuranPercentage,
    topStreak,
  };
}

export async function getTopPerformers(limit = 10) {
  const performers = await db.studentMilestone.groupBy({
    by: ["studentId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return Promise.all(
    performers.map(async (p) => {
      const student = await db.studentProfile.findUnique({
        where: { id: p.studentId },
        select: {
          user: { select: { name: true } },
          groupStudents: { select: { group: { select: { name: true } } }, take: 1 },
          memorizationPlans: {
            where: { active: true },
            select: { currentSurahId: true, currentAyahNumber: true },
            take: 1,
          },
        },
      });

      const plan = student?.memorizationPlans[0];
      const quranPercentage = plan
        ? await getQuranPercentage(plan.currentSurahId, plan.currentAyahNumber)
        : 0;
      const streak = await getReviewStreak(p.studentId);

      return {
        studentId: p.studentId,
        studentName: student?.user.name ?? "—",
        groupName: student?.groupStudents[0]?.group.name ?? "—",
        quranPercentage,
        milestoneCount: p._count.id,
        currentStreak: streak.currentStreak,
      };
    })
  );
}

export async function getMilestonesByMonth() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const milestones = await db.studentMilestone.findMany({
    where: { achievedAt: { gte: sixMonthsAgo } },
    select: { type: true, achievedAt: true },
  });

  const months: Record<string, { label: string; juz: number; surah: number; hizb: number; custom: number }> = {};

  for (const m of milestones) {
    const d = new Date(m.achievedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (!months[key]) months[key] = { label, juz: 0, surah: 0, hizb: 0, custom: 0 };
    if (m.type === "JUZ_COMPLETE") months[key].juz++;
    else if (m.type === "SURAH_COMPLETE") months[key].surah++;
    else if (m.type === "HIZB_COMPLETE") months[key].hizb++;
    else if (m.type === "CUSTOM_GOAL") months[key].custom++;
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export async function getGroupProgressComparison() {
  const groups = await db.group.findMany({
    where: { active: true },
    select: {
      name: true,
      memorizationPlans: {
        where: { active: true },
        select: { currentSurahId: true, currentAyahNumber: true },
      },
    },
  });

  const results = await Promise.all(
    groups.map(async (g) => {
      if (g.memorizationPlans.length === 0) return { label: g.name, value: 0 };
      const pcts = await Promise.all(
        g.memorizationPlans.map((p) => getQuranPercentage(p.currentSurahId, p.currentAyahNumber))
      );
      return { label: g.name, value: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
    })
  );

  return results.sort((a, b) => b.value - a.value);
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No progress errors"`

- [ ] **Step 4: Commit**

```bash
git add server/services/progress.ts
git commit -m "feat(progress): add group and school query functions"
```

---

### Task 6: Progress Service — Custom Goal Management

**Files:**
- Modify: `server/services/progress.ts` — append custom goal CRUD

- [ ] **Step 1: Add createCustomGoal, getCustomGoals, deleteCustomGoal**

Append to `server/services/progress.ts`:

```typescript
export async function createCustomGoal(
  planId: string,
  data: { title: string; targetSurahNumber: number; targetAyahNumber: number; deadline?: string },
  actorId: string,
) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: { currentSurahId: true, currentAyahNumber: true },
  });

  if (!plan) throw new Error("Plan not found");

  const ahead =
    data.targetSurahNumber > plan.currentSurahId ||
    (data.targetSurahNumber === plan.currentSurahId && data.targetAyahNumber > plan.currentAyahNumber);

  if (!ahead) throw new Error("Target must be ahead of current position");

  const goal = await db.customGoal.create({
    data: {
      planId,
      createdById: actorId,
      targetSurahNumber: data.targetSurahNumber,
      targetAyahNumber: data.targetAyahNumber,
      deadline: data.deadline ? new Date(data.deadline) : null,
      title: data.title,
    },
  });

  await createAuditLog({
    actorId,
    action: "CUSTOM_GOAL_CREATE",
    entityType: "CustomGoal",
    entityId: goal.id,
    metadata: { planId, title: data.title, targetSurahNumber: data.targetSurahNumber, targetAyahNumber: data.targetAyahNumber },
  });

  return goal;
}

export async function getCustomGoals(planId: string) {
  return db.customGoal.findMany({
    where: { planId },
    include: { targetSurah: { select: { nameAr: true, nameEn: true } } },
    orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function deleteCustomGoal(goalId: string, actorId: string) {
  const goal = await db.customGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");
  if (goal.completedAt) throw new Error("Cannot delete a completed goal");

  await db.customGoal.delete({ where: { id: goalId } });

  await createAuditLog({
    actorId,
    action: "CUSTOM_GOAL_DELETE",
    entityType: "CustomGoal",
    entityId: goalId,
    metadata: { planId: goal.planId, title: goal.title },
  });
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No progress errors"`

- [ ] **Step 3: Commit**

```bash
git add server/services/progress.ts
git commit -m "feat(progress): add custom goal management functions"
```

---

### Task 7: Server Actions

**Files:**
- Create: `server/actions/progress.ts`

- [ ] **Step 1: Create server actions file**

Create `server/actions/progress.ts`:

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { createCustomGoal, deleteCustomGoal } from "@/server/services/progress";
import { revalidatePath } from "next/cache";

export async function createCustomGoalAction(
  planId: string,
  data: { title: string; targetSurahNumber: number; targetAyahNumber: number; deadline?: string },
) {
  const session = await requireApprovedUser();
  await createCustomGoal(planId, data, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "page");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}

export async function deleteCustomGoalAction(goalId: string) {
  const session = await requireApprovedUser();
  await deleteCustomGoal(goalId, session.user.id);
  revalidatePath("/[locale]/moderator/progress", "page");
  revalidatePath("/[locale]/student/progress", "page");
  return { success: true };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No progress errors"`

- [ ] **Step 3: Commit**

```bash
git add server/actions/progress.ts
git commit -m "feat(progress): add server actions for custom goal management"
```

---

### Task 8: Hook Milestone Detection into createReview

**Files:**
- Modify: `server/services/memorization-review.ts` — lines 1-3 (imports), 29-110 (createReview)

- [ ] **Step 1: Add import**

In `server/services/memorization-review.ts`, add after line 2:

```typescript
import { checkMilestones, checkCustomGoals } from "./progress";
```

- [ ] **Step 2: Modify createReview to capture old position and call milestone checks**

The current `createReview` function (line 29) does `return db.$transaction(...)`. Restructure it:

Replace lines 29–110 with:

```typescript
export async function createReview(input: CreateReviewInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: input.planId },
    include: {
      group: { select: { meetingCadence: true, customCadenceDays: true } },
    },
  });

  if (!plan) throw new Error("Plan not found");

  const oldSurahNumber = plan.currentSurahId;
  const oldAyahNumber = plan.currentAyahNumber;

  const effectiveCadence = plan.meetingCadence || plan.group.meetingCadence;
  const effectiveCustomDays = plan.customCadenceDays || plan.group.customCadenceDays;
  const reviewDate = new Date();
  const nextReviewDate = calculateNextReviewDate(reviewDate, effectiveCadence, effectiveCustomDays);

  const review = await db.$transaction(async (tx) => {
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

  checkMilestones(input.planId, oldSurahNumber, oldAyahNumber, input.toSurahNumber, input.toAyah).catch(() => {});
  checkCustomGoals(input.planId, input.toSurahNumber, input.toAyah).catch(() => {});

  return review;
}
```

Key changes from original:
1. Save `oldSurahNumber`/`oldAyahNumber` before the transaction (lines with `const old...`)
2. Store transaction result in `review` variable instead of directly returning
3. After transaction: call `checkMilestones` and `checkCustomGoals` (fire-and-forget with `.catch(() => {})` to not block the response)
4. Return `review`

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "memorization-review" || echo "No errors"`

- [ ] **Step 4: Commit**

```bash
git add server/services/memorization-review.ts
git commit -m "feat(progress): hook milestone detection into createReview"
```

---

### Task 9: Milestone Timeline Component

**Files:**
- Create: `components/progress/milestone-timeline.tsx`

- [ ] **Step 1: Create milestone timeline component**

Create `components/progress/milestone-timeline.tsx`:

```typescript
"use client";

import { Trophy, Star, Flag, Target } from "lucide-react";

type Milestone = {
  id: string;
  type: string;
  label: string;
  achievedAt: Date | string;
};

const typeIcons: Record<string, React.ElementType> = {
  JUZ_COMPLETE: Trophy,
  SURAH_COMPLETE: Star,
  HIZB_COMPLETE: Flag,
  CUSTOM_GOAL: Target,
};

const typeColors: Record<string, string> = {
  JUZ_COMPLETE: "text-amber-500",
  SURAH_COMPLETE: "text-green-500",
  HIZB_COMPLETE: "text-blue-500",
  CUSTOM_GOAL: "text-purple-500",
};

export function MilestoneTimeline({
  milestones,
  emptyMessage,
}: {
  milestones: Milestone[];
  emptyMessage: string;
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {milestones.map((m) => {
        const Icon = typeIcons[m.type] ?? Target;
        const color = typeColors[m.type] ?? "text-muted-foreground";
        return (
          <div key={m.id} className="flex items-start gap-3">
            <div className={`mt-0.5 ${color}`}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(m.achievedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "milestone-timeline" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add components/progress/milestone-timeline.tsx
git commit -m "feat(progress): add milestone timeline component"
```

---

### Task 10: Custom Goal Form Component

**Files:**
- Create: `components/progress/custom-goal-form.tsx`

- [ ] **Step 1: Create custom goal form component**

Create `components/progress/custom-goal-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomGoalAction, deleteCustomGoalAction } from "@/server/actions/progress";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  targetSurahNumber: number;
  targetAyahNumber: number;
  deadline: string | null;
  completedAt: string | null;
  targetSurah: { nameAr: string; nameEn: string };
};

type Surah = {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
};

export function CustomGoalForm({
  planId,
  goals,
  surahs,
}: {
  planId: string;
  goals: Goal[];
  surahs: Surah[];
}) {
  const t = useTranslations("progress");
  const [title, setTitle] = useState("");
  const [surahNumber, setSurahNumber] = useState("");
  const [ayahNumber, setAyahNumber] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !surahNumber || !ayahNumber) return;
    setLoading(true);
    try {
      await createCustomGoalAction(planId, {
        title,
        targetSurahNumber: parseInt(surahNumber),
        targetAyahNumber: parseInt(ayahNumber),
        deadline: deadline || undefined,
      });
      toast.success(t("goalCreated"));
      setTitle("");
      setSurahNumber("");
      setAyahNumber("");
      setDeadline("");
    } catch {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!confirm(t("confirmDeleteGoal"))) return;
    try {
      await deleteCustomGoalAction(goalId);
      toast.success(t("goalDeleted"));
    } catch {
      toast.error("Error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("customGoals")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {goal.completedAt ? "✓ " : ""}
                    {goal.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("targetSurah")}: {goal.targetSurah.nameAr} ({goal.targetSurah.nameEn}) — {t("targetAyah")}: {goal.targetAyahNumber}
                    {goal.deadline && ` — ${t("deadline")}: ${new Date(goal.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                {!goal.completedAt && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("goalTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("targetSurah")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={surahNumber}
              onChange={(e) => setSurahNumber(e.target.value)}
            >
              <option value="">—</option>
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.nameAr} ({s.nameEn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("targetAyah")}</Label>
            <Input
              type="number"
              min={1}
              value={ayahNumber}
              onChange={(e) => setAyahNumber(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("deadline")}</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="w-full">
              {t("addGoal")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "custom-goal-form" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add components/progress/custom-goal-form.tsx
git commit -m "feat(progress): add custom goal form component"
```

---

### Task 11: Student Progress Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/progress/page.tsx`

- [ ] **Step 1: Create student progress page**

Create `app/[locale]/(dashboard)/student/progress/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentProgressSummary,
  getStudentMilestones,
  getReviewsByMonth,
  getCustomGoals,
} from "@/server/services/progress";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { MilestoneTimeline } from "@/components/progress/milestone-timeline";

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) notFound();

  const summary = await getStudentProgressSummary(profile.id);

  if (!summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("myProgress")}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const [milestones, reviewsByMonth, goals] = await Promise.all([
    getStudentMilestones(profile.id),
    getReviewsByMonth(profile.id),
    getCustomGoals(summary.planId),
  ]);

  const activeGoals = goals.filter((g) => !g.completedAt);
  const completedGoals = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("myProgress")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("quranPercentage")}
          value={`${summary.quranPercentage}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("juzCompleted")}
          value={t("juzCount", { count: summary.juzCompleted })}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.longestStreak })}
          colorClass="text-purple-600"
        />
      </div>

      {(activeGoals.length > 0 || completedGoals.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("customGoals")}</h2>
          <div className="space-y-2">
            {activeGoals.map((goal) => (
              <div key={goal.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t("targetSurah")}: {goal.targetSurah.nameAr} — {t("targetAyah")}: {goal.targetAyahNumber}
                  {goal.deadline && ` — ${t("deadline")}: ${new Date(goal.deadline).toLocaleDateString()}`}
                </p>
              </div>
            ))}
            {completedGoals.map((goal) => (
              <div key={goal.id} className="rounded-md border p-3 opacity-60">
                <p className="text-sm font-medium">✓ {goal.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("milestones")}</h2>
          <MilestoneTimeline milestones={milestones} emptyMessage={t("noMilestones")} />
        </div>
        <LineChartCard title={t("monthlyReviews")} data={reviewsByMonth} color="#8b5cf6" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "student/progress" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/progress/page.tsx
git commit -m "feat(progress): add student progress page"
```

---

### Task 12: Moderator Progress Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/progress/page.tsx`

- [ ] **Step 1: Create moderator progress page**

Create `app/[locale]/(dashboard)/moderator/progress/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { getGroupProgressOverview } from "@/server/services/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ModeratorProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");
  const sp = await searchParams;

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      groups: {
        where: { active: true },
        select: { id: true, name: true },
      },
    },
  });

  const groups = profile?.groups ?? [];
  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("groupProgress")}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const selectedGroupId =
    sp.group && groups.some((g) => g.id === sp.group) ? sp.group : groups[0].id;

  const overview = await getGroupProgressOverview(selectedGroupId);

  const recentMilestones = await db.studentMilestone.findMany({
    where: {
      student: { groupStudents: { some: { groupId: selectedGroupId } } },
    },
    orderBy: { achievedAt: "desc" },
    take: 10,
    include: { student: { select: { user: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("groupProgress")}</h1>

      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <a key={g.id} href={`?group=${g.id}`}>
              <Badge
                variant={g.id === selectedGroupId ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("groupProgress")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("quranPercentage")}</TableHead>
                <TableHead>{t("juzCompleted")}</TableHead>
                <TableHead>{t("currentStreak")}</TableHead>
                <TableHead>{t("lastReview")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/progress/${s.studentId}`}
                      className="font-medium hover:underline"
                    >
                      {s.studentName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.quranPercentage}%</Badge>
                  </TableCell>
                  <TableCell>{s.juzCount}</TableCell>
                  <TableCell>{t("weeksStreak", { count: s.currentStreak })}</TableCell>
                  <TableCell>
                    {s.lastReview
                      ? new Date(s.lastReview).toLocaleDateString()
                      : t("na")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {recentMilestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("recentMilestones")}</h2>
          <div className="space-y-2">
            {recentMilestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.student.user.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.achievedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "moderator/progress" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/progress/page.tsx
git commit -m "feat(progress): add moderator progress page with group overview"
```

---

### Task 13: Moderator Student Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx`

- [ ] **Step 1: Create moderator student progress detail page**

Create `app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentProgressSummary,
  getStudentMilestones,
  getReviewsByMonth,
  getCustomGoals,
} from "@/server/services/progress";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { MilestoneTimeline } from "@/components/progress/milestone-timeline";
import { CustomGoalForm } from "@/components/progress/custom-goal-form";
import Link from "next/link";

export default async function ModeratorStudentProgressPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      user: { select: { name: true } },
      groupStudents: {
        select: { group: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  const summary = await getStudentProgressSummary(studentId);

  if (!summary) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/moderator/progress`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupProgress")}
        </Link>
        <h1 className="text-2xl font-bold">{student.user.name}</h1>
        <p className="text-muted-foreground">{t("noPlan")}</p>
      </div>
    );
  }

  const [milestones, reviewsByMonth, goals] = await Promise.all([
    getStudentMilestones(studentId),
    getReviewsByMonth(studentId),
    getCustomGoals(summary.planId),
  ]);

  const surahs = await db.quranSurah.findMany({
    select: { number: true, nameAr: true, nameEn: true, ayahCount: true },
    orderBy: { number: "asc" },
  });

  const serializedGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetSurahNumber: g.targetSurahNumber,
    targetAyahNumber: g.targetAyahNumber,
    deadline: g.deadline?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    targetSurah: g.targetSurah,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/moderator/progress`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupProgress")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{student.user.name}</h1>
        {student.groupStudents[0] && (
          <p className="text-sm text-muted-foreground">
            {student.groupStudents[0].group.name} — {summary.quranPercentage}%
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("quranPercentage")}
          value={`${summary.quranPercentage}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("juzCompleted")}
          value={t("juzCount", { count: summary.juzCompleted })}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("weeksStreak", { count: summary.reviewStreak.longestStreak })}
          colorClass="text-purple-600"
        />
      </div>

      <CustomGoalForm planId={summary.planId} goals={serializedGoals} surahs={surahs} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("milestones")}</h2>
          <MilestoneTimeline milestones={milestones} emptyMessage={t("noMilestones")} />
        </div>
        <LineChartCard title={t("monthlyReviews")} data={reviewsByMonth} color="#8b5cf6" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/progress/\[studentId\]/page.tsx
git commit -m "feat(progress): add moderator student detail page with goals"
```

---

### Task 14: Admin Progress Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/progress/page.tsx`

- [ ] **Step 1: Create admin progress page**

Create `app/[locale]/(dashboard)/admin/progress/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import {
  getSchoolProgressStats,
  getMilestonesByMonth,
  getGroupProgressComparison,
  getTopPerformers,
} from "@/server/services/progress";
import { StatsCard } from "@/components/charts/stats-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("progress_tracking");
  if (!enabled) notFound();

  const t = await getTranslations("progress");

  const [stats, milestonesByMonth, groupComparison, topPerformers] = await Promise.all([
    getSchoolProgressStats(),
    getMilestonesByMonth(),
    getGroupProgressComparison(),
    getTopPerformers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("schoolProgress")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("milestonesThisMonth")}
          value={stats.milestonesThisMonth}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={t("studentsWithPlans")}
          value={stats.studentsWithActivePlans}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("avgQuranPercentage")}
          value={`${stats.avgQuranPercentage}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("topStreak")}
          value={t("weeksStreak", { count: stats.topStreak })}
          colorClass="text-purple-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StackedBarChartCard
          title={t("milestonesByMonth")}
          data={milestonesByMonth}
          layers={[
            { key: "juz", color: "#f59e0b", label: t("milestone_JUZ_COMPLETE") },
            { key: "surah", color: "#22c55e", label: t("milestone_SURAH_COMPLETE") },
            { key: "hizb", color: "#3b82f6", label: t("milestone_HIZB_COMPLETE") },
            { key: "custom", color: "#8b5cf6", label: t("milestone_CUSTOM_GOAL") },
          ]}
        />
        <BarChartCard
          title={t("groupComparison")}
          data={groupComparison}
          dataKeys={[{ key: "value", color: "#3b82f6", label: t("quranPercentage") }]}
        />
      </div>

      {topPerformers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("topPerformers")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentName")}</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("quranPercentage")}</TableHead>
                  <TableHead>{t("milestones")}</TableHead>
                  <TableHead>{t("currentStreak")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerformers.map((p) => (
                  <TableRow key={p.studentId}>
                    <TableCell className="font-medium">{p.studentName}</TableCell>
                    <TableCell>{p.groupName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.quranPercentage}%</Badge>
                    </TableCell>
                    <TableCell>{p.milestoneCount}</TableCell>
                    <TableCell>{t("weeksStreak", { count: p.currentStreak })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "progress" || echo "No errors"`

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | grep -E "(progress|Error|error)" | head -20`

Expected: All 4 progress routes appear in build output:
- `/(dashboard)/student/progress`
- `/(dashboard)/moderator/progress`
- `/(dashboard)/moderator/progress/[studentId]`
- `/(dashboard)/admin/progress`

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/admin/progress/page.tsx
git commit -m "feat(progress): add admin progress page with school-wide stats"
```
