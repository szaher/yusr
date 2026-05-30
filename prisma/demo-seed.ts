import type { PrismaClient } from "./generated/prisma/client";
import { Prisma } from "./generated/prisma/client";
import { QURAN_SURAHS } from "./data/quran-surahs";
import { JUZ_BOUNDARIES } from "./data/quran-juz-boundaries";
import { hashPassword } from "../server/auth/password";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weeksAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  d.setHours(18, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

type AttendancePattern = "perfect" | "good" | "mixed" | "poor";

function getAttendance(pattern: AttendancePattern, weekIndex: number): string {
  if (pattern === "perfect") return "PRESENT";
  if (pattern === "good") {
    if (weekIndex === 4) return "LATE";
    if (weekIndex === 8) return "ABSENT";
    return "PRESENT";
  }
  if (pattern === "mixed") {
    if ([2, 5, 8, 10].includes(weekIndex)) return "ABSENT";
    if (weekIndex === 6) return "EXCUSED_ABSENCE";
    return "PRESENT";
  }
  // poor
  if ([1, 3, 5, 7, 9, 10].includes(weekIndex)) return "ABSENT";
  return "PRESENT";
}

function getGrade(base: number, weekIndex: number): number {
  const jitter = ((weekIndex * 7 + 13) % 15) - 7;
  return Math.max(50, Math.min(100, base + jitter));
}

function getRecitationResult(grade: number): string {
  if (grade >= 90) return "EXCELLENT";
  if (grade >= 75) return "GOOD";
  if (grade >= 60) return "NEEDS_REVIEW";
  return "INCOMPLETE";
}

interface QuranPosition {
  surah: number;
  ayah: number;
}

function totalAyahsBefore(surah: number, ayah: number): number {
  let total = 0;
  for (let i = 0; i < surah - 1; i++) {
    total += QURAN_SURAHS[i].ayahCount;
  }
  return total + ayah;
}

function ayahToPosition(totalAyahs: number): QuranPosition {
  let remaining = totalAyahs;
  for (const s of QURAN_SURAHS) {
    if (remaining <= s.ayahCount) {
      return { surah: s.number, ayah: remaining };
    }
    remaining -= s.ayahCount;
  }
  return { surah: 114, ayah: QURAN_SURAHS[113].ayahCount };
}

function computeReviewRanges(
  startSurah: number,
  startAyah: number,
  endSurah: number,
  endAyah: number,
  numReviews: number
): Array<{ from: QuranPosition; to: QuranPosition }> {
  const startTotal = totalAyahsBefore(startSurah, startAyah);
  const endTotal = totalAyahsBefore(endSurah, endAyah);
  const totalAyahs = endTotal - startTotal;

  if (totalAyahs <= 0 || numReviews <= 0) return [];

  const perReview = Math.max(1, Math.floor(totalAyahs / numReviews));
  const ranges: Array<{ from: QuranPosition; to: QuranPosition }> = [];

  let currentTotal = startTotal;
  for (let i = 0; i < numReviews; i++) {
    const fromPos = ayahToPosition(currentTotal);
    const nextTotal = i === numReviews - 1 ? endTotal : currentTotal + perReview;
    const toPos = ayahToPosition(nextTotal);
    ranges.push({ from: fromPos, to: toPos });
    currentTotal = nextTotal;
  }

  return ranges;
}

function getCompletedSurahsBefore(surah: number, ayah: number): number[] {
  const completed: number[] = [];
  for (const s of QURAN_SURAHS) {
    if (s.number >= surah) break;
    completed.push(s.number);
  }
  return completed;
}

function getCompletedJuzBefore(surah: number, ayah: number): number[] {
  const pos = totalAyahsBefore(surah, ayah);
  const completed: number[] = [];
  for (let i = 1; i < JUZ_BOUNDARIES.length; i++) {
    const boundary = JUZ_BOUNDARIES[i];
    const boundaryTotal = totalAyahsBefore(boundary.surah, boundary.ayah);
    if (pos >= boundaryTotal) {
      completed.push(i);
    }
  }
  return completed;
}

// ---------------------------------------------------------------------------
// Student archetypes
// ---------------------------------------------------------------------------

interface StudentArchetype {
  email: string;
  name: string;
  nameAr: string;
  phone: string;
  country: string;
  quranLevel: string;
  group: number; // 1, 2, or 3
  attendance: AttendancePattern;
  gradeBase: number;
  currentSurah: number;
  currentAyah: number;
  pace: "RUB" | "HIZB";
  badges: string[];
  manualBadge?: { key: string; note: string };
  isExisting?: boolean;
}

const STUDENT_ARCHETYPES: StudentArchetype[] = [
  // Group 1 — Beginners
  { email: "student@yusr.academy", name: "Youssef", nameAr: "يوسف الطالب", phone: "+966500000001", country: "السعودية", quranLevel: "مبتدئ", group: 1, attendance: "perfect", gradeBase: 85, currentSurah: 2, currentAyah: 50, pace: "RUB", badges: ["first_surah", "streak_4"], isExisting: true },
  { email: "ali@yusr.academy", name: "Ali", nameAr: "علي الطالب", phone: "+966500000004", country: "السعودية", quranLevel: "مبتدئ", group: 1, attendance: "good", gradeBase: 78, currentSurah: 3, currentAyah: 20, pace: "RUB", badges: ["first_surah"] },
  { email: "ibrahim@yusr.academy", name: "Ibrahim", nameAr: "إبراهيم الطالب", phone: "+966500000005", country: "مصر", quranLevel: "مبتدئ", group: 1, attendance: "mixed", gradeBase: 70, currentSurah: 1, currentAyah: 5, pace: "RUB", badges: [] },
  { email: "student3@yusr.academy", name: "Saad", nameAr: "سعد الطالب", phone: "+966500000003", country: "الأردن", quranLevel: "مبتدئ", group: 1, attendance: "good", gradeBase: 72, currentSurah: 1, currentAyah: 3, pace: "RUB", badges: [], isExisting: true },

  // Group 2 — Intermediate
  { email: "student2@yusr.academy", name: "Omar", nameAr: "عمر الطالب", phone: "+966500000002", country: "مصر", quranLevel: "متوسط", group: 2, attendance: "good", gradeBase: 82, currentSurah: 4, currentAyah: 1, pace: "HIZB", badges: ["first_surah", "first_juz"], isExisting: true },
  { email: "hamza@yusr.academy", name: "Hamza", nameAr: "حمزة الطالب", phone: "+966500000006", country: "السعودية", quranLevel: "متوسط", group: 2, attendance: "perfect", gradeBase: 90, currentSurah: 9, currentAyah: 1, pace: "HIZB", badges: ["first_surah", "first_juz", "streak_4"] },
  { email: "tariq@yusr.academy", name: "Tariq", nameAr: "طارق الطالب", phone: "+966500000007", country: "الأردن", quranLevel: "متوسط", group: 2, attendance: "poor", gradeBase: 62, currentSurah: 2, currentAyah: 100, pace: "RUB", badges: [] },

  // Group 3 — Advanced
  { email: "bilal@yusr.academy", name: "Bilal", nameAr: "بلال الطالب", phone: "+966500000008", country: "السعودية", quranLevel: "متقدم", group: 3, attendance: "good", gradeBase: 92, currentSurah: 15, currentAyah: 1, pace: "HIZB", badges: ["first_surah", "first_juz", "five_juz", "streak_4"], manualBadge: { key: "excellent_tajweed", note: "أداء متميز في التجويد" } },
  { email: "zayd@yusr.academy", name: "Zayd", nameAr: "زيد الطالب", phone: "+966500000009", country: "مصر", quranLevel: "متقدم", group: 3, attendance: "perfect", gradeBase: 88, currentSurah: 12, currentAyah: 1, pace: "HIZB", badges: ["first_surah", "first_juz"] },
  { email: "sami@yusr.academy", name: "Sami", nameAr: "سامي الطالب", phone: "+966500000010", country: "الأردن", quranLevel: "متوسط", group: 3, attendance: "mixed", gradeBase: 74, currentSurah: 5, currentAyah: 1, pace: "HIZB", badges: ["first_surah"] },
];

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function seedFullDemo(prisma: PrismaClient) {
  const existing = await prisma.weeklySession.count({
    where: { groupId: "demo-group-1" },
  });
  if (existing > 0) {
    console.log("  Demo data already seeded, skipping.");
    return;
  }

  console.log("\n--- Seeding comprehensive demo data ---\n");

  const demoPassword = await hashPassword("demo123456");

  // -----------------------------------------------------------------------
  // 1. Users, profiles, org structure
  // -----------------------------------------------------------------------
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { name: "student" } });
  const moderatorRole = await prisma.role.findUniqueOrThrow({ where: { name: "moderator" } });
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@yusr.academy" } });
  const supportUser = await prisma.user.findFirst({ where: { email: "support@yusr.academy" } });

  // Moderator 3
  const mod3 = await prisma.user.upsert({
    where: { email: "moderator3@yusr.academy" },
    update: {},
    create: {
      email: "moderator3@yusr.academy",
      passwordHash: demoPassword,
      name: "Faisal",
      nameAr: "فيصل المشرف",
      roleId: moderatorRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  const mod3Profile = await prisma.moderatorProfile.upsert({
    where: { userId: mod3.id },
    update: {},
    create: { userId: mod3.id },
  });

  // Level 3, Class 3, Group 3
  await prisma.level.upsert({
    where: { id: "demo-level-3" },
    update: {},
    create: { id: "demo-level-3", nameAr: "المستوى المتقدم", nameEn: "Advanced Level", description: "للطلاب المتقدمين في حفظ القرآن", sortOrder: 3 },
  });
  await prisma.class.upsert({
    where: { id: "demo-class-3" },
    update: {},
    create: { id: "demo-class-3", name: "فصل آل عمران", levelId: "demo-level-3", defaultDay: "الإثنين", sessionTime: "20:00", capacity: 10 },
  });
  await prisma.group.upsert({
    where: { id: "demo-group-3" },
    update: {},
    create: { id: "demo-group-3", name: "مجموعة التقوى", classId: "demo-class-3", moderatorId: mod3Profile.id, weeklyDay: "الإثنين", weeklyTime: "20:00", memorizationPlansEnabled: true },
  });

  // Enable memorization plans on existing groups
  await prisma.group.updateMany({
    where: { id: { in: ["demo-group-1", "demo-group-2"] } },
    data: { memorizationPlansEnabled: true },
  });

  // Create/lookup all students
  const studentProfiles: Map<string, { id: string; userId: string }> = new Map();
  const studentUsers: Map<string, { id: string }> = new Map();

  for (const arch of STUDENT_ARCHETYPES) {
    let user;
    if (arch.isExisting) {
      user = await prisma.user.findUniqueOrThrow({ where: { email: arch.email } });
    } else {
      user = await prisma.user.upsert({
        where: { email: arch.email },
        update: {},
        create: {
          email: arch.email,
          passwordHash: demoPassword,
          name: arch.name,
          nameAr: arch.nameAr,
          roleId: studentRole.id,
          accountStatus: "ACTIVE",
          locale: "ar",
        },
      });
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, phone: arch.phone, country: arch.country, currentQuranLevel: arch.quranLevel },
      });
      await prisma.enrollmentApplication.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, registrationStatus: "APPROVED", submittedAt: daysAgo(90), reviewedAt: daysAgo(89) },
      });
    }

    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
    studentProfiles.set(arch.email, { id: profile.id, userId: user.id });
    studentUsers.set(arch.email, { id: user.id });

    const groupId = `demo-group-${arch.group}`;
    await prisma.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId: profile.id } },
      update: {},
      create: { groupId, studentId: profile.id },
    });
  }

  console.log(`  Created/verified ${STUDENT_ARCHETYPES.length} students across 3 groups`);

  // -----------------------------------------------------------------------
  // 2. Memorization Plans
  // -----------------------------------------------------------------------
  const plans: Map<string, string> = new Map(); // email -> planId

  for (const arch of STUDENT_ARCHETYPES) {
    const sp = studentProfiles.get(arch.email)!;
    const groupId = `demo-group-${arch.group}`;
    const plan = await prisma.studentMemorizationPlan.upsert({
      where: { studentId_groupId: { studentId: sp.id, groupId } },
      update: { currentSurahId: arch.currentSurah, currentAyahNumber: arch.currentAyah },
      create: {
        studentId: sp.id,
        groupId,
        currentSurahId: arch.currentSurah,
        currentAyahNumber: arch.currentAyah,
        paceUnit: arch.pace,
        paceValue: 1,
        meetingCadence: "WEEKLY",
        nextReviewDate: daysFromNow(3),
      },
    });
    plans.set(arch.email, plan.id);
  }

  console.log(`  Created ${plans.size} memorization plans`);

  // After all plans are created, assign templates and set one override
  const rubPlans = await prisma.studentMemorizationPlan.findMany({
    where: { paceUnit: "RUB" },
  });
  for (const plan of rubPlans) {
    await prisma.studentMemorizationPlan.update({
      where: { id: plan.id },
      data: { templateId: "tpl-rub" },
    });
  }

  // Set override on Ibrahim's plan to demonstrate the feature
  const ibrahimSp = studentProfiles.get("ibrahim@yusr.academy");
  if (ibrahimSp) {
    const ibrahimPlan = await prisma.studentMemorizationPlan.findFirst({
      where: { studentId: ibrahimSp.id },
    });
    if (ibrahimPlan) {
      await prisma.studentMemorizationPlan.update({
        where: { id: ibrahimPlan.id },
        data: {
          nextOverride: {
            paceUnit: "RUB",
            paceValue: 1.5,
            note: "أضف نصف ربع إضافي للمراجعة القادمة",
          },
        },
      });
    }
  }

  console.log("  Updated plans with templates and one override");

  // -----------------------------------------------------------------------
  // 3. Weekly Sessions
  // -----------------------------------------------------------------------
  const groupConfigs = [
    { id: "demo-group-1", moderatorEmail: "moderator@yusr.academy" },
    { id: "demo-group-2", moderatorEmail: "moderator2@yusr.academy" },
    { id: "demo-group-3", moderatorEmail: "moderator3@yusr.academy" },
  ];

  const sessions: Map<string, Array<{ id: string; weekIndex: number; date: Date; status: string }>> = new Map();

  for (const gc of groupConfigs) {
    const modUser = await prisma.user.findUniqueOrThrow({ where: { email: gc.moderatorEmail } });
    const modProfile = await prisma.moderatorProfile.findUniqueOrThrow({ where: { userId: modUser.id } });

    const groupSessions: Array<{ id: string; weekIndex: number; date: Date; status: string }> = [];

    for (let week = 11; week >= 0; week--) {
      const isUpcoming = week === 0;
      const sessionDate = weeksAgo(week);
      const status = isUpcoming ? "SCHEDULED" : "COMPLETED";

      const session = await prisma.weeklySession.create({
        data: {
          groupId: gc.id,
          moderatorId: modProfile.id,
          date: sessionDate,
          startTime: "18:00",
          endTime: "20:00",
          status,
          notes: isUpcoming ? undefined : "تمت الحلقة بنجاح",
        },
      });

      groupSessions.push({ id: session.id, weekIndex: week, date: sessionDate, status });
    }

    sessions.set(gc.id, groupSessions);
  }

  console.log("  Created 36 weekly sessions (12 per group)");

  // -----------------------------------------------------------------------
  // 4. Session Attendance + 5. Memorization Reviews
  // -----------------------------------------------------------------------
  const tajweedCategories = await prisma.tajweedCategory.findMany({ where: { isCore: true }, orderBy: { sortOrder: "asc" } });
  const mistakeCategories: Array<"TAJWEED_ERROR" | "WRONG_WORD" | "HESITATION" | "SKIPPED_AYAH"> = [
    "TAJWEED_ERROR", "WRONG_WORD", "HESITATION", "SKIPPED_AYAH",
  ];

  let totalAttendance = 0;
  let totalReviews = 0;

  for (const arch of STUDENT_ARCHETYPES) {
    const sp = studentProfiles.get(arch.email)!;
    const groupId = `demo-group-${arch.group}`;
    const groupSessions = sessions.get(groupId)!;
    const planId = plans.get(arch.email)!;

    const modEmail = groupConfigs.find(g => g.id === groupId)!.moderatorEmail;
    const modUser = await prisma.user.findUniqueOrThrow({ where: { email: modEmail } });

    // Determine review ranges for this student
    const presentSessions = groupSessions
      .filter(s => s.status === "COMPLETED")
      .filter(s => getAttendance(arch.attendance, s.weekIndex) === "PRESENT" || getAttendance(arch.attendance, s.weekIndex) === "LATE");

    const reviewRanges = computeReviewRanges(1, 1, arch.currentSurah, arch.currentAyah, presentSessions.length);

    let reviewIdx = 0;

    for (const session of groupSessions) {
      if (session.status === "SCHEDULED") continue;

      const attendance = getAttendance(arch.attendance, session.weekIndex) as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED_ABSENCE";
      const isPresent = attendance === "PRESENT" || attendance === "LATE";
      const grade = isPresent ? getGrade(arch.gradeBase, session.weekIndex) : undefined;
      const recitation = (grade ? getRecitationResult(grade) : "NOT_GRADED") as "EXCELLENT" | "GOOD" | "NEEDS_REVIEW" | "INCOMPLETE" | "NOT_GRADED";

      const sessionStudent = await prisma.sessionStudent.create({
        data: {
          sessionId: session.id,
          studentId: sp.id,
          attendance,
          recitationResult: recitation,
          numericGrade: grade,
          gradedAt: isPresent ? session.date : undefined,
        },
      });
      totalAttendance++;

      // Create memorization review for present students with available ranges
      if (isPresent && reviewIdx < reviewRanges.length) {
        const range = reviewRanges[reviewIdx];
        const nextRange = reviewIdx + 1 < reviewRanges.length ? reviewRanges[reviewIdx + 1] : { from: { surah: arch.currentSurah, ayah: arch.currentAyah }, to: { surah: arch.currentSurah, ayah: Math.min(arch.currentAyah + 10, QURAN_SURAHS[arch.currentSurah - 1].ayahCount) } };

        const review = await prisma.memorizationReview.create({
          data: {
            planId,
            moderatorId: modUser.id,
            sessionId: session.id,
            reviewDate: session.date,
            fromSurahNumber: range.from.surah,
            fromAyah: range.from.ayah,
            toSurahNumber: range.to.surah,
            toAyah: range.to.ayah,
            recitationResult: recitation,
            grade: grade!,
            nextFromSurahNumber: nextRange.from.surah,
            nextFromAyah: nextRange.from.ayah,
            nextToSurahNumber: nextRange.to.surah,
            nextToAyah: nextRange.to.ayah,
          },
        });

        // Tajweed scores
        for (const cat of tajweedCategories) {
          const baseScore = arch.gradeBase >= 85 ? 8 : arch.gradeBase >= 75 ? 6 : 4;
          const score = Math.max(1, Math.min(10, baseScore + ((session.weekIndex * 3 + cat.sortOrder) % 5) - 2));
          await prisma.reviewTajweedScore.create({
            data: { reviewId: review.id, categoryId: cat.id, score },
          });
        }

        // Mistakes for lower-performing students
        if (arch.gradeBase < 80 && session.weekIndex % 3 === 0) {
          const numMistakes = arch.gradeBase < 70 ? 2 : 1;
          for (let m = 0; m < numMistakes; m++) {
            await prisma.reviewMistake.create({
              data: {
                reviewId: review.id,
                category: mistakeCategories[m % mistakeCategories.length],
                notes: m === 0 ? "خطأ في المخارج" : "تردد في الآية",
              },
            });
          }
        }

        // ReviewRange on SessionStudent
        await prisma.reviewRange.create({
          data: {
            sessionStudentId: sessionStudent.id,
            fromSurahNumber: range.from.surah,
            fromAyahNumber: range.from.ayah,
            toSurahNumber: range.to.surah,
            toAyahNumber: range.to.ayah,
          },
        });

        totalReviews++;
        reviewIdx++;
      }
    }
  }

  console.log(`  Created ${totalAttendance} attendance records, ${totalReviews} memorization reviews`);

  // -----------------------------------------------------------------------
  // 6. Milestones
  // -----------------------------------------------------------------------
  let totalMilestones = 0;

  for (const arch of STUDENT_ARCHETYPES) {
    const sp = studentProfiles.get(arch.email)!;
    const planId = plans.get(arch.email)!;

    const completedSurahs = getCompletedSurahsBefore(arch.currentSurah, arch.currentAyah);
    for (let i = 0; i < completedSurahs.length; i++) {
      const surahNum = completedSurahs[i];
      const surah = QURAN_SURAHS[surahNum - 1];
      await prisma.studentMilestone.upsert({
        where: { studentId_type_value: { studentId: sp.id, type: "SURAH_COMPLETE", value: String(surahNum) } },
        update: {},
        create: {
          studentId: sp.id,
          planId,
          type: "SURAH_COMPLETE",
          value: String(surahNum),
          label: `أتم سورة ${surah.nameAr}`,
          achievedAt: weeksAgo(Math.max(1, 10 - i * 2)),
        },
      });
      totalMilestones++;
    }

    const completedJuz = getCompletedJuzBefore(arch.currentSurah, arch.currentAyah);
    for (let i = 0; i < completedJuz.length; i++) {
      const juzNum = completedJuz[i];
      await prisma.studentMilestone.upsert({
        where: { studentId_type_value: { studentId: sp.id, type: "JUZ_COMPLETE", value: String(juzNum) } },
        update: {},
        create: {
          studentId: sp.id,
          planId,
          type: "JUZ_COMPLETE",
          value: String(juzNum),
          label: `أتم الجزء ${juzNum}`,
          achievedAt: weeksAgo(Math.max(1, 8 - i * 2)),
        },
      });
      totalMilestones++;
    }
  }

  console.log(`  Created ${totalMilestones} milestones`);

  // -----------------------------------------------------------------------
  // 7. Badges
  // -----------------------------------------------------------------------
  let totalBadges = 0;

  for (const arch of STUDENT_ARCHETYPES) {
    const sp = studentProfiles.get(arch.email)!;

    for (const badgeKey of arch.badges) {
      const badge = await prisma.badgeDefinition.findUnique({ where: { key: badgeKey } });
      if (!badge) continue;

      await prisma.studentBadge.upsert({
        where: { studentId_badgeId: { studentId: sp.id, badgeId: badge.id } },
        update: {},
        create: {
          studentId: sp.id,
          badgeId: badge.id,
          awardedAt: weeksAgo(Math.floor(Math.random() * 8) + 1),
        },
      });
      totalBadges++;
    }

    if (arch.manualBadge) {
      const badge = await prisma.badgeDefinition.findUnique({ where: { key: arch.manualBadge.key } });
      if (badge) {
        await prisma.studentBadge.upsert({
          where: { studentId_badgeId: { studentId: sp.id, badgeId: badge.id } },
          update: {},
          create: {
            studentId: sp.id,
            badgeId: badge.id,
            awardedAt: weeksAgo(2),
            awardedById: adminUser.id,
            note: arch.manualBadge.note,
          },
        });
        totalBadges++;
      }
    }
  }

  console.log(`  Awarded ${totalBadges} badges`);

  // -----------------------------------------------------------------------
  // 8. Assignments
  // -----------------------------------------------------------------------
  const group1Students = STUDENT_ARCHETYPES.filter(a => a.group === 1);
  const group2Students = STUDENT_ARCHETYPES.filter(a => a.group === 2);
  const group3Students = STUDENT_ARCHETYPES.filter(a => a.group === 3);

  // Assignment 1: Quran Memorization for Group 1
  const assignment1 = await prisma.assignment.create({
    data: {
      title: "حفظ سورة الفاتحة",
      description: "حفظ سورة الفاتحة كاملة مع التجويد",
      type: "QURAN_MEMORIZATION",
      targetType: "GROUP",
      targetId: "demo-group-1",
      dueDate: daysAgo(14),
      createdById: (await prisma.user.findUniqueOrThrow({ where: { email: "moderator@yusr.academy" } })).id,
      quranAssignment: {
        create: { fromSurahNumber: 1, fromAyahNumber: 1, toSurahNumber: 1, toAyahNumber: 7 },
      },
    },
  });

  for (const s of group1Students) {
    const sp = studentProfiles.get(s.email)!;
    const isCompleted = s.attendance !== "mixed";
    await prisma.studentAssignment.create({
      data: {
        assignmentId: assignment1.id,
        studentId: sp.id,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
      },
    });
  }

  // Assignment 2: Quran Revision for Group 2
  const assignment2 = await prisma.assignment.create({
    data: {
      title: "مراجعة سورة البقرة (١-٥٠)",
      description: "مراجعة الآيات ١ إلى ٥٠ من سورة البقرة",
      type: "QURAN_REVISION",
      targetType: "GROUP",
      targetId: "demo-group-2",
      dueDate: daysFromNow(7),
      createdById: (await prisma.user.findUniqueOrThrow({ where: { email: "moderator2@yusr.academy" } })).id,
      quranAssignment: {
        create: { fromSurahNumber: 2, fromAyahNumber: 1, toSurahNumber: 2, toAyahNumber: 50 },
      },
    },
  });

  for (const s of group2Students) {
    const sp = studentProfiles.get(s.email)!;
    await prisma.studentAssignment.create({
      data: {
        assignmentId: assignment2.id,
        studentId: sp.id,
        status: s.attendance === "poor" ? "ASSIGNED" : "IN_PROGRESS",
      },
    });
  }

  // Assignment 3: Tajweed for Group 3
  const assignment3 = await prisma.assignment.create({
    data: {
      title: "أحكام النون الساكنة والتنوين",
      description: "دراسة ومراجعة أحكام النون الساكنة والتنوين مع أمثلة",
      type: "TAJWEED",
      targetType: "GROUP",
      targetId: "demo-group-3",
      dueDate: daysAgo(7),
      createdById: mod3.id,
      tajweedAssignment: {
        create: { topicTitle: "أحكام النون الساكنة والتنوين", topicDescription: "مراجعة الإظهار والإدغام والإقلاب والإخفاء" },
      },
    },
  });

  for (const s of group3Students) {
    const sp = studentProfiles.get(s.email)!;
    await prisma.studentAssignment.create({
      data: {
        assignmentId: assignment3.id,
        studentId: sp.id,
        status: s.gradeBase >= 85 ? "COMPLETED" : "IN_PROGRESS",
      },
    });
  }

  console.log("  Created 3 assignments with student assignments");

  // -----------------------------------------------------------------------
  // 9. Exams
  // -----------------------------------------------------------------------
  const examTemplate = await prisma.examTemplate.create({
    data: {
      title: "اختبار التجويد الأول",
      description: "اختبار شامل في أحكام التجويد الأساسية",
      passingScore: 30,
      totalPoints: 50,
      createdById: adminUser.id,
    },
  });

  const questions = [
    { type: "MULTIPLE_CHOICE" as const, text: "ما حكم النون الساكنة إذا جاء بعدها حرف الباء؟", points: 10, order: 1, options: JSON.stringify(["إظهار", "إدغام", "إقلاب", "إخفاء"]), correctAnswer: "إقلاب" },
    { type: "MULTIPLE_CHOICE" as const, text: "كم عدد مخارج الحروف الرئيسية؟", points: 10, order: 2, options: JSON.stringify(["ثلاثة", "أربعة", "خمسة", "ستة"]), correctAnswer: "خمسة" },
    { type: "TRUE_FALSE" as const, text: "المد الطبيعي يمد بمقدار حركتين", points: 10, order: 3, correctAnswer: "true" },
    { type: "SHORT_ANSWER" as const, text: "اذكر ثلاثة أمثلة على الإدغام بغنة", points: 10, order: 4 },
    { type: "RECITATION" as const, text: "اتلُ الآيات الأولى من سورة البقرة", points: 10, order: 5, fromSurahNumber: 2, fromAyah: 1, toSurahNumber: 2, toAyah: 5 },
  ];

  const createdQuestions: Array<{ id: string; type: string; correctAnswer: string | null; points: number }> = [];
  for (const q of questions) {
    const created = await prisma.examQuestion.create({
      data: {
        templateId: examTemplate.id,
        type: q.type,
        text: q.text,
        points: q.points,
        order: q.order,
        options: q.options ? JSON.parse(q.options) : undefined,
        correctAnswer: q.correctAnswer ?? undefined,
        fromSurahNumber: "fromSurahNumber" in q ? q.fromSurahNumber : undefined,
        fromAyah: "fromAyah" in q ? q.fromAyah : undefined,
        toSurahNumber: "toSurahNumber" in q ? q.toSurahNumber : undefined,
        toAyah: "toAyah" in q ? q.toAyah : undefined,
      },
    });
    createdQuestions.push({ id: created.id, type: q.type, correctAnswer: q.correctAnswer ?? null, points: q.points });
  }

  // Instance 1: Group 1, COMPLETED
  const group1Sessions = sessions.get("demo-group-1")!;
  const pastSession = group1Sessions.find(s => s.weekIndex === 3)!;

  const examInstance1 = await prisma.examInstance.create({
    data: {
      templateId: examTemplate.id,
      groupId: "demo-group-1",
      sessionId: pastSession.id,
      status: "COMPLETED",
      startDate: pastSession.date,
      endDate: pastSession.date,
      createdById: adminUser.id,
    },
  });

  for (const s of group1Students) {
    const sp = studentProfiles.get(s.email)!;
    const scoreMultiplier = s.gradeBase / 100;

    const submission = await prisma.examSubmission.create({
      data: {
        instanceId: examInstance1.id,
        studentId: sp.id,
        status: "GRADED",
        startedAt: pastSession.date,
        submittedAt: pastSession.date,
        gradedAt: pastSession.date,
        totalScore: Math.round(50 * scoreMultiplier),
        passed: scoreMultiplier >= 0.6,
      },
    });

    for (const q of createdQuestions) {
      let answer: string | undefined;
      let isCorrect: boolean | undefined;
      let score: number | undefined;

      if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        const correct = Math.random() < scoreMultiplier;
        isCorrect = correct;
        answer = correct ? q.correctAnswer! : "إظهار";
        score = correct ? q.points : 0;
      } else if (q.type === "SHORT_ANSWER") {
        answer = "الإدغام بغنة يكون مع حروف ينمو";
        score = Math.round(q.points * scoreMultiplier);
      } else {
        answer = "recitation_completed";
        score = Math.round(q.points * scoreMultiplier);
      }

      await prisma.examAnswer.create({
        data: {
          submissionId: submission.id,
          questionId: q.id,
          answer,
          isCorrect,
          score,
        },
      });
    }
  }

  // Instance 2: Group 2, PUBLISHED (active)
  const examInstance2 = await prisma.examInstance.create({
    data: {
      templateId: examTemplate.id,
      groupId: "demo-group-2",
      status: "PUBLISHED",
      startDate: daysAgo(3),
      endDate: daysFromNow(5),
      createdById: adminUser.id,
      timeLimitMinutes: 60,
    },
  });

  // Hamza submitted, Omar in progress, Tariq not started
  const hamzaProfile = studentProfiles.get("hamza@yusr.academy")!;
  const omarProfile = studentProfiles.get("student2@yusr.academy")!;
  const tariqProfile = studentProfiles.get("tariq@yusr.academy")!;

  await prisma.examSubmission.create({
    data: {
      instanceId: examInstance2.id,
      studentId: hamzaProfile.id,
      status: "SUBMITTED",
      startedAt: daysAgo(2),
      submittedAt: daysAgo(1),
    },
  });
  await prisma.examSubmission.create({
    data: {
      instanceId: examInstance2.id,
      studentId: omarProfile.id,
      status: "IN_PROGRESS",
      startedAt: daysAgo(1),
    },
  });
  await prisma.examSubmission.create({
    data: {
      instanceId: examInstance2.id,
      studentId: tariqProfile.id,
      status: "NOT_STARTED",
    },
  });

  console.log("  Created 1 exam template, 5 questions, 2 instances, submissions");

  // -----------------------------------------------------------------------
  // 10. Support Tickets
  // -----------------------------------------------------------------------
  const samiProfile = studentProfiles.get("sami@yusr.academy")!;
  const ibrahimProfile = studentProfiles.get("ibrahim@yusr.academy")!;

  // Ticket 1: OPEN from Sami
  await prisma.supportTicket.create({
    data: {
      subject: "مشكلة في الدخول للمنصة",
      body: "لا أستطيع الدخول للمنصة من الهاتف المحمول. تظهر رسالة خطأ عند تسجيل الدخول.",
      status: "OPEN",
      studentId: samiProfile.id,
    },
  });

  // Ticket 2: IN_PROGRESS from Ibrahim
  const ticket2 = await prisma.supportTicket.create({
    data: {
      subject: "استفسار عن جدول الحلقات",
      body: "هل يمكن تغيير موعد الحلقة الأسبوعية؟ الموعد الحالي يتعارض مع دراستي.",
      status: "IN_PROGRESS",
      studentId: ibrahimProfile.id,
      assignedToId: supportUser?.id,
    },
  });

  const ibrahimUser = studentUsers.get("ibrahim@yusr.academy")!;
  await prisma.ticketReply.create({
    data: {
      ticketId: ticket2.id,
      authorId: ibrahimUser.id,
      body: "أرجو النظر في إمكانية النقل لحلقة أخرى بموعد مختلف.",
      createdAt: daysAgo(5),
    },
  });
  if (supportUser) {
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket2.id,
        authorId: supportUser.id,
        body: "سنتواصل مع المشرف للبحث في الخيارات المتاحة. يرجى الانتظار.",
        createdAt: daysAgo(4),
      },
    });
  }

  // Ticket 3: RESOLVED from Tariq
  const ticket3 = await prisma.supportTicket.create({
    data: {
      subject: "مشكلة في التسجيل",
      body: "لم أتمكن من إتمام عملية التسجيل. الصفحة تتوقف عن العمل.",
      status: "RESOLVED",
      studentId: tariqProfile.id,
      assignedToId: supportUser?.id,
    },
  });

  const tariqUser = studentUsers.get("tariq@yusr.academy")!;
  await prisma.ticketReply.create({
    data: {
      ticketId: ticket3.id,
      authorId: tariqUser.id,
      body: "تم حل المشكلة بعد مسح ذاكرة المتصفح. شكراً لكم.",
      createdAt: daysAgo(20),
    },
  });

  console.log("  Created 3 support tickets with replies");

  // -----------------------------------------------------------------------
  // 11. Announcements
  // -----------------------------------------------------------------------
  await prisma.announcement.create({
    data: {
      title: "مرحباً بكم في أكاديمية يسر",
      body: "نرحب بجميع الطلاب في الفصل الدراسي الجديد. نسأل الله التوفيق والسداد للجميع.",
      priority: "normal",
      publishDate: weeksAgo(10),
      createdById: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: "موعد الاختبارات النصفية",
      body: "تبدأ الاختبارات النصفية الأسبوع القادم. يرجى الاستعداد جيداً.",
      priority: "high",
      targetType: "role",
      targetId: "student",
      publishDate: daysAgo(14),
      expiryDate: daysFromNow(14),
      createdById: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: "تغيير موعد حلقة مجموعة الإحسان",
      body: "تم تأجيل حلقة هذا الأسبوع ليوم الإثنين بدلاً من الأحد بسبب عطلة رسمية.",
      priority: "urgent",
      targetType: "group",
      targetId: "demo-group-2",
      publishDate: daysAgo(7),
      createdById: adminUser.id,
    },
  });

  console.log("  Created 3 announcements");

  // -----------------------------------------------------------------------
  // 12. Leave Requests
  // -----------------------------------------------------------------------
  const mod1User = await prisma.user.findUniqueOrThrow({ where: { email: "moderator@yusr.academy" } });

  const group1SessionList = sessions.get("demo-group-1")!;
  const session3WeeksAgo = group1SessionList.find(s => s.weekIndex === 3)!;
  const session5WeeksAgo = group1SessionList.find(s => s.weekIndex === 5)!;

  const group2SessionList = sessions.get("demo-group-2")!;
  const upcomingSession2 = group2SessionList.find(s => s.weekIndex === 0)!;

  // APPROVED leave for Ibrahim
  await prisma.leaveRequest.create({
    data: {
      studentId: ibrahimProfile.id,
      sessionId: session3WeeksAgo.id,
      reason: "مرض - لا أستطيع الحضور",
      status: "APPROVED",
      reviewedById: mod1User.id,
      reviewNote: "شفاك الله وعافاك",
    },
  });

  // PENDING leave for Tariq
  await prisma.leaveRequest.create({
    data: {
      studentId: tariqProfile.id,
      sessionId: upcomingSession2.id,
      reason: "سفر عائلي",
      status: "PENDING",
    },
  });

  // REJECTED leave for Ali
  const aliProfile = studentProfiles.get("ali@yusr.academy")!;
  await prisma.leaveRequest.create({
    data: {
      studentId: aliProfile.id,
      sessionId: session5WeeksAgo.id,
      reason: "ظرف شخصي",
      status: "REJECTED",
      reviewedById: mod1User.id,
      reviewNote: "يرجى الحضور والتعويض",
    },
  });

  console.log("  Created 3 leave requests");

  // -----------------------------------------------------------------------
  // 13. Notifications
  // -----------------------------------------------------------------------
  const notifications: Array<{ recipientId: string; type: string; title: string; body: string; read: boolean; createdAt: Date }> = [];

  // Badge notifications
  for (const arch of STUDENT_ARCHETYPES) {
    const user = studentUsers.get(arch.email)!;
    if (arch.badges.length > 0) {
      notifications.push({
        recipientId: user.id,
        type: "badge_earned",
        title: "حصلت على شارة جديدة!",
        body: `تهانينا! حصلت على شارة "${arch.badges[0]}"`,
        read: arch.badges.length > 1,
        createdAt: weeksAgo(3),
      });
    }
  }

  // Exam notification
  for (const s of group2Students) {
    const user = studentUsers.get(s.email)!;
    notifications.push({
      recipientId: user.id,
      type: "exam_published",
      title: "اختبار جديد متاح",
      body: "تم نشر اختبار التجويد الأول. الرجاء إكمال الاختبار قبل الموعد المحدد.",
      read: false,
      createdAt: daysAgo(3),
    });
  }

  // Announcement notification for all students
  for (const arch of STUDENT_ARCHETYPES) {
    const user = studentUsers.get(arch.email)!;
    notifications.push({
      recipientId: user.id,
      type: "announcement",
      title: "إعلان جديد",
      body: "موعد الاختبارات النصفية",
      read: Math.random() > 0.5,
      createdAt: daysAgo(14),
    });
  }

  // Attendance alert for moderator (Tariq's poor attendance)
  const mod2User = await prisma.user.findUniqueOrThrow({ where: { email: "moderator2@yusr.academy" } });
  notifications.push({
    recipientId: mod2User.id,
    type: "attendance_alert",
    title: "تنبيه غياب متكرر",
    body: "الطالب طارق تجاوز حد الغياب المتتالي (3 حلقات)",
    read: false,
    createdAt: weeksAgo(2),
  });

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log(`  Created ${notifications.length} notifications`);

  console.log("\n--- Demo data seeding complete! ---\n");
}
