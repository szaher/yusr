import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSubmissionForGrading } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { gradeSubmissionAction } from "@/server/actions/exam";
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
import { QUESTION_TYPE_COLORS as TYPE_BADGES } from "@/lib/constants/status-colors";

const gradeSubmissionFn = gradeSubmissionAction as unknown as (formData: FormData) => void;

export default async function ModeratorGradingPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string; submissionId: string }>;
}) {
  const { locale, instanceId, submissionId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_GRADE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let submission;
  try {
    submission = await getSubmissionForGrading(submissionId);
  } catch {
    notFound();
  }

  const allQuestions = submission.instance.template.questions;
  const questionOrder = submission.questionOrder as string[] | null;
  const questions = questionOrder
    ? questionOrder
        .map((id) => allQuestions.find((q) => q.id === id))
        .filter((q): q is NonNullable<typeof q> => q !== undefined)
    : allQuestions;
  const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));
  const isGraded = submission.status === "GRADED";
  const customizations = (submission.instance.customizations ?? {}) as Record<string, { fromSurahNumber?: number; fromAyah?: number; toSurahNumber?: number; toAyah?: number }>;

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/moderator/exams/${instanceId}`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToInstance")}
      </Link>

      <h1 className="text-2xl font-bold">
        {t("grade")}: {submission.student.user.nameAr || submission.student.user.name}
      </h1>

      {submission.attemptNumber > 1 && (
        <p className="text-sm text-muted-foreground">
          {t("attempt")} {submission.attemptNumber}
        </p>
      )}

      <div className="text-sm text-muted-foreground">
        <p>{t("examTitle")}: {submission.instance.template.title}</p>
        {submission.submittedAt && (
          <p>{t("submitted")}: {new Date(submission.submittedAt).toLocaleString(locale)}</p>
        )}
        {isGraded && submission.totalScore !== null && (
          <p>
            {t("score")}: {Math.round(submission.totalScore)}%{" "}
            <Badge className={submission.passed ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
              {submission.passed ? t("passed") : t("failed")}
            </Badge>
          </p>
        )}
      </div>

      <form action={gradeSubmissionFn}>
        <input type="hidden" name="submissionId" value={submission.id} />

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const typeKey = q.type === "MULTIPLE_CHOICE" ? "multipleChoice" : q.type === "TRUE_FALSE" ? "trueFalse" : q.type === "SHORT_ANSWER" ? "shortAnswer" : "recitation";

            return (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Q{idx + 1}. {q.text}</CardTitle>
                    <Badge className={TYPE_BADGES[q.type] || ""}>{t(typeKey)}</Badge>
                    <span className="text-sm text-muted-foreground">({q.points} {t("points")})</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Show student's answer */}
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && (
                    <div>
                      <p className="text-sm">
                        {answer?.answer !== null && answer?.answer !== undefined
                          ? (q.options as { label: string; isCorrect: boolean }[])?.[parseInt(answer.answer, 10)]?.label ?? "—"
                          : "—"}
                      </p>
                      {answer?.isCorrect !== null && answer?.isCorrect !== undefined && (
                        <Badge className={answer.isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
                          {answer.isCorrect ? t("correct") : t("incorrect")}
                        </Badge>
                      )}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <div>
                      <p className="text-sm">{answer?.answer || "—"}</p>
                      {q.correctAnswer && (
                        <p className="text-xs text-muted-foreground">{t("correctAnswer")}: {q.correctAnswer}</p>
                      )}
                    </div>
                  )}

                  {q.type === "RECITATION" && (() => {
                    const custom = customizations[q.id];
                    const fromName = custom?.fromSurahNumber
                      ? `Surah ${custom.fromSurahNumber}`
                      : q.fromSurah ? (locale === "ar" ? q.fromSurah.nameAr : q.fromSurah.nameEn) : null;
                    const toName = custom?.toSurahNumber
                      ? `Surah ${custom.toSurahNumber}`
                      : q.toSurah ? (locale === "ar" ? q.toSurah.nameAr : q.toSurah.nameEn) : null;
                    const fromAyah = custom?.fromAyah ?? q.fromAyah;
                    const toAyah = custom?.toAyah ?? q.toAyah;

                    return (
                      <div className="text-sm text-muted-foreground">
                        {fromName && toName && (
                          <p>{fromName} ({fromAyah}) → {toName} ({toAyah})</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Grading fields */}
                  {!isGraded ? (
                    <div className="grid gap-3 sm:grid-cols-2 border-t pt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("score")} (0-{q.points})</Label>
                        <Input
                          name={`score_${q.id}`}
                          type="number"
                          min="0"
                          max={q.points}
                          defaultValue={answer?.score ?? ""}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("moderatorNotes")}</Label>
                        <Input
                          name={`notes_${q.id}`}
                          defaultValue={answer?.moderatorNotes ?? ""}
                          className="h-8"
                        />
                      </div>
                      {q.type === "RECITATION" && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("recitationResult")}</Label>
                            <select
                              name={`recitationResult_${q.id}`}
                              defaultValue={answer?.recitationResult ?? ""}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="">—</option>
                              <option value="EXCELLENT">Excellent</option>
                              <option value="GOOD">Good</option>
                              <option value="NEEDS_REVIEW">Needs Review</option>
                              <option value="INCOMPLETE">Incomplete</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("tajweedNotes")}</Label>
                            <Input name={`tajweedNotes_${q.id}`} defaultValue={answer?.tajweedNotes ?? ""} className="h-8" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("fluencyNotes")}</Label>
                            <Input name={`fluencyNotes_${q.id}`} defaultValue={answer?.fluencyNotes ?? ""} className="h-8" />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border-t pt-3 text-sm">
                      <p>{t("score")}: {answer?.score ?? 0}/{q.points}</p>
                      {answer?.moderatorNotes && <p>{t("moderatorNotes")}: {answer.moderatorNotes}</p>}
                      {answer?.recitationResult && <p>{t("recitationResult")}: {answer.recitationResult}</p>}
                      {answer?.tajweedNotes && <p>{t("tajweedNotes")}: {answer.tajweedNotes}</p>}
                      {answer?.fluencyNotes && <p>{t("fluencyNotes")}: {answer.fluencyNotes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isGraded && (
          <div className="mt-6">
            <Button type="submit" size="lg">{t("submitGrades")}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
