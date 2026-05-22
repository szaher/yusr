import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTemplate } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  updateTemplateAction,
  addQuestionAction,
  deleteQuestionAction,
  assignToGroupsAction,
} from "@/server/actions/exam";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const updateTemplateFn = updateTemplateAction as unknown as (formData: FormData) => void;
const addQuestionFn = addQuestionAction as unknown as (formData: FormData) => void;
const deleteQuestionFn = deleteQuestionAction as unknown as (formData: FormData) => void;
const assignToGroupsFn = assignToGroupsAction as unknown as (formData: FormData) => void;

const TYPE_BADGES: Record<string, string> = {
  MULTIPLE_CHOICE: "bg-blue-100 text-blue-800",
  TRUE_FALSE: "bg-purple-100 text-purple-800",
  SHORT_ANSWER: "bg-amber-100 text-amber-800",
  RECITATION: "bg-green-100 text-green-800",
};

export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; examId: string }>;
}) {
  const { locale, examId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_CREATE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let template;
  try {
    template = await getTemplate(examId);
  } catch {
    notFound();
  }

  const [groups, surahs] = await Promise.all([
    db.group.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.quranSurah.findMany({ select: { number: true, nameAr: true, nameEn: true, ayahCount: true }, orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/admin/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      {/* Template Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t("updateTemplate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTemplateFn} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="space-y-2">
              <Label>{t("examTitle")}</Label>
              <Input name="title" defaultValue={template.title} required />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Input name="description" defaultValue={template.description || ""} />
            </div>
            <div className="space-y-2">
              <Label>{t("passingScore")}</Label>
              <Input name="passingScore" type="number" defaultValue={template.passingScore} min="1" max="100" required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("questionCount")}: {template.questions.length} ({t("totalPoints")}: {template.totalPoints})</CardTitle>
        </CardHeader>
        <CardContent>
          {template.questions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("questionType")}</TableHead>
                  <TableHead>{t("questionText")}</TableHead>
                  <TableHead>{t("points")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.order}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_BADGES[q.type] || ""}>
                        {t(q.type === "MULTIPLE_CHOICE" ? "multipleChoice" : q.type === "TRUE_FALSE" ? "trueFalse" : q.type === "SHORT_ANSWER" ? "shortAnswer" : "recitation")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{q.text}</TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell>
                      <form action={deleteQuestionFn}>
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="templateId" value={template.id} />
                        <Button type="submit" variant="destructive" size="sm">{t("deleteQuestion")}</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noExams")}</p>
          )}
        </CardContent>
      </Card>

      {/* Add Question Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("addQuestion")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addQuestionFn} className="grid gap-4">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("questionType")}</Label>
                <select
                  name="type"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MULTIPLE_CHOICE">{t("multipleChoice")}</option>
                  <option value="TRUE_FALSE">{t("trueFalse")}</option>
                  <option value="SHORT_ANSWER">{t("shortAnswer")}</option>
                  <option value="RECITATION">{t("recitation")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("questionText")}</Label>
                <Input name="text" required />
              </div>
              <div className="space-y-2">
                <Label>{t("points")}</Label>
                <Input name="points" type="number" defaultValue="10" min="1" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("options")} (JSON — for MC: [{`{"label":"A","isCorrect":true},{"label":"B","isCorrect":false}`}])</Label>
              <Input name="options" placeholder='[{"label":"...","isCorrect":true}]' />
            </div>

            <div className="space-y-2">
              <Label>{t("correctAnswer")} (SA: expected text, T/F: &quot;true&quot; or &quot;false&quot;)</Label>
              <Input name="correctAnswer" />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("fromSurah")}</Label>
                <select name="fromSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("fromAyah")}</Label>
                <Input name="fromAyah" type="number" min="1" />
              </div>
              <div className="space-y-2">
                <Label>{t("toSurah")}</Label>
                <select name="toSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("toAyah")}</Label>
                <Input name="toAyah" type="number" min="1" />
              </div>
            </div>

            <div>
              <Button type="submit">{t("addQuestion")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Assign to Groups */}
      <Card>
        <CardHeader>
          <CardTitle>{t("assignToGroups")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignToGroupsFn} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="space-y-2">
              <Label>{t("selectGroups")}</Label>
              <select
                name="groupIds"
                multiple
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple. The selected values are sent as JSON array.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("startDate")}</Label>
                <Input name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>{t("endDate")}</Label>
                <Input name="endDate" type="date" required />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("assign")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
