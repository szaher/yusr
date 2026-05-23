import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { QuranExplorer } from "@/components/quran/quran-explorer";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

async function getStudentMemorizationPosition(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      groupStudents: {
        include: {
          group: { select: { id: true, memorizationPlansEnabled: true } },
        },
      },
    },
  });
  if (!profile) return null;

  const enabledGroup = profile.groupStudents.find(
    (gs) => gs.group.memorizationPlansEnabled
  );
  if (!enabledGroup) return null;

  const plan = await db.studentMemorizationPlan.findUnique({
    where: {
      studentId_groupId: {
        studentId: profile.id,
        groupId: enabledGroup.group.id,
      },
    },
    select: {
      id: true,
      currentSurahId: true,
      currentAyahNumber: true,
    },
  });
  if (!plan) return null;

  const lastReview = await db.memorizationReview.findFirst({
    where: { planId: plan.id },
    orderBy: { reviewDate: "desc" },
    select: {
      nextFromSurahNumber: true,
      nextFromAyah: true,
    },
  });

  if (lastReview) {
    return { surah: lastReview.nextFromSurahNumber, ayah: lastReview.nextFromAyah };
  }

  return { surah: plan.currentSurahId, ayah: plan.currentAyahNumber };
}

export default async function QuranExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    surah?: string;
    ayah?: string;
    reciter?: string;
    mushaf?: string;
    trans?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("quranExplorer");
  const sp = await searchParams;
  const explorerEnabled = await isFeatureEnabled("quran_explorer");

  const hasExplicitPosition = !!sp.surah;
  let defaultSurah: number | undefined;
  let defaultAyah: number | undefined;

  if (!hasExplicitPosition && session.user.role === "student") {
    const pos = await getStudentMemorizationPosition(session.user.id);
    if (pos) {
      defaultSurah = pos.surah;
      defaultAyah = pos.ayah;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {explorerEnabled && (
          <Link
            href={`/${locale}/quran/explorer`}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {t("openTextExplorer")}
            <Badge variant="outline" className="text-xs">{t("experimentalBadge")}</Badge>
          </Link>
        )}
      </div>
      <QuranExplorer
        initialSurah={sp.surah ? parseInt(sp.surah, 10) : defaultSurah}
        initialAyah={sp.ayah ? parseInt(sp.ayah, 10) : defaultAyah}
        initialReciter={sp.reciter}
        initialMushaf={sp.mushaf}
        initialTranslation={sp.trans}
      />
    </div>
  );
}
