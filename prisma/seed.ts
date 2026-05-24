import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { QURAN_SURAHS } from "./data/quran-surahs";
import { JUZ_BOUNDARIES } from "./data/quran-juz-boundaries";
import quranAyahText from "./data/quran-ayah-text.json";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../lib/constants/permissions";
import { hashPassword } from "../server/auth/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seedRoles() {
  const roles = [
    { name: "admin", nameAr: "مدير النظام", description: "Full system access" },
    { name: "moderator", nameAr: "مشرف", description: "Manages assigned students and sessions" },
    { name: "student", nameAr: "طالب", description: "Enrolled student" },
    { name: "support", nameAr: "دعم", description: "Support ticket management" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("Seeded 4 roles");
}

async function seedPermissions() {
  const permissionKeys = Object.values(PERMISSIONS);

  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key.replace(/[._]/g, " ") },
    });
  }
  console.log(`Seeded ${permissionKeys.length} permissions`);

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const key of permKeys) {
      const permission = await prisma.permission.findUnique({ where: { key } });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  console.log("Assigned permissions to roles");
}

async function seedFeatureFlags() {
  const flags = [
    { key: "ai_recitation_review", enabled: false, description: "AI-powered recitation review" },
    { key: "analytics", enabled: true, description: "Dashboard analytics and charts" },
    { key: "announcements", enabled: true, description: "Announcement system" },
    { key: "attendance_management", enabled: true, description: "Attendance tracking, reports, and alerts" },
    { key: "audio_playback_tracking", enabled: false, description: "Track actual audio playback" },
    { key: "email_notifications", enabled: false, description: "Email notification delivery" },
    { key: "english_locale", enabled: true, description: "English language support" },
    { key: "exams", enabled: true, description: "Exam system" },
    { key: "gamification", enabled: true, description: "Badges, achievements, and group leaderboards" },
    { key: "leave_requests", enabled: true, description: "Student leave request system" },
    { key: "memorization_plans", enabled: true, description: "Individual student memorization plan tracking" },
    { key: "moderator_voice_notes", enabled: true, description: "Moderator voice note attachments" },
    { key: "progress_tracking", enabled: true, description: "Student progress tracking, milestones, and goals" },
    { key: "quran_explorer", enabled: true, description: "Native Quran text explorer (experimental)" },
    { key: "student_audio_upload", enabled: false, description: "Student audio upload for recitation" },
    { key: "support_tickets", enabled: true, description: "Support ticket system" },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { enabled: flag.enabled },
      create: flag,
    });
  }
  console.log(`Seeded ${flags.length} feature flags`);
}

async function seedAttendanceConfig() {
  const existing = await prisma.attendanceAlertConfig.findFirst({
    where: { groupId: null },
  });
  if (!existing) {
    await prisma.attendanceAlertConfig.create({
      data: {
        consecutiveAbsenceThreshold: 3,
        attendanceRateThreshold: 75,
        notifyModerator: true,
        notifyAdmin: true,
      },
    });
  }
  console.log("Seeded default attendance alert config");
}

async function seedTajweedCategories() {
  const categories = [
    { nameEn: "Makharij", nameAr: "المخارج", sortOrder: 1 },
    { nameEn: "Sifaat", nameAr: "صفات الحروف", sortOrder: 2 },
    { nameEn: "Noon & Meem Rules", nameAr: "أحكام النون والميم", sortOrder: 3 },
    { nameEn: "Madd", nameAr: "المدود", sortOrder: 4 },
    { nameEn: "Waqf", nameAr: "الوقف والابتداء", sortOrder: 5 },
    { nameEn: "General Fluency", nameAr: "الطلاقة العامة", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.tajweedCategory.upsert({
      where: { id: `core-${cat.sortOrder}` },
      update: { nameEn: cat.nameEn, nameAr: cat.nameAr, sortOrder: cat.sortOrder },
      create: {
        id: `core-${cat.sortOrder}`,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        isCore: true,
        sortOrder: cat.sortOrder,
        active: true,
      },
    });
  }
  console.log("Seeded 6 core tajweed categories");
}

async function seedSystemSettings() {
  const settings = [
    { key: "enrollment_state", value: "closed", description: "Enrollment state: open, closed, paused, waitlist_only" },
    { key: "quran_dataset_source", value: "tanzil.net", description: "Source of Quran metadata" },
    { key: "quran_dataset_version", value: "1.0", description: "Version of Quran dataset" },
    { key: "quran_dataset_import_date", value: new Date().toISOString(), description: "Date of last Quran data import" },
    { key: "default_riwayah", value: "hafs_an_asim", description: "Default Quran recitation style" },
    { key: "max_audio_file_size_mb", value: "50", description: "Maximum audio file size in MB" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`Seeded ${settings.length} system settings`);
}

async function seedAdminUser() {
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) throw new Error("Admin role not found");

  const existing = await prisma.user.findUnique({
    where: { email: "admin@yusr.academy" },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: "admin@yusr.academy",
        passwordHash: await hashPassword("admin123456"),
        name: "System Admin",
        nameAr: "مدير النظام",
        roleId: adminRole.id,
        accountStatus: "ACTIVE",
        locale: "ar",
      },
    });
    console.log("Seeded admin user: admin@yusr.academy / admin123456");
  } else {
    console.log("Admin user already exists");
  }
}

async function seedQuranData() {
  for (const surah of QURAN_SURAHS) {
    await prisma.quranSurah.upsert({
      where: { number: surah.number },
      update: {},
      create: surah,
    });
  }
  console.log(`Seeded ${QURAN_SURAHS.length} surahs`);

  for (let i = 1; i <= 30; i++) {
    await prisma.quranJuz.upsert({
      where: { number: i },
      update: {},
      create: { number: i, nameAr: `الجزء ${i}` },
    });
  }
  console.log("Seeded 30 juz");

  for (let i = 1; i <= 60; i++) {
    await prisma.quranHizb.upsert({
      where: { number: i },
      update: {},
      create: { number: i, juzNumber: Math.ceil(i / 2) },
    });
  }
  console.log("Seeded 60 hizb");

  for (let i = 1; i <= 240; i++) {
    await prisma.quranQuarter.upsert({
      where: { number: i },
      update: {},
      create: { number: i, hizbNumber: Math.ceil(i / 4) },
    });
  }
  console.log("Seeded 240 quarter-hizbs");

  // Sort boundaries for binary-search style juz lookup
  const sortedBoundaries = [...JUZ_BOUNDARIES].sort((a, b) => {
    if (a.surah !== b.surah) return a.surah - b.surah;
    return a.ayah - b.ayah;
  });

  function getJuzForAyah(surahNum: number, ayahNum: number): number {
    let juz = 1;
    for (const boundary of sortedBoundaries) {
      if (
        surahNum > boundary.surah ||
        (surahNum === boundary.surah && ayahNum >= boundary.ayah)
      ) {
        juz = boundary.juz;
      }
    }
    return juz;
  }

  const textMap = new Map(
    quranAyahText.map((a: { surahNumber: number; ayahNumber: number; textAr: string; textEn: string; page: number }) => [
      `${a.surahNumber}:${a.ayahNumber}`,
      { textAr: a.textAr, textEn: a.textEn, page: a.page },
    ])
  );

  let totalAyahs = 0;

  for (const surah of QURAN_SURAHS) {
    const ayahData = [];
    for (let a = 1; a <= surah.ayahCount; a++) {
      const juzNum = getJuzForAyah(surah.number, a);
      const hizbNum = juzNum * 2 - 1;
      const quarterNum = hizbNum * 4 - 3;
      const text = textMap.get(`${surah.number}:${a}`);

      ayahData.push({
        surahNumber: surah.number,
        ayahNumber: a,
        juzNumber: juzNum,
        hizbNumber: hizbNum,
        quarterNumber: quarterNum,
        pageNumber: text?.page ?? null,
        textAr: text?.textAr ?? null,
        textEn: text?.textEn ?? null,
      });
    }

    await prisma.quranAyah.createMany({
      data: ayahData,
      skipDuplicates: true,
    });

    totalAyahs += ayahData.length;
  }

  console.log(`Seeded ${totalAyahs} ayahs`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < quranAyahText.length; i += BATCH_SIZE) {
    const batch = quranAyahText.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((entry: { surahNumber: number; ayahNumber: number; textAr: string; textEn: string; page: number }) =>
        prisma.quranAyah.update({
          where: { surahNumber_ayahNumber: { surahNumber: entry.surahNumber, ayahNumber: entry.ayahNumber } },
          data: { textAr: entry.textAr, textEn: entry.textEn, pageNumber: entry.page },
        })
      )
    );
  }
  console.log(`Updated ${quranAyahText.length} ayahs with Arabic + English text`);
}

async function seedDemoData() {
  const demoPassword = await hashPassword("demo123456");

  const moderatorRole = await prisma.role.findUniqueOrThrow({ where: { name: "moderator" } });
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { name: "student" } });
  const supportRole = await prisma.role.findUniqueOrThrow({ where: { name: "support" } });

  // --- Moderators ---
  const mod1 = await prisma.user.upsert({
    where: { email: "moderator@yusr.academy" },
    update: {},
    create: {
      email: "moderator@yusr.academy",
      passwordHash: demoPassword,
      name: "Ahmed",
      nameAr: "أحمد المشرف",
      roleId: moderatorRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  await prisma.moderatorProfile.upsert({
    where: { userId: mod1.id },
    update: {},
    create: { userId: mod1.id },
  });

  const mod2 = await prisma.user.upsert({
    where: { email: "moderator2@yusr.academy" },
    update: {},
    create: {
      email: "moderator2@yusr.academy",
      passwordHash: demoPassword,
      name: "Khalid",
      nameAr: "خالد المشرف",
      roleId: moderatorRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  await prisma.moderatorProfile.upsert({
    where: { userId: mod2.id },
    update: {},
    create: { userId: mod2.id },
  });

  // --- Students (approved, with profiles) ---
  const student1 = await prisma.user.upsert({
    where: { email: "student@yusr.academy" },
    update: {},
    create: {
      email: "student@yusr.academy",
      passwordHash: demoPassword,
      name: "Youssef",
      nameAr: "يوسف الطالب",
      roleId: studentRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: {},
    create: {
      userId: student1.id,
      phone: "+966500000001",
      country: "السعودية",
      currentQuranLevel: "مبتدئ",
      preferredDay: "السبت",
    },
  });
  await prisma.enrollmentApplication.upsert({
    where: { userId: student1.id },
    update: {},
    create: {
      userId: student1.id,
      registrationStatus: "APPROVED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "student2@yusr.academy" },
    update: {},
    create: {
      email: "student2@yusr.academy",
      passwordHash: demoPassword,
      name: "Omar",
      nameAr: "عمر الطالب",
      roleId: studentRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: {},
    create: {
      userId: student2.id,
      phone: "+966500000002",
      country: "مصر",
      currentQuranLevel: "متوسط",
      preferredDay: "الأحد",
    },
  });
  await prisma.enrollmentApplication.upsert({
    where: { userId: student2.id },
    update: {},
    create: {
      userId: student2.id,
      registrationStatus: "APPROVED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: "student3@yusr.academy" },
    update: {},
    create: {
      email: "student3@yusr.academy",
      passwordHash: demoPassword,
      name: "Saad",
      nameAr: "سعد الطالب",
      roleId: studentRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });
  await prisma.studentProfile.upsert({
    where: { userId: student3.id },
    update: {},
    create: {
      userId: student3.id,
      phone: "+966500000003",
      country: "الأردن",
      currentQuranLevel: "مبتدئ",
    },
  });
  await prisma.enrollmentApplication.upsert({
    where: { userId: student3.id },
    update: {},
    create: {
      userId: student3.id,
      registrationStatus: "APPROVED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });

  // --- Pending student (no profile, pending review) ---
  const pendingStudent = await prisma.user.upsert({
    where: { email: "pending@yusr.academy" },
    update: {},
    create: {
      email: "pending@yusr.academy",
      passwordHash: demoPassword,
      name: "Muhammad",
      nameAr: "محمد المتقدم",
      roleId: studentRole.id,
      accountStatus: null,
      locale: "ar",
    },
  });
  await prisma.enrollmentApplication.upsert({
    where: { userId: pendingStudent.id },
    update: {},
    create: {
      userId: pendingStudent.id,
      registrationStatus: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });

  // --- Support user ---
  await prisma.user.upsert({
    where: { email: "support@yusr.academy" },
    update: {},
    create: {
      email: "support@yusr.academy",
      passwordHash: demoPassword,
      name: "Sara",
      nameAr: "سارة الدعم",
      roleId: supportRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
    },
  });

  console.log("Seeded 7 demo users");

  // --- Organization: Levels → Classes → Groups ---
  const level1 = await prisma.level.upsert({
    where: { id: "demo-level-1" },
    update: {},
    create: {
      id: "demo-level-1",
      nameAr: "المستوى التمهيدي",
      nameEn: "Introductory Level",
      description: "للطلاب المبتدئين في تعلم القرآن",
      sortOrder: 1,
    },
  });

  const level2 = await prisma.level.upsert({
    where: { id: "demo-level-2" },
    update: {},
    create: {
      id: "demo-level-2",
      nameAr: "المستوى الأول",
      nameEn: "Level One",
      description: "للطلاب الذين أتموا المستوى التمهيدي",
      sortOrder: 2,
    },
  });

  const class1 = await prisma.class.upsert({
    where: { id: "demo-class-1" },
    update: {},
    create: {
      id: "demo-class-1",
      name: "فصل الفاتحة",
      levelId: level1.id,
      defaultDay: "السبت",
      sessionTime: "18:00",
      capacity: 15,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { id: "demo-class-2" },
    update: {},
    create: {
      id: "demo-class-2",
      name: "فصل البقرة",
      levelId: level2.id,
      defaultDay: "الأحد",
      sessionTime: "19:00",
      capacity: 12,
    },
  });

  const mod1Profile = await prisma.moderatorProfile.findUniqueOrThrow({
    where: { userId: mod1.id },
  });
  const mod2Profile = await prisma.moderatorProfile.findUniqueOrThrow({
    where: { userId: mod2.id },
  });

  const group1 = await prisma.group.upsert({
    where: { id: "demo-group-1" },
    update: {},
    create: {
      id: "demo-group-1",
      name: "مجموعة النور",
      classId: class1.id,
      moderatorId: mod1Profile.id,
      weeklyDay: "السبت",
      weeklyTime: "18:00",
    },
  });

  const group2 = await prisma.group.upsert({
    where: { id: "demo-group-2" },
    update: {},
    create: {
      id: "demo-group-2",
      name: "مجموعة الإحسان",
      classId: class2.id,
      moderatorId: mod2Profile.id,
      weeklyDay: "الأحد",
      weeklyTime: "19:00",
    },
  });

  console.log("Seeded 2 levels, 2 classes, 2 groups");

  // --- Assign students to groups ---
  const sp1 = await prisma.studentProfile.findUniqueOrThrow({
    where: { userId: student1.id },
  });
  const sp2 = await prisma.studentProfile.findUniqueOrThrow({
    where: { userId: student2.id },
  });

  await prisma.groupStudent.upsert({
    where: { groupId_studentId: { groupId: group1.id, studentId: sp1.id } },
    update: {},
    create: { groupId: group1.id, studentId: sp1.id },
  });

  await prisma.groupStudent.upsert({
    where: { groupId_studentId: { groupId: group2.id, studentId: sp2.id } },
    update: {},
    create: { groupId: group2.id, studentId: sp2.id },
  });

  console.log("Assigned 2 students to groups");

  // --- Open enrollment for demo ---
  await prisma.systemSetting.upsert({
    where: { key: "enrollment_state" },
    update: { value: "open" },
    create: { key: "enrollment_state", value: "open" },
  });

  console.log("Set enrollment state to open");
}

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

async function main() {
  console.log("Starting seed...\n");

  await seedRoles();
  await seedPermissions();
  await seedFeatureFlags();
  await seedAttendanceConfig();
  await seedTajweedCategories();
  await seedSystemSettings();
  await seedAdminUser();
  await seedQuranData();
  await seedDemoData();
  await seedBadges();

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
