import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStudentGrades } from "@/server/services/session";
import { Card, CardContent } from "@/components/ui/card";
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
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGrades")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
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
      )}
    </div>
  );
}
