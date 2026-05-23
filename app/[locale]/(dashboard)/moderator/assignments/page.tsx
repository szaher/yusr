import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorAssignments } from "@/server/services/assignment";
import { getModeratorGroups } from "@/server/services/organization";
import { createAssignmentAction } from "@/server/actions/assignment";
import { db } from "@/server/db/client";
import Link from "next/link";

const createAssignment = createAssignmentAction as unknown as (formData: FormData) => void;

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BADGE_COLORS } from "@/lib/constants/status-colors";

export default async function ModeratorAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("assignments");
  const [assignments, groups, surahs] = await Promise.all([
    getModeratorAssignments(session.user.id),
    getModeratorGroups(session.user.id),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createAssignment")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAssignment} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("titleField")}</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t("type")}</Label>
              <select
                id="type"
                name="type"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                <option value="QURAN_MEMORIZATION">{t("types.QURAN_MEMORIZATION")}</option>
                <option value="QURAN_REVISION">{t("types.QURAN_REVISION")}</option>
                <option value="TAJWEED">{t("types.TAJWEED")}</option>
                <option value="HOMEWORK">{t("types.HOMEWORK")}</option>
              </select>
            </div>

            <input type="hidden" name="targetType" value="GROUP" />

            <div className="space-y-2">
              <Label htmlFor="targetId">{t("targetGroup")}</Label>
              <select
                id="targetId"
                name="targetId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.class?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDate">{t("dueDate")}</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredRepetitions">{t("requiredRepetitions")}</Label>
                <Input
                  id="requiredRepetitions"
                  name="requiredRepetitions"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">{t("quranFields")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromSurahNumber">{t("fromSurah")}</Label>
                  <select
                    id="fromSurahNumber"
                    name="fromSurahNumber"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">--</option>
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromAyahNumber">{t("fromAyah")}</Label>
                  <Input id="fromAyahNumber" name="fromAyahNumber" type="number" min="1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toSurahNumber">{t("toSurah")}</Label>
                  <select
                    id="toSurahNumber"
                    name="toSurahNumber"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">--</option>
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toAyahNumber">{t("toAyah")}</Label>
                  <Input id="toAyahNumber" name="toAyahNumber" type="number" min="1" />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">{t("tajweedFields")}</h3>
              <div className="space-y-2">
                <Label htmlFor="topicTitle">{t("topicTitle")}</Label>
                <Input id="topicTitle" name="topicTitle" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialUrl">{t("materialUrl")}</Label>
                <Input id="materialUrl" name="materialUrl" type="url" />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">{t("homeworkFields")}</h3>
              <div className="space-y-2">
                <Label htmlFor="instructions">{t("instructions")}</Label>
                <textarea
                  id="instructions"
                  name="instructions"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">{t("materials")}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="materials.0.type">{t("materialType")}</Label>
                  <select
                    id="materials.0.type"
                    name="materials.0.type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">--</option>
                    <option value="AUDIO_URL">{t("materialTypes.AUDIO_URL")}</option>
                    <option value="VIDEO_URL">{t("materialTypes.VIDEO_URL")}</option>
                    <option value="IFRAME_EMBED">{t("materialTypes.IFRAME_EMBED")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materials.0.url">{t("materialUrlField")}</Label>
                  <Input id="materials.0.url" name="materials.0.url" type="url" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="materials.0.title">{t("materialTitle")}</Label>
                  <Input id="materials.0.title" name="materials.0.title" />
                </div>
              </div>
            </div>

            <div>
              <Button type="submit">{t("createAssignment")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("noAssignments")}
          description={t("noAssignmentsDesc")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("titleField")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>{t("progress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/${locale}/moderator/assignments/${a.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_COLORS.blue}`}>
                    {t(`types.${a.type}`)}
                  </span>
                </TableCell>
                <TableCell>
                  {a.dueDate ? new Date(a.dueDate).toLocaleDateString(locale) : "—"}
                </TableCell>
                <TableCell>
                  {a.studentAssignments.length} / {a._count.studentAssignments}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
