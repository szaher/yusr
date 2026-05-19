import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { getStudentAssignmentDetail } from "@/server/services/assignment";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ConfirmListeningButton } from "./confirm-button";
import { MaterialEmbed } from "@/components/assignments/material-embed";

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("assignments");
  const sa = await getStudentAssignmentDetail(id);
  if (!sa) notFound();

  const a = sa.assignment;
  const confirmCount = sa.confirmations.length;
  const isComplete = sa.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{a.title}</h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {a.description && <p>{a.description}</p>}

          {a.quranAssignment && (
            <p>
              <strong>{t("quranRange")}:</strong>{" "}
              {a.quranAssignment.fromSurah.nameAr} ({a.quranAssignment.fromAyahNumber})
              {" → "}
              {a.quranAssignment.toSurah.nameAr} ({a.quranAssignment.toAyahNumber})
            </p>
          )}

          {a.tajweedAssignment && (
            <>
              <p><strong>{t("topicTitle")}:</strong> {a.tajweedAssignment.topicTitle}</p>
              {a.tajweedAssignment.topicDescription && <p>{a.tajweedAssignment.topicDescription}</p>}
            </>
          )}

          {a.homeworkAssignment && (
            <p><strong>{t("instructions")}:</strong> {a.homeworkAssignment.instructions}</p>
          )}

          {a.dueDate && (
            <p className="text-muted-foreground">
              {t("dueDate")}: {new Date(a.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
            </p>
          )}
        </CardContent>
      </Card>

      {a.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("materials")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {a.materials.map((m) => (
              <MaterialEmbed key={m.id} material={m} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("progress")}: {confirmCount}/{a.requiredRepetitions} {t("repetitions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConfirmListeningButton
            studentAssignmentId={sa.id}
            labels={{
              confirm: t("confirmListening"),
              disclaimer: t("confirmDisclaimer"),
            }}
            isComplete={isComplete}
          />

          {sa.confirmations.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {sa.confirmations.map((c, i) => (
                <p key={c.id}>
                  #{sa.confirmations.length - i} — {new Date(c.confirmedAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
