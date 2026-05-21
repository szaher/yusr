import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getSessionDetail } from "@/server/services/session";
import { getStudentEligibility } from "@/server/services/assignment";
import {
  updateSessionStatusAction,
  updateMeetingLinkAction,
  gradeStudentAction,
} from "@/server/actions/session";
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

const updateSessionStatus = updateSessionStatusAction as unknown as (formData: FormData) => void;
const updateMeetingLink = updateMeetingLinkAction as unknown as (formData: FormData) => void;
const gradeStudent = gradeStudentAction as unknown as (formData: FormData) => void;

export default async function ModeratorSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const [sessionDetail, surahs] = await Promise.all([
    getSessionDetail(id),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
  ]);

  if (!sessionDetail) {
    notFound();
  }

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (sessionDetail.moderatorId !== profile?.id) {
    notFound();
  }

  const t = await getTranslations("sessions");

  // Fetch eligibility for each student
  const eligibilityMap = new Map<string, { total: number; completed: number; eligible: boolean }>();
  for (const ss of sessionDetail.students) {
    const eligibility = await getStudentEligibility(ss.student.userId);
    eligibilityMap.set(ss.student.id, eligibility);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("sessionDetail")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessionInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("date")}</Label>
              <p className="text-sm">
                {new Date(sessionDetail.date).toLocaleDateString(locale)}
              </p>
            </div>
            <div>
              <Label>{t("startTime")}</Label>
              <p className="text-sm">{sessionDetail.startTime || "—"}</p>
            </div>
            <div>
              <Label>{t("endTime")}</Label>
              <p className="text-sm">{sessionDetail.endTime || "—"}</p>
            </div>
            <div>
              <Label>{t("meetingLink")}</Label>
              {sessionDetail.meetingLink ? (
                <a
                  href={sessionDetail.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("joinMeeting")}
                </a>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
          </div>
          {sessionDetail.notes && (
            <div>
              <Label>{t("notes")}</Label>
              <p className="text-sm whitespace-pre-wrap">{sessionDetail.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessionActions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {sessionDetail.status === "SCHEDULED" && (
              <>
                <form action={updateSessionStatus}>
                  <input type="hidden" name="sessionId" value={sessionDetail.id} />
                  <input type="hidden" name="status" value="OPEN" />
                  <Button type="submit">{t("openSession")}</Button>
                </form>
                <form action={updateSessionStatus}>
                  <input type="hidden" name="sessionId" value={sessionDetail.id} />
                  <input type="hidden" name="status" value="CANCELLED" />
                  <Button type="submit" variant="destructive">
                    {t("cancelSession")}
                  </Button>
                </form>
              </>
            )}
            {sessionDetail.status === "OPEN" && (
              <>
                <form action={updateSessionStatus}>
                  <input type="hidden" name="sessionId" value={sessionDetail.id} />
                  <input type="hidden" name="status" value="IN_PROGRESS" />
                  <Button type="submit">{t("startSession")}</Button>
                </form>
                <form action={updateSessionStatus}>
                  <input type="hidden" name="sessionId" value={sessionDetail.id} />
                  <input type="hidden" name="status" value="CANCELLED" />
                  <Button type="submit" variant="destructive">
                    {t("cancelSession")}
                  </Button>
                </form>
              </>
            )}
            {sessionDetail.status === "IN_PROGRESS" && (
              <form action={updateSessionStatus}>
                <input type="hidden" name="sessionId" value={sessionDetail.id} />
                <input type="hidden" name="status" value="COMPLETED" />
                <Button type="submit">{t("completeSession")}</Button>
              </form>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">{t("updateMeetingLink")}</h3>
            <form action={updateMeetingLink} className="flex gap-2">
              <input type="hidden" name="sessionId" value={sessionDetail.id} />
              <Input
                name="meetingLink"
                type="url"
                placeholder={t("meetingLinkPlaceholder")}
                defaultValue={sessionDetail.meetingLink || ""}
                className="flex-1"
              />
              <Button type="submit">{t("save")}</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t("studentProgress")}</h2>
        {sessionDetail.students.map((ss) => {
          const studentName = ss.student.user.nameAr || ss.student.user.name || "—";
          const eligibility = eligibilityMap.get(ss.student.id) || {
            total: 0,
            completed: 0,
            eligible: true,
          };

          return (
            <Card key={ss.id} className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{studentName}</span>
                  <Badge
                    className={
                      eligibility.eligible
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {eligibility.completed}/{eligibility.total} {t("assignments")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={gradeStudent} className="grid gap-4">
                  <input type="hidden" name="sessionStudentId" value={ss.id} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`attendance-${ss.id}`}>{t("attendance")}</Label>
                      <select
                        id={`attendance-${ss.id}`}
                        name="attendance"
                        defaultValue={ss.attendance || "PENDING"}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="PENDING">{t("attendancePending")}</option>
                        <option value="PRESENT">{t("attendancePresent")}</option>
                        <option value="ABSENT">{t("attendanceAbsent")}</option>
                        <option value="EXCUSED_ABSENCE">{t("attendanceExcused")}</option>
                        <option value="LATE">{t("attendanceLate")}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`recitationResult-${ss.id}`}>
                        {t("recitationResult")}
                      </Label>
                      <select
                        id={`recitationResult-${ss.id}`}
                        name="recitationResult"
                        defaultValue={ss.recitationResult || "NOT_GRADED"}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="NOT_GRADED">{t("resultNotGraded")}</option>
                        <option value="EXCELLENT">{t("resultExcellent")}</option>
                        <option value="GOOD">{t("resultGood")}</option>
                        <option value="NEEDS_REVIEW">{t("resultNeedsReview")}</option>
                        <option value="INCOMPLETE">{t("resultIncomplete")}</option>
                        <option value="NOT_RECITED">{t("resultNotRecited")}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`numericGrade-${ss.id}`}>{t("numericGrade")}</Label>
                      <Input
                        id={`numericGrade-${ss.id}`}
                        name="numericGrade"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={ss.numericGrade ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`mistakeCount-${ss.id}`}>{t("mistakeCount")}</Label>
                      <Input
                        id={`mistakeCount-${ss.id}`}
                        name="mistakeCount"
                        type="number"
                        min="0"
                        defaultValue={ss.mistakeCount ?? ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`voiceNoteUrl-${ss.id}`}>{t("voiceNoteUrl")}</Label>
                    <Input
                      id={`voiceNoteUrl-${ss.id}`}
                      name="voiceNoteUrl"
                      type="url"
                      defaultValue={ss.voiceNoteUrl || ""}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`tajweedNotes-${ss.id}`}>{t("tajweedNotes")}</Label>
                      <Input
                        id={`tajweedNotes-${ss.id}`}
                        name="tajweedNotes"
                        defaultValue={ss.tajweedNotes || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`memorizationNotes-${ss.id}`}>
                        {t("memorizationNotes")}
                      </Label>
                      <Input
                        id={`memorizationNotes-${ss.id}`}
                        name="memorizationNotes"
                        defaultValue={ss.memorizationNotes || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`fluencyNotes-${ss.id}`}>{t("fluencyNotes")}</Label>
                      <Input
                        id={`fluencyNotes-${ss.id}`}
                        name="fluencyNotes"
                        defaultValue={ss.fluencyNotes || ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`comment-${ss.id}`}>{t("comment")}</Label>
                    <textarea
                      id={`comment-${ss.id}`}
                      name="comment"
                      rows={3}
                      defaultValue={ss.comment || ""}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <Button type="submit">{t("saveGrade")}</Button>
                  </div>
                </form>
                <div className="border-t pt-4 mt-4">
                  <Link
                    href={`/${locale}/moderator/memorization/${ss.student.userId}/review?sessionId=${sessionDetail.id}`}
                  >
                    <Button variant="outline" className="w-full">
                      {t("openMemorizationReview")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sessionDetail.students.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noStudents")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
