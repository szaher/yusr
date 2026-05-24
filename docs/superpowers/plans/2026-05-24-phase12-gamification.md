# Phase 12: Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a badge/achievement system and group leaderboards to Yusr Academy, building on the existing milestone and streak infrastructure from Phase 11b.

**Architecture:** Two new Prisma models (BadgeDefinition, StudentBadge) seeded with 22 badge definitions. A `checkBadges` function evaluates triggers after milestone creation and review creation. Leaderboards are computed queries over existing data. Badge grid and award dialog are client components; all pages are server components extending existing progress pages.

**Tech Stack:** Next.js 16 (App Router, Server Components), Prisma 7, next-intl, lucide-react, sonner (toasts), shadcn/ui (Card, Badge, Table, Dialog, Button, Input, Label, Textarea)

---

## File Structure

### New Files
- `server/services/gamification.ts` — badge detection, badge CRUD, leaderboard queries
- `server/actions/gamification.ts` — server actions for award/revoke with auth
- `components/gamification/badge-grid.tsx` — client component, earned vs locked badge display
- `components/gamification/award-badge-dialog.tsx` — client component, moderator badge award form

### Modified Files
- `prisma/schema.prisma` — add BadgeDefinition, StudentBadge models + reverse relations
- `prisma/seed.ts` — add `gamification` feature flag + seed 22 badge definitions
- `server/services/progress.ts` — hook `checkBadges` after milestone creation
- `server/services/memorization-review.ts` — hook `checkBadges` after review creation
- `messages/en.json` — add `gamification` namespace (~70 keys)
- `messages/ar.json` — add `gamification` namespace (~70 keys)
- `app/[locale]/(dashboard)/student/progress/page.tsx` — add badge grid + group leaderboard
- `app/[locale]/(dashboard)/student/dashboard/page.tsx` — add recent badges row
- `app/[locale]/(dashboard)/moderator/progress/page.tsx` — add leaderboard + award badge button
- `app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx` — add badges section with revoke
- `app/[locale]/(dashboard)/admin/progress/page.tsx` — add badges this month stat + school leaderboard

---

### Task 1: Schema — Add BadgeDefinition and StudentBadge Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add BadgeDefinition model**

Add at the end of `prisma/schema.prisma`, after the `CustomGoal` model:

```prisma
model BadgeDefinition {
  id            String         @id @default(cuid())
  key           String         @unique
  icon          String
  color         String
  category      String
  trigger       Json?
  sortOrder     Int            @default(0)
  studentBadges StudentBadge[]

  @@index([category])
}
```

- [ ] **Step 2: Add StudentBadge model**

Add immediately after `BadgeDefinition`:

```prisma
model StudentBadge {
  id          String          @id @default(cuid())
  studentId   String
  student     StudentProfile  @relation(fields: [studentId], references: [id])
  badgeId     String
  badge       BadgeDefinition @relation(fields: [badgeId], references: [id])
  awardedAt   DateTime        @default(now())
  awardedById String?
  awardedBy   User?           @relation("badgeAwarder", fields: [awardedById], references: [id])
  note        String?

  @@unique([studentId, badgeId])
  @@index([studentId])
  @@index([badgeId])
}
```

- [ ] **Step 3: Add reverse relations**

In the `User` model (near lines 14-47), add after the existing `createdGoals` relation:

```prisma
awardedBadges StudentBadge[] @relation("badgeAwarder")
```

In the `StudentProfile` model (near lines 108-134), add after the existing `milestones` relation:

```prisma
badges StudentBadge[]
```

- [ ] **Step 4: Generate Prisma client and push schema**

```bash
npx prisma generate
npx prisma db push
```

Expected: Both succeed with no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(gamification): add BadgeDefinition and StudentBadge schema models"
```

---

### Task 2: Seed — Feature Flag and Badge Definitions

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add gamification feature flag**

In the `flags` array in `prisma/seed.ts`, add in alphabetical position (after `exams`, before `leave_requests`):

```typescript
{ key: "gamification", enabled: true, description: "Badges, achievements, and group leaderboards" },
```

- [ ] **Step 2: Add badge seeding function**

Add a new `seedBadges()` function after the existing seeding functions. This seeds all 22 badge definitions using upsert (idempotent):

```typescript
async function seedBadges() {
  const badges = [
    { key: "first_juz", icon: "trophy", color: "#f59e0b", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 1 }, sortOrder: 1 },
    { key: "five_juz", icon: "trophy", color: "#f59e0b", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 5 }, sortOrder: 2 },
    { key: "ten_juz", icon: "trophy", color: "#f59e0b", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 10 }, sortOrder: 3 },
    { key: "fifteen_juz", icon: "trophy", color: "#eab308", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 15 }, sortOrder: 4 },
    { key: "twenty_juz", icon: "trophy", color: "#eab308", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 20 }, sortOrder: 5 },
    { key: "half_quran", icon: "crown", color: "#a855f7", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 15 }, sortOrder: 6 },
    { key: "full_quran", icon: "crown", color: "#a855f7", category: "MILESTONE", trigger: { type: "JUZ_COMPLETE", count: 30 }, sortOrder: 7 },
    { key: "first_surah", icon: "star", color: "#22c55e", category: "MILESTONE", trigger: { type: "SURAH_COMPLETE", count: 1 }, sortOrder: 8 },
    { key: "ten_surahs", icon: "star", color: "#22c55e", category: "MILESTONE", trigger: { type: "SURAH_COMPLETE", count: 10 }, sortOrder: 9 },
    { key: "fifty_surahs", icon: "star", color: "#22c55e", category: "MILESTONE", trigger: { type: "SURAH_COMPLETE", count: 50 }, sortOrder: 10 },
    { key: "all_surahs", icon: "star", color: "#16a34a", category: "MILESTONE", trigger: { type: "SURAH_COMPLETE", count: 114 }, sortOrder: 11 },
    { key: "streak_4", icon: "flame", color: "#ef4444", category: "STREAK", trigger: { type: "STREAK", weeks: 4 }, sortOrder: 1 },
    { key: "streak_10", icon: "flame", color: "#ef4444", category: "STREAK", trigger: { type: "STREAK", weeks: 10 }, sortOrder: 2 },
    { key: "streak_26", icon: "flame", color: "#dc2626", category: "STREAK", trigger: { type: "STREAK", weeks: 26 }, sortOrder: 3 },
    { key: "streak_52", icon: "flame", color: "#dc2626", category: "STREAK", trigger: { type: "STREAK", weeks: 52 }, sortOrder: 4 },
    { key: "reviews_100", icon: "book-open", color: "#3b82f6", category: "REVIEW", trigger: { type: "REVIEW_COUNT", count: 100 }, sortOrder: 1 },
    { key: "reviews_500", icon: "book-open", color: "#3b82f6", category: "REVIEW", trigger: { type: "REVIEW_COUNT", count: 500 }, sortOrder: 2 },
    { key: "reviews_1000", icon: "book-open", color: "#2563eb", category: "REVIEW", trigger: { type: "REVIEW_COUNT", count: 1000 }, sortOrder: 3 },
    { key: "excellent_tajweed", icon: "mic", color: "#8b5cf6", category: "SPECIAL", trigger: null, sortOrder: 1 },
    { key: "most_improved", icon: "trending-up", color: "#10b981", category: "SPECIAL", trigger: null, sortOrder: 2 },
    { key: "peer_helper", icon: "users", color: "#06b6d4", category: "SPECIAL", trigger: null, sortOrder: 3 },
    { key: "outstanding_dedication", icon: "heart", color: "#ec4899", category: "SPECIAL", trigger: null, sortOrder: 4 },
  ];

  for (const badge of badges) {
    await prisma.badgeDefinition.upsert({
      where: { key: badge.key },
      update: { icon: badge.icon, color: badge.color, category: badge.category, trigger: badge.trigger ?? undefined, sortOrder: badge.sortOrder },
      create: badge,
    });
  }

  console.log(`  Seeded ${badges.length} badge definitions`);
}
```

- [ ] **Step 3: Call seedBadges() from main**

In the `main()` function, add `await seedBadges();` after the existing seed calls (after `seedQuranData()` or wherever the last seed function is called).

- [ ] **Step 4: Run seed to verify**

```bash
npx prisma db seed
```

Expected: "Seeded 22 badge definitions" in output, no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(gamification): seed feature flag and 22 badge definitions"
```

---

### Task 3: i18n — Add Gamification Namespace

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add gamification namespace to en.json**

Add the `"gamification"` key as a new top-level namespace in `messages/en.json` (alphabetically, after `"exams"` section):

```json
"gamification": {
  "myBadges": "My Badges",
  "earnedBadges": "Earned",
  "lockedBadges": "Locked",
  "badgeEarned": "Badge Earned!",
  "noBadges": "No badges earned yet",
  "awardBadge": "Award Badge",
  "awardNote": "Note (optional)",
  "badgeAwarded": "Badge awarded successfully",
  "revokeBadge": "Revoke Badge",
  "confirmRevoke": "Revoke this badge?",
  "badgeRevoked": "Badge revoked",
  "leaderboard": "Leaderboard",
  "groupLeaderboard": "Group Leaderboard",
  "schoolLeaderboard": "School Leaderboard",
  "rank": "Rank",
  "noRankings": "No rankings available",
  "badgesThisMonth": "Badges This Month",
  "totalBadges": "Total Badges",
  "recentBadges": "Recent Badges",
  "viewAll": "View All",
  "category_MILESTONE": "Milestone",
  "category_STREAK": "Streak",
  "category_REVIEW": "Review",
  "category_SPECIAL": "Special",
  "badge_first_juz": "First Juz",
  "badge_first_juz_desc": "Complete your first juz of the Quran",
  "badge_five_juz": "Five Juz",
  "badge_five_juz_desc": "Complete 5 juz of the Quran",
  "badge_ten_juz": "Ten Juz",
  "badge_ten_juz_desc": "Complete 10 juz of the Quran",
  "badge_fifteen_juz": "Fifteen Juz",
  "badge_fifteen_juz_desc": "Complete 15 juz of the Quran",
  "badge_twenty_juz": "Twenty Juz",
  "badge_twenty_juz_desc": "Complete 20 juz of the Quran",
  "badge_half_quran": "Half the Quran",
  "badge_half_quran_desc": "Memorize half of the Holy Quran",
  "badge_full_quran": "Full Quran",
  "badge_full_quran_desc": "Memorize the entire Holy Quran",
  "badge_first_surah": "First Surah",
  "badge_first_surah_desc": "Complete your first surah",
  "badge_ten_surahs": "Ten Surahs",
  "badge_ten_surahs_desc": "Complete 10 surahs",
  "badge_fifty_surahs": "Fifty Surahs",
  "badge_fifty_surahs_desc": "Complete 50 surahs",
  "badge_all_surahs": "All Surahs",
  "badge_all_surahs_desc": "Complete all 114 surahs",
  "badge_streak_4": "4-Week Streak",
  "badge_streak_4_desc": "Maintain a 4-week review streak",
  "badge_streak_10": "10-Week Streak",
  "badge_streak_10_desc": "Maintain a 10-week review streak",
  "badge_streak_26": "Half-Year Streak",
  "badge_streak_26_desc": "Maintain a 26-week review streak",
  "badge_streak_52": "Full-Year Streak",
  "badge_streak_52_desc": "Maintain a 52-week review streak",
  "badge_reviews_100": "100 Reviews",
  "badge_reviews_100_desc": "Complete 100 memorization reviews",
  "badge_reviews_500": "500 Reviews",
  "badge_reviews_500_desc": "Complete 500 memorization reviews",
  "badge_reviews_1000": "1000 Reviews",
  "badge_reviews_1000_desc": "Complete 1000 memorization reviews",
  "badge_excellent_tajweed": "Excellent Tajweed",
  "badge_excellent_tajweed_desc": "Recognized for excellent tajweed recitation",
  "badge_most_improved": "Most Improved",
  "badge_most_improved_desc": "Recognized for outstanding improvement",
  "badge_peer_helper": "Peer Helper",
  "badge_peer_helper_desc": "Recognized for helping fellow students",
  "badge_outstanding_dedication": "Outstanding Dedication",
  "badge_outstanding_dedication_desc": "Recognized for exceptional dedication to memorization",
  "awardedBy": "Awarded by {name}",
  "awardedOn": "Awarded on {date}",
  "manualBadge": "Manual Award",
  "milestones": "Milestones",
  "quranPercentage": "Quran %",
  "streak": "Streak",
  "badges": "Badges",
  "studentName": "Student"
}
```

- [ ] **Step 2: Add gamification namespace to ar.json**

Add the `"gamification"` key as a new top-level namespace in `messages/ar.json`:

```json
"gamification": {
  "myBadges": "شاراتي",
  "earnedBadges": "مكتسبة",
  "lockedBadges": "مقفلة",
  "badgeEarned": "تم الحصول على شارة!",
  "noBadges": "لا توجد شارات بعد",
  "awardBadge": "منح شارة",
  "awardNote": "ملاحظة (اختياري)",
  "badgeAwarded": "تم منح الشارة بنجاح",
  "revokeBadge": "سحب الشارة",
  "confirmRevoke": "سحب هذه الشارة؟",
  "badgeRevoked": "تم سحب الشارة",
  "leaderboard": "لوحة المتصدرين",
  "groupLeaderboard": "ترتيب المجموعة",
  "schoolLeaderboard": "ترتيب المدرسة",
  "rank": "الترتيب",
  "noRankings": "لا يوجد ترتيب متاح",
  "badgesThisMonth": "شارات هذا الشهر",
  "totalBadges": "إجمالي الشارات",
  "recentBadges": "أحدث الشارات",
  "viewAll": "عرض الكل",
  "category_MILESTONE": "إنجاز",
  "category_STREAK": "سلسلة",
  "category_REVIEW": "مراجعة",
  "category_SPECIAL": "خاصة",
  "badge_first_juz": "الجزء الأول",
  "badge_first_juz_desc": "أكمل أول جزء من القرآن الكريم",
  "badge_five_juz": "خمسة أجزاء",
  "badge_five_juz_desc": "أكمل 5 أجزاء من القرآن الكريم",
  "badge_ten_juz": "عشرة أجزاء",
  "badge_ten_juz_desc": "أكمل 10 أجزاء من القرآن الكريم",
  "badge_fifteen_juz": "خمسة عشر جزءاً",
  "badge_fifteen_juz_desc": "أكمل 15 جزءاً من القرآن الكريم",
  "badge_twenty_juz": "عشرون جزءاً",
  "badge_twenty_juz_desc": "أكمل 20 جزءاً من القرآن الكريم",
  "badge_half_quran": "نصف القرآن",
  "badge_half_quran_desc": "أكمل حفظ نصف القرآن الكريم",
  "badge_full_quran": "القرآن كاملاً",
  "badge_full_quran_desc": "أكمل حفظ القرآن الكريم كاملاً",
  "badge_first_surah": "أول سورة",
  "badge_first_surah_desc": "أكمل أول سورة",
  "badge_ten_surahs": "عشر سور",
  "badge_ten_surahs_desc": "أكمل 10 سور",
  "badge_fifty_surahs": "خمسون سورة",
  "badge_fifty_surahs_desc": "أكمل 50 سورة",
  "badge_all_surahs": "جميع السور",
  "badge_all_surahs_desc": "أكمل جميع السور الـ 114",
  "badge_streak_4": "سلسلة 4 أسابيع",
  "badge_streak_4_desc": "حافظ على سلسلة مراجعة لمدة 4 أسابيع",
  "badge_streak_10": "سلسلة 10 أسابيع",
  "badge_streak_10_desc": "حافظ على سلسلة مراجعة لمدة 10 أسابيع",
  "badge_streak_26": "سلسلة نصف سنة",
  "badge_streak_26_desc": "حافظ على سلسلة مراجعة لمدة 26 أسبوعاً",
  "badge_streak_52": "سلسلة سنة كاملة",
  "badge_streak_52_desc": "حافظ على سلسلة مراجعة لمدة 52 أسبوعاً",
  "badge_reviews_100": "100 مراجعة",
  "badge_reviews_100_desc": "أكمل 100 مراجعة حفظ",
  "badge_reviews_500": "500 مراجعة",
  "badge_reviews_500_desc": "أكمل 500 مراجعة حفظ",
  "badge_reviews_1000": "1000 مراجعة",
  "badge_reviews_1000_desc": "أكمل 1000 مراجعة حفظ",
  "badge_excellent_tajweed": "تجويد ممتاز",
  "badge_excellent_tajweed_desc": "تقدير للتلاوة بتجويد ممتاز",
  "badge_most_improved": "الأكثر تحسناً",
  "badge_most_improved_desc": "تقدير للتحسن المتميز",
  "badge_peer_helper": "مساعد الأقران",
  "badge_peer_helper_desc": "تقدير لمساعدة الطلاب الآخرين",
  "badge_outstanding_dedication": "تفانٍ متميز",
  "badge_outstanding_dedication_desc": "تقدير للتفاني الاستثنائي في الحفظ",
  "awardedBy": "منحها {name}",
  "awardedOn": "بتاريخ {date}",
  "manualBadge": "منح يدوي",
  "milestones": "الإنجازات",
  "quranPercentage": "نسبة القرآن",
  "streak": "السلسلة",
  "badges": "الشارات",
  "studentName": "الطالب"
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

Expected: Build succeeds (i18n namespaces are additive, no references yet).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(gamification): add i18n keys for badges and leaderboards"
```

---

### Task 4: Service — Badge Detection and Query Functions

**Files:**
- Create: `server/services/gamification.ts`

- [ ] **Step 1: Create gamification service with checkBadges**

Create `server/services/gamification.ts`:

```typescript
import { db } from "@/server/db/client";
import { createNotification } from "@/server/services/notification";
import { createAuditLog } from "@/server/services/audit-log";
import { getReviewStreak } from "@/server/services/progress";

type TriggerRule =
  | { type: "JUZ_COMPLETE" | "SURAH_COMPLETE" | "HIZB_COMPLETE"; count: number }
  | { type: "STREAK"; weeks: number }
  | { type: "REVIEW_COUNT"; count: number };

export async function checkBadges(studentProfileId: string) {
  const autoBadges = await db.badgeDefinition.findMany({
    where: { trigger: { not: null } },
  });

  if (autoBadges.length === 0) return;

  const earnedSet = new Set(
    (
      await db.studentBadge.findMany({
        where: { studentId: studentProfileId },
        select: { badgeId: true },
      })
    ).map((b) => b.badgeId),
  );

  const unearnedBadges = autoBadges.filter((b) => !earnedSet.has(b.id));
  if (unearnedBadges.length === 0) return;

  const student = await db.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { userId: true },
  });
  if (!student) return;

  const milestoneCounts = new Map<string, number>();
  const milestoneGroups = await db.studentMilestone.groupBy({
    by: ["type"],
    where: { studentId: studentProfileId },
    _count: { id: true },
  });
  for (const g of milestoneGroups) {
    milestoneCounts.set(g.type, g._count.id);
  }

  let streak: { currentStreak: number } | null = null;
  let reviewCount: number | null = null;

  for (const badge of unearnedBadges) {
    const trigger = badge.trigger as TriggerRule;
    let qualified = false;

    if (
      trigger.type === "JUZ_COMPLETE" ||
      trigger.type === "SURAH_COMPLETE" ||
      trigger.type === "HIZB_COMPLETE"
    ) {
      const count = milestoneCounts.get(trigger.type) ?? 0;
      qualified = count >= trigger.count;
    } else if (trigger.type === "STREAK") {
      if (!streak) {
        streak = await getReviewStreak(studentProfileId);
      }
      qualified = streak.currentStreak >= trigger.weeks;
    } else if (trigger.type === "REVIEW_COUNT") {
      if (reviewCount === null) {
        reviewCount = await db.memorizationReview.count({
          where: {
            plan: { studentId: studentProfileId },
          },
        });
      }
      qualified = reviewCount >= trigger.count;
    }

    if (!qualified) continue;

    try {
      await db.studentBadge.create({
        data: {
          studentId: studentProfileId,
          badgeId: badge.id,
        },
      });

      await createNotification({
        recipientId: student.userId,
        type: "BADGE_EARNED",
        title: badge.key,
      });
    } catch (err) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code !== "P2002") throw err;
    }
  }
}

export async function awardBadge(
  studentId: string,
  badgeId: string,
  actorId: string,
  note?: string,
) {
  const badge = await db.badgeDefinition.findUnique({ where: { id: badgeId } });
  if (!badge || badge.trigger !== null) {
    throw new Error("Only SPECIAL badges can be manually awarded");
  }

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!student) throw new Error("Student not found");

  await db.studentBadge.create({
    data: {
      studentId,
      badgeId,
      awardedById: actorId,
      note: note || null,
    },
  });

  await createNotification({
    recipientId: student.userId,
    type: "BADGE_EARNED",
    title: badge.key,
    body: note || undefined,
  });

  await createAuditLog({
    actorId,
    action: "badge.award_manual",
    entityType: "StudentBadge",
    entityId: badgeId,
    metadata: { studentId, badgeKey: badge.key, note },
  });
}

export async function revokeBadge(studentBadgeId: string, actorId: string) {
  const studentBadge = await db.studentBadge.findUnique({
    where: { id: studentBadgeId },
    include: { badge: { select: { key: true } } },
  });

  if (!studentBadge) throw new Error("Badge not found");
  if (!studentBadge.awardedById) {
    throw new Error("Auto-earned badges cannot be revoked");
  }

  await db.studentBadge.delete({ where: { id: studentBadgeId } });

  await createAuditLog({
    actorId,
    action: "badge.revoke",
    entityType: "StudentBadge",
    entityId: studentBadgeId,
    metadata: { studentId: studentBadge.studentId, badgeKey: studentBadge.badge.key },
  });
}

export async function getStudentBadges(studentProfileId: string) {
  return db.studentBadge.findMany({
    where: { studentId: studentProfileId },
    include: {
      badge: true,
      awardedBy: { select: { name: true } },
    },
    orderBy: { awardedAt: "desc" },
  });
}

export async function getBadgeCatalog() {
  return db.badgeDefinition.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getRecentBadges(studentProfileId: string, limit = 3) {
  return db.studentBadge.findMany({
    where: { studentId: studentProfileId },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
    take: limit,
  });
}

interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  milestoneCount: number;
  quranPercentage: number;
  currentStreak: number;
  badgeCount: number;
  rank: number;
}

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const students = await db.studentProfile.findMany({
    where: { groupStudents: { some: { groupId } } },
    select: {
      id: true,
      user: { select: { name: true } },
      _count: { select: { milestones: true, badges: true } },
      memorizationPlans: {
        where: { active: true },
        select: { currentSurahId: true, currentAyahNumber: true },
        take: 1,
      },
    },
  });

  const totalAyahs = await db.quranAyah.count();

  const entries: Omit<LeaderboardEntry, "rank">[] = [];
  for (const s of students) {
    const plan = s.memorizationPlans[0];
    let quranPercentage = 0;
    if (plan) {
      const completed = await db.quranAyah.count({
        where: {
          OR: [
            { surahNumber: { lt: plan.currentSurahId } },
            { surahNumber: plan.currentSurahId, ayahNumber: { lt: plan.currentAyahNumber } },
          ],
        },
      });
      quranPercentage = totalAyahs > 0 ? Math.round((completed / totalAyahs) * 100) : 0;
    }

    const streak = await getReviewStreak(s.id);

    entries.push({
      studentId: s.id,
      studentName: s.user.name ?? "—",
      milestoneCount: s._count.milestones,
      quranPercentage,
      currentStreak: streak.currentStreak,
      badgeCount: s._count.badges,
    });
  }

  entries.sort((a, b) => {
    if (b.milestoneCount !== a.milestoneCount) return b.milestoneCount - a.milestoneCount;
    if (b.quranPercentage !== a.quranPercentage) return b.quranPercentage - a.quranPercentage;
    return b.currentStreak - a.currentStreak;
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function getSchoolLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const students = await db.studentProfile.findMany({
    select: {
      id: true,
      user: { select: { name: true } },
      _count: { select: { milestones: true, badges: true } },
      memorizationPlans: {
        where: { active: true },
        select: { currentSurahId: true, currentAyahNumber: true },
        take: 1,
      },
    },
  });

  const totalAyahs = await db.quranAyah.count();

  const entries: Omit<LeaderboardEntry, "rank">[] = [];
  for (const s of students) {
    const plan = s.memorizationPlans[0];
    let quranPercentage = 0;
    if (plan) {
      const completed = await db.quranAyah.count({
        where: {
          OR: [
            { surahNumber: { lt: plan.currentSurahId } },
            { surahNumber: plan.currentSurahId, ayahNumber: { lt: plan.currentAyahNumber } },
          ],
        },
      });
      quranPercentage = totalAyahs > 0 ? Math.round((completed / totalAyahs) * 100) : 0;
    }

    const streak = await getReviewStreak(s.id);

    entries.push({
      studentId: s.id,
      studentName: s.user.name ?? "—",
      milestoneCount: s._count.milestones,
      quranPercentage,
      currentStreak: streak.currentStreak,
      badgeCount: s._count.badges,
    });
  }

  entries.sort((a, b) => {
    if (b.milestoneCount !== a.milestoneCount) return b.milestoneCount - a.milestoneCount;
    if (b.quranPercentage !== a.quranPercentage) return b.quranPercentage - a.quranPercentage;
    return b.currentStreak - a.currentStreak;
  });

  return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function getBadgesAwardedThisMonth(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return db.studentBadge.count({
    where: { awardedAt: { gte: thirtyDaysAgo } },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to gamification.ts (pre-existing errors in other files are fine).

- [ ] **Step 3: Commit**

```bash
git add server/services/gamification.ts
git commit -m "feat(gamification): add badge detection, award/revoke, and leaderboard services"
```

---

### Task 5: Server Actions — Award and Revoke Badge

**Files:**
- Create: `server/actions/gamification.ts`

- [ ] **Step 1: Create server actions**

Create `server/actions/gamification.ts`:

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { awardBadge, revokeBadge } from "@/server/services/gamification";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";

export async function awardBadgeAction(
  studentId: string,
  badgeId: string,
  note?: string,
) {
  const session = await requireApprovedUser();

  const student = await db.studentProfile.findFirst({
    where: {
      id: studentId,
      groupStudents: {
        some: {
          group: { moderator: { userId: session.user.id } },
        },
      },
    },
  });
  if (!student) throw new Error("Unauthorized");

  await awardBadge(studentId, badgeId, session.user.id, note);

  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  revalidatePath("/[locale]/student/dashboard", "page");
  return { success: true };
}

export async function revokeBadgeAction(studentBadgeId: string) {
  const session = await requireApprovedUser();

  const studentBadge = await db.studentBadge.findFirst({
    where: {
      id: studentBadgeId,
      student: {
        groupStudents: {
          some: {
            group: { moderator: { userId: session.user.id } },
          },
        },
      },
    },
  });
  if (!studentBadge) throw new Error("Unauthorized");

  await revokeBadge(studentBadgeId, session.user.id);

  revalidatePath("/[locale]/moderator/progress", "layout");
  revalidatePath("/[locale]/student/progress", "page");
  revalidatePath("/[locale]/student/dashboard", "page");
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/actions/gamification.ts
git commit -m "feat(gamification): add server actions for badge award and revoke"
```

---

### Task 6: Hook — Integrate checkBadges into Milestone and Review Flows

**Files:**
- Modify: `server/services/progress.ts`
- Modify: `server/services/memorization-review.ts`

- [ ] **Step 1: Add checkBadges import and call in progress.ts**

In `server/services/progress.ts`, add import at the top:

```typescript
import { checkBadges } from "@/server/services/gamification";
```

Inside `checkMilestones`, after the `for (const m of newMilestones)` loop ends (after all milestones have been created and notifications sent), add:

```typescript
  if (newMilestones.length > 0) {
    checkBadges(plan.studentId).catch(() => {});
  }
```

This should be added right before the closing `}` of the `checkMilestones` function.

- [ ] **Step 2: Add checkBadges call in memorization-review.ts**

In `server/services/memorization-review.ts`, add import at the top alongside the existing progress imports:

```typescript
import { checkBadges } from "@/server/services/gamification";
```

In the `createReview` function, after the existing fire-and-forget calls to `checkMilestones` and `checkCustomGoals`, add:

```typescript
  checkBadges(plan.studentId).catch(() => {});
```

Note: You need the `plan.studentId` — the `plan` variable is already available in the `createReview` function from the initial `findUnique` query. Check the existing code to confirm the exact variable name and field path (it may be `plan.studentId` or similar — use whatever the existing code references).

- [ ] **Step 3: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add server/services/progress.ts server/services/memorization-review.ts
git commit -m "feat(gamification): hook badge detection into milestone and review creation"
```

---

### Task 7: Component — Badge Grid

**Files:**
- Create: `components/gamification/badge-grid.tsx`

- [ ] **Step 1: Create badge-grid component**

Create `components/gamification/badge-grid.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import {
  Trophy,
  Star,
  Flame,
  BookOpen,
  Mic,
  TrendingUp,
  Users,
  Heart,
  Crown,
  Lock,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  "book-open": BookOpen,
  mic: Mic,
  "trending-up": TrendingUp,
  users: Users,
  heart: Heart,
  crown: Crown,
};

type BadgeDef = {
  id: string;
  key: string;
  icon: string;
  color: string;
  category: string;
  sortOrder: number;
};

type EarnedBadge = {
  id: string;
  badgeId: string;
  awardedAt: Date | string;
  awardedBy?: { name: string | null } | null;
  note?: string | null;
};

const categoryOrder = ["MILESTONE", "STREAK", "REVIEW", "SPECIAL"];

export function BadgeGrid({
  catalog,
  earned,
}: {
  catalog: BadgeDef[];
  earned: EarnedBadge[];
}) {
  const t = useTranslations("gamification");
  const earnedMap = new Map(earned.map((e) => [e.badgeId, e]));

  const grouped = new Map<string, BadgeDef[]>();
  for (const badge of catalog) {
    const list = grouped.get(badge.category) ?? [];
    list.push(badge);
    grouped.set(badge.category, list);
  }

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const badges = grouped.get(category);
        if (!badges || badges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t(`category_${category}`)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {badges.map((badge) => {
                const isEarned = earnedMap.has(badge.id);
                const earnedInfo = earnedMap.get(badge.id);
                const Icon = iconMap[badge.icon] ?? Trophy;

                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                      isEarned
                        ? "bg-card border-border"
                        : "bg-muted/30 border-transparent opacity-50"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className="size-8"
                        style={isEarned ? { color: badge.color } : undefined}
                      />
                      {!isEarned && (
                        <Lock className="size-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs font-medium leading-tight">
                      {t(`badge_${badge.key}`)}
                    </p>
                    {isEarned && earnedInfo && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(earnedInfo.awardedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/gamification/badge-grid.tsx
git commit -m "feat(gamification): add BadgeGrid client component"
```

---

### Task 8: Component — Award Badge Dialog

**Files:**
- Create: `components/gamification/award-badge-dialog.tsx`

- [ ] **Step 1: Create award-badge-dialog component**

Create `components/gamification/award-badge-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { awardBadgeAction } from "@/server/actions/gamification";
import { toast } from "sonner";
import { Award, Mic, TrendingUp, Users, Heart } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  mic: Mic,
  "trending-up": TrendingUp,
  users: Users,
  heart: Heart,
};

type ManualBadge = {
  id: string;
  key: string;
  icon: string;
  color: string;
};

export function AwardBadgeDialog({
  studentId,
  studentName,
  manualBadges,
  earnedBadgeIds,
}: {
  studentId: string;
  studentName: string;
  manualBadges: ManualBadge[];
  earnedBadgeIds: Set<string>;
}) {
  const t = useTranslations("gamification");
  const [open, setOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const availableBadges = manualBadges.filter((b) => !earnedBadgeIds.has(b.id));

  function handleSubmit() {
    if (!selectedBadgeId) return;
    startTransition(async () => {
      try {
        await awardBadgeAction(studentId, selectedBadgeId, note || undefined);
        toast.success(t("badgeAwarded"));
        setOpen(false);
        setSelectedBadgeId("");
        setNote("");
      } catch {
        toast.error("Error");
      }
    });
  }

  if (availableBadges.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Award className="size-4 mr-1" />
          {t("awardBadge")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("awardBadge")} — {studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {availableBadges.map((badge) => {
              const Icon = iconMap[badge.icon] ?? Award;
              const isSelected = selectedBadgeId === badge.id;
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setSelectedBadgeId(badge.id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Icon className="size-5" style={{ color: badge.color }} />
                  <div>
                    <p className="text-sm font-medium">{t(`badge_${badge.key}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`badge_${badge.key}_desc`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <Label>{t("awardNote")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedBadgeId || isPending}
            className="w-full"
          >
            {isPending ? "..." : t("awardBadge")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify Dialog component exists**

The app uses shadcn/ui. Check that the Dialog component exists:

```bash
ls components/ui/dialog.tsx
```

If it doesn't exist, install it:

```bash
npx shadcn@latest add dialog
```

Also check that Textarea exists:

```bash
ls components/ui/textarea.tsx
```

If not:

```bash
npx shadcn@latest add textarea
```

- [ ] **Step 3: Commit**

```bash
git add components/gamification/award-badge-dialog.tsx
git commit -m "feat(gamification): add AwardBadgeDialog client component"
```

---

### Task 9: Page — Extend Student Progress Page

**Files:**
- Modify: `app/[locale]/(dashboard)/student/progress/page.tsx`

- [ ] **Step 1: Add gamification imports and data fetching**

At the top of the file, add imports:

```typescript
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getStudentBadges,
  getBadgeCatalog,
  getGroupLeaderboard,
} from "@/server/services/gamification";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
```

Note: `isFeatureEnabled` is already imported for `progress_tracking`. The Table components may also already be imported — check and don't duplicate.

After the existing `const [milestones, reviewsByMonth, goals] = await Promise.all([...])` block, add:

```typescript
  const gamificationEnabled = await isFeatureEnabled("gamification");

  let badgeCatalog: Awaited<ReturnType<typeof getBadgeCatalog>> = [];
  let studentBadges: Awaited<ReturnType<typeof getStudentBadges>> = [];
  let leaderboard: Awaited<ReturnType<typeof getGroupLeaderboard>> = [];

  if (gamificationEnabled) {
    const group = await db.groupStudent.findFirst({
      where: { studentId: profile.id },
      select: { groupId: true },
    });

    [badgeCatalog, studentBadges] = await Promise.all([
      getBadgeCatalog(),
      getStudentBadges(profile.id),
    ]);

    if (group) {
      leaderboard = await getGroupLeaderboard(group.groupId);
    }
  }
```

- [ ] **Step 2: Add badge grid section to JSX**

After the stats grid `</div>` and before the goals display section, add:

```tsx
      {gamificationEnabled && badgeCatalog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("myBadges")}</h2>
          <BadgeGrid catalog={badgeCatalog} earned={studentBadges} />
        </div>
      )}
```

You'll need a second translations object. Add at the data-fetching area:

```typescript
  const tg = await getTranslations("gamification");
```

- [ ] **Step 3: Add leaderboard section to JSX**

At the bottom of the page (after the milestones/chart grid), add:

```tsx
      {gamificationEnabled && leaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("groupLeaderboard")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg("rank")}</TableHead>
                  <TableHead>{tg("studentName")}</TableHead>
                  <TableHead>{tg("milestones")}</TableHead>
                  <TableHead>{tg("quranPercentage")}</TableHead>
                  <TableHead>{tg("streak")}</TableHead>
                  <TableHead>{tg("badges")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow
                    key={entry.studentId}
                    className={entry.studentId === profile.id ? "bg-primary/5" : ""}
                  >
                    <TableCell className="font-bold">{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.studentName}</TableCell>
                    <TableCell>{entry.milestoneCount}</TableCell>
                    <TableCell>{entry.quranPercentage}%</TableCell>
                    <TableCell>{t("weeksStreak", { count: entry.currentStreak })}</TableCell>
                    <TableCell>{entry.badgeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(dashboard)/student/progress/page.tsx"
git commit -m "feat(gamification): add badge grid and group leaderboard to student progress page"
```

---

### Task 10: Page — Extend Student Dashboard

**Files:**
- Modify: `app/[locale]/(dashboard)/student/dashboard/page.tsx`

- [ ] **Step 1: Add gamification imports and data fetching**

Add imports at the top:

```typescript
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { getRecentBadges } from "@/server/services/gamification";
import { Trophy, Star, Flame, BookOpen, Mic, TrendingUp, Users, Heart, Crown } from "lucide-react";
```

Note: `isFeatureEnabled` may already be imported for `analytics` — check and don't duplicate. Same for any lucide icons.

Inside the `StudentAnalytics` component (or the main page function, depending on where the profile is available), after getting the student profile ID, add:

```typescript
  const gamificationEnabled = await isFeatureEnabled("gamification");
  let recentBadges: Awaited<ReturnType<typeof getRecentBadges>> = [];
  if (gamificationEnabled && profile) {
    recentBadges = await getRecentBadges(profile.id);
  }
```

Where `profile` is the student profile with its `id`. Adjust the variable name to match the existing code.

- [ ] **Step 2: Add recent badges row to JSX**

After the existing stats cards grid (inside whichever component renders the dashboard content), add:

```tsx
      {recentBadges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">{tg("recentBadges")}</h2>
            <a
              href={`/${locale}/student/progress`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {tg("viewAll")} →
            </a>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentBadges.map((sb) => {
              const iconMap: Record<string, React.ElementType> = {
                trophy: Trophy, star: Star, flame: Flame,
                "book-open": BookOpen, mic: Mic, "trending-up": TrendingUp,
                users: Users, heart: Heart, crown: Crown,
              };
              const Icon = iconMap[sb.badge.icon] ?? Trophy;
              return (
                <div
                  key={sb.id}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <Icon className="size-4" style={{ color: sb.badge.color }} />
                  <span className="text-xs font-medium">{tg(`badge_${sb.badge.key}`)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
```

You'll need `tg`:

```typescript
  const tg = await getTranslations("gamification");
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(dashboard)/student/dashboard/page.tsx"
git commit -m "feat(gamification): add recent badges to student dashboard"
```

---

### Task 11: Page — Extend Moderator Progress Page

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/progress/page.tsx`

- [ ] **Step 1: Add gamification imports and data fetching**

Add imports:

```typescript
import {
  getGroupLeaderboard,
  getBadgeCatalog,
} from "@/server/services/gamification";
import { AwardBadgeDialog } from "@/components/gamification/award-badge-dialog";
```

After the existing data fetching (overview, recentMilestones), add:

```typescript
  const gamificationEnabled = await isFeatureEnabled("gamification");

  let leaderboard: Awaited<ReturnType<typeof getGroupLeaderboard>> = [];
  let manualBadges: { id: string; key: string; icon: string; color: string }[] = [];

  if (gamificationEnabled) {
    const catalog = await getBadgeCatalog();
    manualBadges = catalog
      .filter((b) => b.category === "SPECIAL")
      .map((b) => ({ id: b.id, key: b.key, icon: b.icon, color: b.color }));
    leaderboard = await getGroupLeaderboard(selectedGroupId);
  }
```

- [ ] **Step 2: Add leaderboard section with award buttons to JSX**

After the existing progress table section and before the recent milestones section, add:

```tsx
      {gamificationEnabled && leaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("groupLeaderboard")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg("rank")}</TableHead>
                  <TableHead>{tg("studentName")}</TableHead>
                  <TableHead>{tg("milestones")}</TableHead>
                  <TableHead>{tg("quranPercentage")}</TableHead>
                  <TableHead>{tg("streak")}</TableHead>
                  <TableHead>{tg("badges")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  const earnedBadgeIds = new Set<string>();
                  return (
                    <TableRow key={entry.studentId}>
                      <TableCell className="font-bold">{entry.rank}</TableCell>
                      <TableCell className="font-medium">{entry.studentName}</TableCell>
                      <TableCell>{entry.milestoneCount}</TableCell>
                      <TableCell>{entry.quranPercentage}%</TableCell>
                      <TableCell>{t("weeksStreak", { count: entry.currentStreak })}</TableCell>
                      <TableCell>{entry.badgeCount}</TableCell>
                      <TableCell>
                        {manualBadges.length > 0 && (
                          <AwardBadgeDialog
                            studentId={entry.studentId}
                            studentName={entry.studentName}
                            manualBadges={manualBadges}
                            earnedBadgeIds={earnedBadgeIds}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
```

Add the gamification translations object:

```typescript
  const tg = await getTranslations("gamification");
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/progress/page.tsx"
git commit -m "feat(gamification): add leaderboard and badge award to moderator progress page"
```

---

### Task 12: Page — Extend Moderator Student Detail Page

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx`

- [ ] **Step 1: Add gamification imports and data fetching**

Add imports:

```typescript
import {
  getStudentBadges,
  getBadgeCatalog,
} from "@/server/services/gamification";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import { Button } from "@/components/ui/button";
import { revokeBadgeAction } from "@/server/actions/gamification";
```

Note: Button may already be imported — don't duplicate.

After existing data fetching, add:

```typescript
  const gamificationEnabled = await isFeatureEnabled("gamification");

  let badgeCatalog: Awaited<ReturnType<typeof getBadgeCatalog>> = [];
  let studentBadges: Awaited<ReturnType<typeof getStudentBadges>> = [];

  if (gamificationEnabled) {
    [badgeCatalog, studentBadges] = await Promise.all([
      getBadgeCatalog(),
      getStudentBadges(studentId),
    ]);
  }
```

- [ ] **Step 2: Add badges section to JSX**

After the stats cards and before the CustomGoalForm (or after it, logically fits after goals), add:

```tsx
      {gamificationEnabled && badgeCatalog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("myBadges")}</h2>
          <BadgeGrid catalog={badgeCatalog} earned={studentBadges} />

          {studentBadges.filter((sb) => sb.awardedById).length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {tg("manualBadge")}
              </h3>
              {studentBadges
                .filter((sb) => sb.awardedById)
                .map((sb) => (
                  <div
                    key={sb.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {tg(`badge_${sb.badge.key}`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sb.awardedBy?.name
                          ? tg("awardedBy", { name: sb.awardedBy.name })
                          : ""}
                        {sb.note ? ` — ${sb.note}` : ""}
                      </p>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await revokeBadgeAction(sb.id);
                      }}
                    >
                      <Button variant="ghost" size="sm" className="text-destructive">
                        {tg("revokeBadge")}
                      </Button>
                    </form>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
```

Add gamification translations:

```typescript
  const tg = await getTranslations("gamification");
```

Note: The inline `"use server"` form action for revoke is a Next.js pattern. However, since `revokeBadgeAction` is already a server action imported from the actions file, you can call it directly. Alternatively, create a small client component `RevokeBadgeButton` if the inline server action pattern causes issues. The simplest approach: use a `<form>` with a hidden input and the server action, or wrap in a client component. Choose whichever pattern the existing codebase uses for similar delete buttons (check `CustomGoalForm` — it uses a client component with `onClick`). Since `CustomGoalForm` handles deletion client-side, a consistent approach would be a small client wrapper. However, the inline form action also works in Next.js 16. Use the inline approach first and fall back to a client component if the build complains.

- [ ] **Step 3: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/progress/[studentId]/page.tsx"
git commit -m "feat(gamification): add badge grid and revoke to moderator student detail page"
```

---

### Task 13: Page — Extend Admin Progress Page

**Files:**
- Modify: `app/[locale]/(dashboard)/admin/progress/page.tsx`

- [ ] **Step 1: Add gamification imports and data fetching**

Add imports:

```typescript
import {
  getSchoolLeaderboard,
  getBadgesAwardedThisMonth,
} from "@/server/services/gamification";
```

In the existing `Promise.all` that fetches `stats, milestonesByMonth, groupComparison, topPerformers`, add gamification data:

```typescript
  const gamificationEnabled = await isFeatureEnabled("gamification");

  let badgesThisMonth = 0;
  let schoolLeaderboard: Awaited<ReturnType<typeof getSchoolLeaderboard>> = [];

  if (gamificationEnabled) {
    [badgesThisMonth, schoolLeaderboard] = await Promise.all([
      getBadgesAwardedThisMonth(),
      getSchoolLeaderboard(),
    ]);
  }
```

- [ ] **Step 2: Add badges this month stats card**

In the stats grid (the `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">` section), add a fifth card or replace the grid to accommodate it. Since we have 4 columns, adding a fifth card after the existing 4 will wrap naturally:

```tsx
        {gamificationEnabled && (
          <StatsCard
            title={tg("badgesThisMonth")}
            value={badgesThisMonth}
            colorClass="text-pink-600"
          />
        )}
```

Add gamification translations:

```typescript
  const tg = await getTranslations("gamification");
```

- [ ] **Step 3: Add school leaderboard table**

After the existing top performers table, add:

```tsx
      {gamificationEnabled && schoolLeaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{tg("schoolLeaderboard")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg("rank")}</TableHead>
                  <TableHead>{tg("studentName")}</TableHead>
                  <TableHead>{tg("milestones")}</TableHead>
                  <TableHead>{tg("quranPercentage")}</TableHead>
                  <TableHead>{tg("streak")}</TableHead>
                  <TableHead>{tg("badges")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolLeaderboard.map((entry: typeof schoolLeaderboard[number]) => (
                  <TableRow key={entry.studentId}>
                    <TableCell className="font-bold">{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.studentName}</TableCell>
                    <TableCell>{entry.milestoneCount}</TableCell>
                    <TableCell>{entry.quranPercentage}%</TableCell>
                    <TableCell>{t("weeksStreak", { count: entry.currentStreak })}</TableCell>
                    <TableCell>{entry.badgeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

```bash
npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/progress/page.tsx"
git commit -m "feat(gamification): add badges this month stat and school leaderboard to admin page"
```

---

### Task 14: Final Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full build**

```bash
npx next build
```

Expected: Build succeeds with no errors. All gamification routes compile.

- [ ] **Step 2: Verify seed works**

```bash
npx prisma db seed
```

Expected: Badges seeded, gamification flag created, no errors.

- [ ] **Step 3: Review all committed changes**

```bash
git log --oneline | head -15
```

Expected: ~13 commits covering schema, seed, i18n, service, actions, hooks, components, and page extensions.
