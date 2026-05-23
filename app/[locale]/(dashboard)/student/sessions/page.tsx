import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStudentSessions } from "@/server/services/session";
import { getStudentEligibility } from "@/server/services/assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Calendar, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { STATUS_COLORS, RESULT_COLORS } from "@/lib/constants/status-colors";

const STATUS_KEYS: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  OPEN: "statusOpen",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

const RESULT_KEYS: Record<string, string> = {
  EXCELLENT: "resultExcellent",
  GOOD: "resultGood",
  NEEDS_REVIEW: "resultNeedsReview",
  INCOMPLETE: "resultIncomplete",
  NOT_RECITED: "resultNotRecited",
  NOT_GRADED: "resultNotGraded",
};

export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireApprovedUser();
  const t = await getTranslations("sessions");

  const [sessionStudents, eligibility] = await Promise.all([
    getStudentSessions(session.user.id),
    getStudentEligibility(session.user.id),
  ]);

  const upcomingSessions = sessionStudents.filter(
    (ss) => ss.session.status !== "COMPLETED" && ss.session.status !== "CANCELLED"
  );

  const pastSessions = sessionStudents.filter(
    (ss) => ss.session.status === "COMPLETED" || ss.session.status === "CANCELLED"
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {!eligibility.eligible && (
        <Card className="mb-6 border-yellow-300 bg-yellow-500/10 dark:border-yellow-800 dark:bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-yellow-800 dark:text-yellow-300">
              {t("eligibilityWarning", {
                completed: eligibility.completed,
                total: eligibility.total,
              })}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-xl font-semibold">{t("upcomingSessions")}</h2>
          {upcomingSessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={t("noUpcomingSessions")}
              description={t("noSessionsDesc")}
            />
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((ss) => {
                const canJoin =
                  eligibility.eligible &&
                  (ss.session.status === "OPEN" || ss.session.status === "IN_PROGRESS") &&
                  ss.session.meetingLink;

                return (
                  <Card key={ss.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {ss.session.group.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(ss.session.date).toLocaleDateString(locale)}
                            {ss.session.startTime && ` • ${ss.session.startTime}`}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[ss.session.status]}>
                          {t(STATUS_KEYS[ss.session.status] as any)}
                        </Badge>
                      </div>
                    </CardHeader>
                    {canJoin && (
                      <CardContent>
                        <Link
                          href={ss.session.meetingLink!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {t("joinSession")}
                        </Link>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">{t("pastSessions")}</h2>
          {pastSessions.length === 0 ? (
            <EmptyState
              icon={History}
              title={t("noPastSessions")}
            />
          ) : (
            <div className="grid gap-4">
              {pastSessions.map((ss) => (
                <Link
                  key={ss.id}
                  href={`/${locale}/student/sessions/${ss.session.id}`}
                  className="block transition-colors hover:border-primary"
                >
                  <Card className="hover:border-primary transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {ss.session.group.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(ss.session.date).toLocaleDateString(locale)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {ss.recitationResult && ss.recitationResult !== "NOT_GRADED" && (
                            <Badge className={RESULT_COLORS[ss.recitationResult]}>
                              {t(RESULT_KEYS[ss.recitationResult] as any)}
                            </Badge>
                          )}
                          {ss.numericGrade !== null && (
                            <Badge variant="outline">
                              {ss.numericGrade}/100
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
