import { db } from "@/server/db/client";
import { Prisma } from "../../prisma/generated/prisma/client";
import { createNotification } from "@/server/services/notification";
import { createAuditLog } from "@/server/services/audit-log";
import { getReviewStreak } from "@/server/services/progress";

type TriggerRule =
  | { type: "JUZ_COMPLETE" | "SURAH_COMPLETE" | "HIZB_COMPLETE"; count: number }
  | { type: "STREAK"; weeks: number }
  | { type: "REVIEW_COUNT"; count: number };

export async function checkBadges(studentProfileId: string) {
  const autoBadges = await db.badgeDefinition.findMany({
    where: { trigger: { not: Prisma.DbNull } },
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

  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const totalAyahs = await db.quranAyah.count();

  // Batch quran percentage: one COUNT query per distinct position
  const quranPctMap = await batchQuranPercentages(
    students.map((s) => ({ id: s.id, plan: s.memorizationPlans[0] })),
    totalAyahs,
  );

  // Batch review streaks
  const streakMap = await batchReviewStreaks(studentIds);

  const entries: Omit<LeaderboardEntry, "rank">[] = students.map((s) => ({
    studentId: s.id,
    studentName: s.user.name ?? "—",
    milestoneCount: s._count.milestones,
    quranPercentage: quranPctMap.get(s.id) ?? 0,
    currentStreak: streakMap.get(s.id) ?? 0,
    badgeCount: s._count.badges,
  }));

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

  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const totalAyahs = await db.quranAyah.count();

  // Batch quran percentage
  const quranPctMap = await batchQuranPercentages(
    students.map((s) => ({ id: s.id, plan: s.memorizationPlans[0] })),
    totalAyahs,
  );

  // Batch review streaks
  const streakMap = await batchReviewStreaks(studentIds);

  const entries: Omit<LeaderboardEntry, "rank">[] = students.map((s) => ({
    studentId: s.id,
    studentName: s.user.name ?? "—",
    milestoneCount: s._count.milestones,
    quranPercentage: quranPctMap.get(s.id) ?? 0,
    currentStreak: streakMap.get(s.id) ?? 0,
    badgeCount: s._count.badges,
  }));

  entries.sort((a, b) => {
    if (b.milestoneCount !== a.milestoneCount) return b.milestoneCount - a.milestoneCount;
    if (b.quranPercentage !== a.quranPercentage) return b.quranPercentage - a.quranPercentage;
    return b.currentStreak - a.currentStreak;
  });

  return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── Batch helpers to eliminate N+1 queries ──

async function batchQuranPercentages(
  items: { id: string; plan?: { currentSurahId: number; currentAyahNumber: number } }[],
  totalAyahs: number,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (totalAyahs === 0) return result;

  // Deduplicate positions to minimize queries
  const positionKey = (s: number, a: number) => `${s}:${a}`;
  const uniquePositions = new Map<string, { surahNumber: number; ayahNumber: number }>();
  const studentPositionKeys = new Map<string, string>();

  for (const item of items) {
    if (!item.plan) {
      result.set(item.id, 0);
      continue;
    }
    const key = positionKey(item.plan.currentSurahId, item.plan.currentAyahNumber);
    uniquePositions.set(key, { surahNumber: item.plan.currentSurahId, ayahNumber: item.plan.currentAyahNumber });
    studentPositionKeys.set(item.id, key);
  }

  // Run one COUNT per unique position (typically far fewer than N students)
  const positionCounts = new Map<string, number>();
  await Promise.all(
    Array.from(uniquePositions.entries()).map(async ([key, pos]) => {
      const count = await db.quranAyah.count({
        where: {
          OR: [
            { surahNumber: { lt: pos.surahNumber } },
            { surahNumber: pos.surahNumber, ayahNumber: { lt: pos.ayahNumber } },
          ],
        },
      });
      positionCounts.set(key, count);
    }),
  );

  for (const item of items) {
    const posKey = studentPositionKeys.get(item.id);
    if (!posKey) continue;
    const count = positionCounts.get(posKey) ?? 0;
    result.set(item.id, Math.round((count / totalAyahs) * 100));
  }

  return result;
}

function getMonday(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.getTime();
}

async function batchReviewStreaks(studentIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (studentIds.length === 0) return result;

  // Single query: fetch all review dates for all students
  const allReviews = await db.memorizationReview.findMany({
    where: {
      plan: { studentId: { in: studentIds }, active: true },
    },
    select: {
      reviewDate: true,
      plan: { select: { studentId: true } },
    },
    orderBy: { reviewDate: "desc" },
  });

  // Group by student
  const reviewsByStudent = new Map<string, Date[]>();
  for (const id of studentIds) reviewsByStudent.set(id, []);
  for (const r of allReviews) {
    reviewsByStudent.get(r.plan.studentId)?.push(r.reviewDate);
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const thisMonday = getMonday(new Date());

  // Compute streak per student in JS
  for (const [studentId, reviews] of reviewsByStudent) {
    if (reviews.length === 0) {
      result.set(studentId, 0);
      continue;
    }

    const mondaySet = new Set(reviews.map((r) => getMonday(r)));
    let currentStreak = 0;
    let check = thisMonday;
    if (!mondaySet.has(check)) check -= WEEK_MS;
    while (mondaySet.has(check)) {
      currentStreak++;
      check -= WEEK_MS;
    }
    result.set(studentId, currentStreak);
  }

  return result;
}

export async function getBadgesAwardedThisMonth(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return db.studentBadge.count({
    where: { awardedAt: { gte: thirtyDaysAgo } },
  });
}
