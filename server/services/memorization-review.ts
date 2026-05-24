import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateReviewInput } from "@/lib/validations/memorization";
import type { MeetingCadence } from "@/prisma/generated/prisma/enums";
import { checkMilestones, checkCustomGoals } from "./progress";
import { checkBadges } from "@/server/services/gamification";

function calculateNextReviewDate(
  fromDate: Date,
  cadence: MeetingCadence,
  customDays: number | null
): Date {
  const next = new Date(fromDate);
  switch (cadence) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "TWICE_WEEKLY":
      next.setDate(next.getDate() + 3);
      break;
    case "CUSTOM":
      next.setDate(next.getDate() + (customDays || 7));
      break;
  }
  return next;
}

export async function createReview(input: CreateReviewInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: input.planId },
    include: {
      group: { select: { meetingCadence: true, customCadenceDays: true } },
    },
  });

  if (!plan) throw new Error("Plan not found");

  // Save old position before transaction
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

  // Fire-and-forget milestone detection
  checkMilestones(input.planId, oldSurahNumber, oldAyahNumber, input.toSurahNumber, input.toAyah).catch(() => {});
  checkCustomGoals(input.planId, input.toSurahNumber, input.toAyah).catch(() => {});
  checkBadges(plan.studentId).catch(() => {});

  return review;
}

export async function getReviewsByPlan(planId: string) {
  return db.memorizationReview.findMany({
    where: { planId },
    include: {
      fromSurah: { select: { nameAr: true, nameEn: true } },
      toSurah: { select: { nameAr: true, nameEn: true } },
      _count: { select: { mistakes: true } },
    },
    orderBy: { reviewDate: "desc" },
  });
}

export async function getReviewDetail(reviewId: string) {
  return db.memorizationReview.findUnique({
    where: { id: reviewId },
    include: {
      fromSurah: { select: { nameAr: true, nameEn: true } },
      toSurah: { select: { nameAr: true, nameEn: true } },
      nextFromSurah: { select: { nameAr: true, nameEn: true } },
      nextToSurah: { select: { nameAr: true, nameEn: true } },
      moderator: { select: { name: true, nameAr: true } },
      tajweedScores: {
        include: { category: { select: { nameEn: true, nameAr: true } } },
        orderBy: { category: { sortOrder: "asc" } },
      },
      mistakes: { orderBy: { id: "asc" } },
    },
  });
}

export async function calculateNextHomework(planId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: {
      currentSurahId: true,
      currentAyahNumber: true,
      paceUnit: true,
      paceValue: true,
    },
  });

  if (!plan) return null;

  const currentAyah = await db.quranAyah.findUnique({
    where: {
      surahNumber_ayahNumber: {
        surahNumber: plan.currentSurahId,
        ayahNumber: plan.currentAyahNumber,
      },
    },
    select: { quarterNumber: true, hizbNumber: true, pageNumber: true },
  });

  if (!currentAyah) return null;

  const paceValue = Number(plan.paceValue);
  let endAyah: { surahNumber: number; ayahNumber: number } | null = null;

  if (plan.paceUnit === "RUB") {
    const targetQuarter = currentAyah.quarterNumber + paceValue;
    const targetAyah = await db.quranAyah.findFirst({
      where: { quarterNumber: { gte: Math.ceil(targetQuarter) } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  } else if (plan.paceUnit === "HIZB") {
    const targetHizb = currentAyah.hizbNumber + paceValue;
    const targetAyah = await db.quranAyah.findFirst({
      where: { hizbNumber: { gte: Math.ceil(targetHizb) } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  } else if (plan.paceUnit === "PAGE_COUNT" && currentAyah.pageNumber) {
    const targetPage = currentAyah.pageNumber + Math.ceil(paceValue);
    const targetAyah = await db.quranAyah.findFirst({
      where: { pageNumber: { gte: targetPage } },
      orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
      select: { surahNumber: true, ayahNumber: true },
    });
    endAyah = targetAyah;
  }

  if (!endAyah) {
    endAyah = { surahNumber: 114, ayahNumber: 6 };
  }

  return {
    fromSurahNumber: plan.currentSurahId,
    fromAyah: plan.currentAyahNumber,
    toSurahNumber: endAyah.surahNumber,
    toAyah: endAyah.ayahNumber,
  };
}
