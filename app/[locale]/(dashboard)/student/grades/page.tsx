import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStudentGrades } from "@/server/services/session";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { RESULT_COLORS } from "@/lib/constants/status-colors";

const RESULT_KEYS: Record<string, string> = {
  EXCELLENT: "resultExcellent",
  GOOD: "resultGood",
  NEEDS_REVIEW: "resultNeedsReview",
  INCOMPLETE: "resultIncomplete",
  NOT_RECITED: "resultNotRecited",
  NOT_GRADED: "resultNotGraded",
};

export default async function StudentGradesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireApprovedUser();
  const t = await getTranslations("grades");
  const ts = await getTranslations("sessions");

  const grades = await getStudentGrades(session.user.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {grades.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t("noGrades")}
          description={t("noGradesDesc")}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sessionDate")}</TableHead>
                    <TableHead>{t("group")}</TableHead>
                    <TableHead>{t("result")}</TableHead>
                    <TableHead>{t("grade")}</TableHead>
                    <TableHead>{t("comment")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        {new Date(g.session.date).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>{g.session.group.name}</TableCell>
                      <TableCell>
                        {g.recitationResult && g.recitationResult !== "NOT_GRADED" && (
                          <Badge className={RESULT_COLORS[g.recitationResult]}>
                            {ts(RESULT_KEYS[g.recitationResult] as any)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {g.numericGrade !== null ? `${g.numericGrade}/100` : "—"}
                      </TableCell>
                      <TableCell>
                        {g.comment ? (
                          <span className="line-clamp-1 text-sm">
                            {g.comment.length > 50
                              ? `${g.comment.slice(0, 50)}...`
                              : g.comment}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/${locale}/student/sessions/${g.session.id}`}
                          className="text-primary hover:underline"
                        >
                          {t("viewDetail")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile card stack */}
          <div className="space-y-3 md:hidden">
            {grades.map((g) => (
              <Link key={g.id} href={`/${locale}/student/sessions/${g.session.id}`}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{g.session.group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(g.session.date).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {g.recitationResult && g.recitationResult !== "NOT_GRADED" && (
                          <Badge className={RESULT_COLORS[g.recitationResult]}>
                            {ts(RESULT_KEYS[g.recitationResult] as any)}
                          </Badge>
                        )}
                        {g.numericGrade !== null && (
                          <span className="text-sm font-semibold">{g.numericGrade}/100</span>
                        )}
                      </div>
                    </div>
                    {g.comment && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{g.comment}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
