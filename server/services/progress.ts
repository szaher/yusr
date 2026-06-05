import { db } from "@/server/db/client";
import { createNotification } from "@/server/services/notification";
import { createAuditLog } from "@/server/services/audit-log";
import { checkBadges } from "@/server/services/gamification";
import { logger } from "@/server/lib/logger";

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
    const juzRecords = await db.quranJuz.findMany({
      where: { number: { gte: oldAyah.juzNumber, lt: newAyah.juzNumber } },
    });
    const juzMap = new Map(juzRecords.map((j) => [j.number, j]));
    for (let juz = oldAyah.juzNumber; juz < newAyah.juzNumber; juz++) {
      const juzInfo = juzMap.get(juz);
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
    } catch (err) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code !== "P2002") throw err;
    }
  }

  if (newMilestones.length > 0) {
    checkBadges(plan.studentId).catch((err) => { logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Background task failed"); });
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
      } catch (err) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code !== "P2002") throw err;
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

  if (groupStudents.length === 0) return [];

  const studentIds = groupStudents.map((gs) => gs.student.id);
  const planIds = groupStudents
    .map((gs) => gs.student.memorizationPlans[0]?.id)
    .filter((id): id is string => !!id);

  // Batch: quran percentages via deduplicated position counts
  const positionKey = (s: number, a: number) => `${s}:${a}`;
  const uniquePositions = new Map<string, { surahNumber: number; ayahNumber: number }>();
  const studentPositionKeys = new Map<string, string>();

  for (const gs of groupStudents) {
    const plan = gs.student.memorizationPlans[0];
    if (plan) {
      const key = positionKey(plan.currentSurahId, plan.currentAyahNumber);
      uniquePositions.set(key, { surahNumber: plan.currentSurahId, ayahNumber: plan.currentAyahNumber });
      studentPositionKeys.set(gs.student.id, key);
    }
  }

  const positionCounts = new Map<string, number>();
  const [juzCounts, latestReviews, allReviews] = await Promise.all([
    // Batch: juz milestone counts per student
    db.studentMilestone.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, type: "JUZ_COMPLETE" },
      _count: { id: true },
    }),
    // Batch: latest review per plan
    planIds.length > 0
      ? db.memorizationReview.findMany({
          where: { planId: { in: planIds } },
          orderBy: { reviewDate: "desc" },
          distinct: ["planId" as const],
          select: { planId: true, reviewDate: true },
        })
      : (Promise.resolve([]) as Promise<{ planId: string; reviewDate: Date }[]>),
    // Batch: all review dates for streak calculation
    db.memorizationReview.findMany({
      where: { plan: { studentId: { in: studentIds }, active: true } },
      select: { reviewDate: true, plan: { select: { studentId: true } } },
      orderBy: { reviewDate: "desc" },
    }),
  ]);

  // Batch: quran position counts
  await Promise.all(
    Array.from(uniquePositions.entries()).map(async ([key, pos]) => {
      const count = await db.quranAyah.count({
        where: {
          OR: [
            { surahNumber: { lt: pos.surahNumber } },
            { surahNumber: pos.surahNumber, ayahNumber: { lte: pos.ayahNumber } },
          ],
        },
      });
      positionCounts.set(key, count);
    }),
  );

  // Build lookup maps
  const juzCountMap = new Map(juzCounts.map((g) => [g.studentId, g._count.id]));
  const latestReviewMap = new Map(latestReviews.map((r) => [r.planId, r.reviewDate]));

  // Compute streaks in JS
  const reviewsByStudent = new Map<string, Date[]>();
  for (const id of studentIds) reviewsByStudent.set(id, []);
  for (const r of allReviews) {
    reviewsByStudent.get(r.plan.studentId)?.push(r.reviewDate);
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const thisMonday = getMonday(new Date());

  const results = groupStudents.map((gs) => {
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

    const posKey = studentPositionKeys.get(gs.student.id);
    const covered = posKey ? (positionCounts.get(posKey) ?? 0) : 0;
    const quranPercentage = Math.round((covered / TOTAL_QURAN_AYAHS) * 100);

    // Compute streak
    const reviews = reviewsByStudent.get(gs.student.id) ?? [];
    let currentStreak = 0;
    if (reviews.length > 0) {
      const mondaySet = new Set(reviews.map((r) => getMonday(r)));
      let check = thisMonday;
      if (!mondaySet.has(check)) check -= WEEK_MS;
      while (mondaySet.has(check)) {
        currentStreak++;
        check -= WEEK_MS;
      }
    }

    return {
      studentId: gs.student.id,
      studentName: gs.student.user.name,
      quranPercentage,
      juzCount: juzCountMap.get(gs.student.id) ?? 0,
      currentStreak,
      lastReview: latestReviewMap.get(plan.id) ?? null,
    };
  });

  return results.sort((a, b) => b.quranPercentage - a.quranPercentage);
}

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
    // Batch: deduplicate positions for quran percentage
    const positionKey = (s: number, a: number) => `${s}:${a}`;
    const uniquePositions = new Map<string, { surahNumber: number; ayahNumber: number }>();
    for (const p of activePlans) {
      const key = positionKey(p.currentSurahId, p.currentAyahNumber);
      uniquePositions.set(key, { surahNumber: p.currentSurahId, ayahNumber: p.currentAyahNumber });
    }

    const positionCounts = new Map<string, number>();
    await Promise.all(
      Array.from(uniquePositions.entries()).map(async ([key, pos]) => {
        const count = await db.quranAyah.count({
          where: {
            OR: [
              { surahNumber: { lt: pos.surahNumber } },
              { surahNumber: pos.surahNumber, ayahNumber: { lte: pos.ayahNumber } },
            ],
          },
        });
        positionCounts.set(key, count);
      }),
    );

    let totalPct = 0;
    for (const p of activePlans) {
      const key = positionKey(p.currentSurahId, p.currentAyahNumber);
      const covered = positionCounts.get(key) ?? 0;
      totalPct += Math.round((covered / TOTAL_QURAN_AYAHS) * 100);
    }
    avgQuranPercentage = Math.round(totalPct / activePlans.length);

    // Batch: fetch all review dates for streak calculation
    const studentIds = [...new Set(activePlans.map((p) => p.studentId))];
    const allReviews = await db.memorizationReview.findMany({
      where: { plan: { studentId: { in: studentIds }, active: true } },
      select: { reviewDate: true, plan: { select: { studentId: true } } },
      orderBy: { reviewDate: "desc" },
    });

    const reviewsByStudent = new Map<string, Date[]>();
    for (const id of studentIds) reviewsByStudent.set(id, []);
    for (const r of allReviews) {
      reviewsByStudent.get(r.plan.studentId)?.push(r.reviewDate);
    }

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const thisMonday = getMonday(new Date());

    for (const [, reviews] of reviewsByStudent) {
      if (reviews.length === 0) continue;
      const mondaySet = new Set(reviews.map((r) => getMonday(r)));
      let currentStreak = 0;
      let check = thisMonday;
      if (!mondaySet.has(check)) check -= WEEK_MS;
      while (mondaySet.has(check)) {
        currentStreak++;
        check -= WEEK_MS;
      }
      topStreak = Math.max(topStreak, currentStreak);
    }
  }

  return {
    milestonesThisMonth,
    studentsWithActivePlans: activePlans.length,
    avgQuranPercentage,
    topStreak,
  };
}

interface TopPerformer {
  studentId: string;
  studentName: string;
  groupName: string;
  quranPercentage: number;
  milestoneCount: number;
  currentStreak: number;
}

export async function getTopPerformers(limit = 10): Promise<TopPerformer[]> {
  const performers = await db.studentMilestone.groupBy({
    by: ["studentId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  if (performers.length === 0) return [];

  const studentIds = performers.map((p) => p.studentId);
  const milestoneMap = new Map(performers.map((p) => [p.studentId, p._count.id]));

  // Single batch query for all student profiles
  const students = await db.studentProfile.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      user: { select: { name: true } },
      groupStudents: { select: { group: { select: { name: true } } }, take: 1 },
      memorizationPlans: {
        where: { active: true },
        select: { currentSurahId: true, currentAyahNumber: true },
        take: 1,
      },
    },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Batch: deduplicate positions for quran percentage
  const positionKey = (s: number, a: number) => `${s}:${a}`;
  const uniquePositions = new Map<string, { surahNumber: number; ayahNumber: number }>();
  const studentPositionKeys = new Map<string, string>();

  for (const s of students) {
    const plan = s.memorizationPlans[0];
    if (plan) {
      const key = positionKey(plan.currentSurahId, plan.currentAyahNumber);
      uniquePositions.set(key, { surahNumber: plan.currentSurahId, ayahNumber: plan.currentAyahNumber });
      studentPositionKeys.set(s.id, key);
    }
  }

  const positionCounts = new Map<string, number>();

  // Batch: quran counts + review dates in parallel
  const [, allReviews] = await Promise.all([
    Promise.all(
      Array.from(uniquePositions.entries()).map(async ([key, pos]) => {
        const count = await db.quranAyah.count({
          where: {
            OR: [
              { surahNumber: { lt: pos.surahNumber } },
              { surahNumber: pos.surahNumber, ayahNumber: { lte: pos.ayahNumber } },
            ],
          },
        });
        positionCounts.set(key, count);
      }),
    ),
    db.memorizationReview.findMany({
      where: { plan: { studentId: { in: studentIds }, active: true } },
      select: { reviewDate: true, plan: { select: { studentId: true } } },
      orderBy: { reviewDate: "desc" },
    }),
  ]);

  // Compute streaks
  const reviewsByStudent = new Map<string, Date[]>();
  for (const id of studentIds) reviewsByStudent.set(id, []);
  for (const r of allReviews) {
    reviewsByStudent.get(r.plan.studentId)?.push(r.reviewDate);
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const thisMonday = getMonday(new Date());

  return performers.map((p) => {
    const student = studentMap.get(p.studentId);
    const posKey = studentPositionKeys.get(p.studentId);
    const covered = posKey ? (positionCounts.get(posKey) ?? 0) : 0;
    const quranPercentage = Math.round((covered / TOTAL_QURAN_AYAHS) * 100);

    const reviews = reviewsByStudent.get(p.studentId) ?? [];
    let currentStreak = 0;
    if (reviews.length > 0) {
      const mondaySet = new Set(reviews.map((r) => getMonday(r)));
      let check = thisMonday;
      if (!mondaySet.has(check)) check -= WEEK_MS;
      while (mondaySet.has(check)) {
        currentStreak++;
        check -= WEEK_MS;
      }
    }

    return {
      studentId: p.studentId,
      studentName: student?.user.name ?? "—",
      groupName: student?.groupStudents[0]?.group.name ?? "—",
      quranPercentage,
      milestoneCount: milestoneMap.get(p.studentId) ?? 0,
      currentStreak,
    };
  });
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

  // Batch: deduplicate all positions across all groups
  const positionKey = (s: number, a: number) => `${s}:${a}`;
  const uniquePositions = new Map<string, { surahNumber: number; ayahNumber: number }>();

  for (const g of groups) {
    for (const p of g.memorizationPlans) {
      const key = positionKey(p.currentSurahId, p.currentAyahNumber);
      uniquePositions.set(key, { surahNumber: p.currentSurahId, ayahNumber: p.currentAyahNumber });
    }
  }

  const positionCounts = new Map<string, number>();
  await Promise.all(
    Array.from(uniquePositions.entries()).map(async ([key, pos]) => {
      const count = await db.quranAyah.count({
        where: {
          OR: [
            { surahNumber: { lt: pos.surahNumber } },
            { surahNumber: pos.surahNumber, ayahNumber: { lte: pos.ayahNumber } },
          ],
        },
      });
      positionCounts.set(key, count);
    }),
  );

  const results = groups.map((g) => {
    if (g.memorizationPlans.length === 0) return { label: g.name, value: 0 };
    let totalPct = 0;
    for (const p of g.memorizationPlans) {
      const key = positionKey(p.currentSurahId, p.currentAyahNumber);
      const covered = positionCounts.get(key) ?? 0;
      totalPct += Math.round((covered / TOTAL_QURAN_AYAHS) * 100);
    }
    return { label: g.name, value: Math.round(totalPct / g.memorizationPlans.length) };
  });

  return results.sort((a, b) => b.value - a.value);
}

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
