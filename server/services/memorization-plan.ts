import { db } from "@/server/db/client";
import { Prisma } from "@/prisma/generated/prisma/client";
import { createAuditLog } from "./audit-log";
import type { CreatePlanInput, UpdatePlanInput, SetOverrideInput } from "@/lib/validations/memorization";

export async function createPlan(input: CreatePlanInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.create({
    data: {
      studentId: input.studentId,
      groupId: input.groupId,
      currentSurahId: input.surahNumber,
      currentAyahNumber: input.ayahNumber,
      paceUnit: input.paceUnit,
      paceValue: input.paceValue,
      meetingCadence: input.meetingCadence || null,
      customCadenceDays: input.customCadenceDays || null,
      templateId: input.templateId || null,
    },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.create",
    entityType: "StudentMemorizationPlan",
    entityId: plan.id,
    metadata: {
      studentId: input.studentId,
      groupId: input.groupId,
      surah: input.surahNumber,
      ayah: input.ayahNumber,
    },
  });

  return plan;
}

export async function updatePlan(input: UpdatePlanInput, actorId: string) {
  const data: Record<string, unknown> = {};
  if (input.paceUnit !== undefined) data.paceUnit = input.paceUnit;
  if (input.paceValue !== undefined) data.paceValue = input.paceValue;
  if (input.meetingCadence !== undefined) data.meetingCadence = input.meetingCadence;
  if (input.customCadenceDays !== undefined) data.customCadenceDays = input.customCadenceDays;

  const plan = await db.studentMemorizationPlan.update({
    where: { id: input.planId },
    data,
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.update",
    entityType: "StudentMemorizationPlan",
    entityId: input.planId,
    metadata: data,
  });

  return plan;
}

export async function getPlanByStudent(studentId: string, groupId: string) {
  return db.studentMemorizationPlan.findUnique({
    where: { studentId_groupId: { studentId, groupId } },
    include: {
      currentSurah: { select: { number: true, nameAr: true, nameEn: true, ayahCount: true } },
      group: {
        select: {
          id: true,
          name: true,
          meetingCadence: true,
          customCadenceDays: true,
        },
      },
    },
  });
}

export async function getPlansForGroup(groupId: string) {
  return db.studentMemorizationPlan.findMany({
    where: { groupId, active: true },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, nameAr: true } },
        },
      },
      currentSurah: { select: { number: true, nameAr: true, nameEn: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { student: { user: { name: "asc" } } },
  });
}

export async function getPlansForModerator(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { where: { memorizationPlansEnabled: true }, select: { id: true, name: true } } },
  });

  if (!profile || profile.groups.length === 0) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.studentMemorizationPlan.findMany({
    where: { groupId: { in: groupIds }, active: true },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { name: true, nameAr: true } },
        },
      },
      currentSurah: { select: { number: true, nameAr: true, nameEn: true } },
      group: { select: { id: true, name: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getStudentProgress(planId: string) {
  const plan = await db.studentMemorizationPlan.findUnique({
    where: { id: planId },
    select: { currentSurahId: true, currentAyahNumber: true },
  });

  if (!plan) return null;

  const currentAyah = await db.quranAyah.findUnique({
    where: {
      surahNumber_ayahNumber: {
        surahNumber: plan.currentSurahId,
        ayahNumber: plan.currentAyahNumber,
      },
    },
    select: { juzNumber: true, hizbNumber: true, quarterNumber: true, pageNumber: true },
  });

  if (!currentAyah) return null;

  const totalAyahs = await db.quranAyah.count();
  const completedAyahs = await db.quranAyah.count({
    where: {
      OR: [
        { surahNumber: { lt: plan.currentSurahId } },
        {
          surahNumber: plan.currentSurahId,
          ayahNumber: { lt: plan.currentAyahNumber },
        },
      ],
    },
  });

  const percentage = totalAyahs > 0 ? Math.round((completedAyahs / totalAyahs) * 1000) / 10 : 0;

  return {
    juz: currentAyah.juzNumber,
    hizb: currentAyah.hizbNumber,
    quarter: currentAyah.quarterNumber,
    page: currentAyah.pageNumber,
    percentage,
    completedAyahs,
    totalAyahs,
  };
}

export async function setNextOverride(input: SetOverrideInput, actorId: string) {
  const plan = await db.studentMemorizationPlan.update({
    where: { id: input.planId },
    data: {
      nextOverride: {
        paceUnit: input.paceUnit,
        paceValue: input.paceValue,
        note: input.note || null,
      },
    },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.set_override",
    entityType: "StudentMemorizationPlan",
    entityId: input.planId,
    metadata: { paceUnit: input.paceUnit, paceValue: input.paceValue },
  });

  return plan;
}

export async function clearNextOverride(planId: string, actorId: string) {
  const plan = await db.studentMemorizationPlan.update({
    where: { id: planId },
    data: { nextOverride: Prisma.JsonNull },
  });

  await createAuditLog({
    actorId,
    action: "memorization_plan.clear_override",
    entityType: "StudentMemorizationPlan",
    entityId: planId,
    metadata: {},
  });

  return plan;
}
