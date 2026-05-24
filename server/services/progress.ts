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
