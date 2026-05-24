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
