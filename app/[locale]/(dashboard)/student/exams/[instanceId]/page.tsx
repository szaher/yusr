import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getOrCreateSubmission } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { saveAnswersAction } from "@/server/actions/exam";
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
import { Badge } from "@/components/ui/badge";

const saveAnswersFn = saveAnswersAction as unknown as (formData: FormData) => void;

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string }>;
}) {
  const { locale, instanceId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) notFound();

  const instance = await db.examInstance.findUnique({
    where: { id: instanceId },
    include: {
      group: { include: { students: { where: { studentId: studentProfile.id } } } },
    },
  });
  if (!instance || instance.group.students.length === 0) notFound();
  if (!["PUBLISHED", "IN_PROGRESS", "COMPLETED"].includes(instance.status)) notFound();

  const submission = await getOrCreateSubmission(instanceId, studentProfile.id);
  const questions = submission.instance.template.questions;
  const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));
  const customizations = (instance.customizations ?? {}) as Record<string, { fromSurahNumber?: number; fromAyah?: number; toSurahNumber?: number; toAyah?: number }>;

  const now = new Date();
  const withinWindow = now >= instance.startDate && now <= instance.endDate;
  const canEdit = (submission.status === "NOT_STARTED" || submission.status === "IN_PROGRESS") && withinWindow && instance.status !== "COMPLETED";
  const isGraded = submission.status === "GRADED";
  const isSubmitted = submission.status === "SUBMITTED";

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/student/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      <h1 className="text-2xl font-bold">{submission.instance.template.title}</h1>

      {submission.instance.template.description && (
        <p className="text-muted-foreground">{submission.instance.template.description}</p>
      )}

      {isGraded && submission.totalScore !== null && (
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{t("score")}: {Math.round(submission.totalScore)}%</span>
          <Badge className={submission.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {submission.passed ? t("passed") : t("failed")}
          </Badge>
        </div>
      )}

      {isSubmitted && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t("awaitingGrading")}
          </CardContent>
        </Card>
      )}

      <form action={canEdit ? saveAnswersFn : undefined}>
        {canEdit && <input type="hidden" name="instanceId" value={instanceId} />}

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const opts = q.options as { label: string; isCorrect: boolean }[] | null;

            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Q{idx + 1}. {q.text}
                    {isGraded && answer?.score !== null && answer?.score !== undefined && (
                      <span className="ms-2 text-sm font-normal text-muted-foreground">
                        ({answer.score}/{q.points})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && opts && (
                    <div className="space-y-2">
                      {opts.map((opt, optIdx) => (
                        <label key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={String(optIdx)}
                            defaultChecked={answer?.answer === String(optIdx)}
                            disabled={!canEdit}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{opt.label}</span>
                          {isGraded && opt.isCorrect && (
                            <Badge className="bg-green-100 text-green-800 text-xs">{t("correct")}</Badge>
                          )}
                          {isGraded && answer?.answer === String(optIdx) && !opt.isCorrect && (
                            <Badge className="bg-red-100 text-red-800 text-xs">{t("incorrect")}</Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <textarea
                      name={`q_${q.id}`}
                      defaultValue={answer?.answer ?? ""}
                      disabled={!canEdit}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
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
                      <div className="rounded-lg bg-muted p-4 text-sm">
                        <p className="font-medium">{t("prepareRecitation")}:</p>
                        {fromName && toName && (
                          <p className="mt-1">
                            {fromName} ({fromAyah}) → {toName} ({toAyah})
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {isGraded && answer?.moderatorNotes && (
                    <p className="mt-2 text-sm text-muted-foreground">{t("moderatorNotes")}: {answer.moderatorNotes}</p>
                  )}
                  {isGraded && answer?.recitationResult && (
                    <p className="text-sm text-muted-foreground">{t("recitationResult")}: {answer.recitationResult}</p>
                  )}
                  {isGraded && answer?.tajweedNotes && (
                    <p className="text-sm text-muted-foreground">{t("tajweedNotes")}: {answer.tajweedNotes}</p>
                  )}
                  {isGraded && answer?.fluencyNotes && (
                    <p className="text-sm text-muted-foreground">{t("fluencyNotes")}: {answer.fluencyNotes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {canEdit && (
          <div className="mt-6 flex gap-3">
            <Button type="submit" variant="outline">{t("saveProgress")}</Button>
            <Button type="submit" name="submit" value="true">{t("submitExam")}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
