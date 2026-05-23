import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getStudentAssignments } from "@/server/services/assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { AssignmentType, StudentAssignmentStatus } from "@/prisma/generated/prisma/enums";

export default async function StudentAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("assignments");

  const assignments = await getStudentAssignments(session.user.id);

  const typeLabels: Record<AssignmentType, string> = {
    QURAN_MEMORIZATION: t("typeQuranMemorization"),
    QURAN_REVISION: t("typeQuranRevision"),
    TAJWEED: t("typeTajweed"),
    HOMEWORK: t("typeHomework"),
  };

  const statusLabels: Record<StudentAssignmentStatus, string> = {
    ASSIGNED: t("assigned"),
    IN_PROGRESS: t("inProgress"),
    COMPLETED: t("completed"),
  };

  const statusColors: Record<StudentAssignmentStatus, string> = {
    ASSIGNED: "text-muted-foreground",
    IN_PROGRESS: "text-yellow-600",
    COMPLETED: "text-green-600",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {assignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("noAssignments")}
          description={t("noAssignmentsDesc")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((sa) => {
            const progress = `${sa._count.confirmations}/${sa.assignment.requiredRepetitions}`;
            const dueDate = sa.assignment.dueDate
              ? new Date(sa.assignment.dueDate).toLocaleDateString(locale)
              : null;

            return (
              <Link
                key={sa.id}
                href={`/${locale}/student/assignments/${sa.id}`}
                className="transition-colors hover:border-primary"
              >
                <Card className="h-full hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {sa.assignment.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {typeLabels[sa.assignment.type]}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("progress")}:
                        </span>
                        <span className="font-medium">{progress}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("status")}:
                        </span>
                        <span
                          className={`font-medium ${statusColors[sa.status]}`}
                        >
                          {statusLabels[sa.status]}
                        </span>
                      </div>
                      {dueDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("dueDate")}:
                          </span>
                          <span className="font-medium">{dueDate}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
