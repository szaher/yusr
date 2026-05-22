import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const SUBMISSION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  GRADED: "bg-green-100 text-green-800",
};

export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noExams")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const instances = await getStudentInstances(studentProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissionStatus")}</TableHead>
              <TableHead>{t("score")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const sub = inst.submissions[0];
              const subStatus = sub?.status ?? "NOT_STARTED";
              const subStatusKey = subStatus === "IN_PROGRESS" ? "inProgress" : subStatus === "NOT_STARTED" ? "notStarted" : subStatus.toLowerCase();

              return (
                <TableRow key={inst.id}>
                  <TableCell>
                    <Link href={`/${locale}/student/exams/${inst.id}`} className="font-medium hover:underline">
                      {inst.template.title}
                    </Link>
                  </TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Badge className={SUBMISSION_COLORS[subStatus] || ""}>
                      {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub?.totalScore !== null && sub?.totalScore !== undefined ? (
                      <>
                        {Math.round(sub.totalScore)}%{" "}
                        <Badge className={sub.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {sub.passed ? t("passed") : t("failed")}
                        </Badge>
                      </>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noExams")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
