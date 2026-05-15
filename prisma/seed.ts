import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { QURAN_SURAHS } from "./data/quran-surahs";
import { JUZ_BOUNDARIES } from "./data/quran-juz-boundaries";
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
    { key: "student_audio_upload", enabled: false, description: "Student audio upload for recitation" },
    { key: "moderator_voice_notes", enabled: true, description: "Moderator voice note attachments" },
    { key: "exams", enabled: false, description: "Exam system" },
    { key: "leave_requests", enabled: true, description: "Student leave request system" },
    { key: "announcements", enabled: true, description: "Announcement system" },
    { key: "english_locale", enabled: true, description: "English language support" },
    { key: "email_notifications", enabled: false, description: "Email notification delivery" },
    { key: "support_tickets", enabled: false, description: "Support ticket system" },
    { key: "audio_playback_tracking", enabled: false, description: "Track actual audio playback" },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
  console.log(`Seeded ${flags.length} feature flags`);
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

  let totalAyahs = 0;

  for (const surah of QURAN_SURAHS) {
    const ayahData = [];
    for (let a = 1; a <= surah.ayahCount; a++) {
      const juzNum = getJuzForAyah(surah.number, a);
      const hizbNum = juzNum * 2 - 1;
      const quarterNum = hizbNum * 4 - 3;

      ayahData.push({
        surahNumber: surah.number,
        ayahNumber: a,
        juzNumber: juzNum,
        hizbNumber: hizbNum,
        quarterNumber: quarterNum,
      });
    }

    await prisma.quranAyah.createMany({
      data: ayahData,
      skipDuplicates: true,
    });

    totalAyahs += ayahData.length;
  }

  console.log(`Seeded ${totalAyahs} ayahs`);
}

async function main() {
  console.log("Starting seed...\n");

  await seedRoles();
  await seedPermissions();
  await seedFeatureFlags();
  await seedSystemSettings();
  await seedAdminUser();
  await seedQuranData();

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
