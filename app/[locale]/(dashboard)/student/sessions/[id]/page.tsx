import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionDetail } from "@/server/services/session";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ATTENDANCE_KEYS: Record<string, string> = {
  PRESENT: "attendancePresent",
  ABSENT: "attendanceAbsent",
  EXCUSED: "attendanceExcused",
  LATE: "attendanceLate",
};

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
  INCOMPLETE: "bg-orange-100 text-orange-800",
  NOT_RECITED: "bg-red-100 text-red-800",
  NOT_GRADED: "bg-gray-100 text-gray-800",
};

const RESULT_KEYS: Record<string, string> = {
  EXCELLENT: "resultExcellent",
  GOOD: "resultGood",
  NEEDS_REVIEW: "resultNeedsReview",
  INCOMPLETE: "resultIncomplete",
  NOT_RECITED: "resultNotRecited",
  NOT_GRADED: "resultNotGraded",
};

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const authSession = await requireApprovedUser();
  const t = await getTranslations("sessions");

  const sessionDetail = await getSessionDetail(id);
  if (!sessionDetail) notFound();

  const profile = await db.studentProfile.findUnique({
    where: { userId: authSession.user.id },
    select: { id: true },
  });

  const ownRecord = sessionDetail.students.find(
    (ss) => ss.studentId === profile?.id
  );

  if (!ownRecord) notFound();

  const isAudioFile = (url: string | null): boolean => {
    if (!url) return false;
    const audioExtensions = [".mp3", ".m4a", ".wav", ".ogg", ".webm"];
    return audioExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("sessionDetail")}</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{sessionDetail.group.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(sessionDetail.date).toLocaleDateString(locale)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("attendance")}:</span>
              <span className="text-sm">
                {t(ATTENDANCE_KEYS[ownRecord.attendance] as any)}
              </span>
            </div>

            {ownRecord.recitationResult && ownRecord.recitationResult !== "NOT_GRADED" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("recitationResult")}:</span>
                  <Badge className={RESULT_COLORS[ownRecord.recitationResult]}>
                    {t(RESULT_KEYS[ownRecord.recitationResult] as any)}
                  </Badge>
                </div>

                {ownRecord.numericGrade !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t("grade")}:</span>
                    <span className="text-lg font-bold">
                      {ownRecord.numericGrade}/100
                    </span>
                  </div>
                )}

                {ownRecord.mistakeCount !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t("mistakes")}:</span>
                    <span className="text-sm">{ownRecord.mistakeCount}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {(ownRecord.tajweedNotes || ownRecord.memorizationNotes || ownRecord.fluencyNotes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ownRecord.tajweedNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("tajweedNotes")}
                  </p>
                  <p className="text-sm">{ownRecord.tajweedNotes}</p>
                </div>
              )}
              {ownRecord.memorizationNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("memorizationNotes")}
                  </p>
                  <p className="text-sm">{ownRecord.memorizationNotes}</p>
                </div>
              )}
              {ownRecord.fluencyNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fluencyNotes")}
                  </p>
                  <p className="text-sm">{ownRecord.fluencyNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {ownRecord.comment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("comment")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm">{ownRecord.comment}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {ownRecord.voiceNoteUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("voiceNote")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isAudioFile(ownRecord.voiceNoteUrl) ? (
                <audio controls className="w-full">
                  <source src={ownRecord.voiceNoteUrl} />
                  {t("audioNotSupported")}
                </audio>
              ) : (
                <a
                  href={ownRecord.voiceNoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("openVoiceNote")}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {ownRecord.reviewRanges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("reviewRanges")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ownRecord.reviewRanges.map((rr, idx) => {
                  const fromSurah = locale === "ar" ? rr.fromSurah.nameAr : rr.fromSurah.nameEn;
                  const toSurah = locale === "ar" ? rr.toSurah.nameAr : rr.toSurah.nameEn;

                  return (
                    <Card key={idx} className="border">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">
                          {fromSurah}: {rr.fromAyahNumber} → {toSurah}: {rr.toAyahNumber}
                        </p>
                        {rr.note && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {rr.note}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
