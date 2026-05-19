import { requireApprovedUser } from "@/server/auth/session";
import { getTranslations } from "next-intl/server";
import { getAssignmentDetail } from "@/server/services/assignment";
import { deleteAssignmentAction } from "@/server/actions/assignment";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireApprovedUser();
  const { id } = await params;
  const t = await getTranslations("assignments");

  const assignment = await getAssignmentDetail(id);
  if (!assignment) {
    notFound();
  }

  const deleteAssignment = deleteAssignmentAction as unknown as (
    formData: FormData
  ) => void;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{assignment.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              {t("type")}
            </dt>
            <dd className="mt-1 text-sm">{t(`types.${assignment.type}`)}</dd>
          </div>

          {assignment.description && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("description")}
              </dt>
              <dd className="mt-1 text-sm">{assignment.description}</dd>
            </div>
          )}

          {assignment.dueDate && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("dueDate")}
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(assignment.dueDate).toLocaleDateString()}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              {t("requiredRepetitions")}
            </dt>
            <dd className="mt-1 text-sm">{assignment.requiredRepetitions}</dd>
          </div>

          {assignment.quranAssignment && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("quranRange")}
              </dt>
              <dd className="mt-1 text-sm" dir="rtl">
                {assignment.quranAssignment.fromSurah.nameAr} (
                {assignment.quranAssignment.fromAyahNumber}) →{" "}
                {assignment.quranAssignment.toSurah.nameAr} (
                {assignment.quranAssignment.toAyahNumber})
              </dd>
            </div>
          )}

          {assignment.tajweedAssignment && (
            <>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("tajweedTopic")}
                </dt>
                <dd className="mt-1 text-sm">
                  {assignment.tajweedAssignment.topicTitle}
                </dd>
              </div>
              {assignment.tajweedAssignment.topicDescription && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("tajweedDescription")}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {assignment.tajweedAssignment.topicDescription}
                  </dd>
                </div>
              )}
            </>
          )}

          {assignment.homeworkAssignment && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("instructions")}
              </dt>
              <dd className="mt-1 text-sm">
                {assignment.homeworkAssignment.instructions}
              </dd>
            </div>
          )}

          <form action={deleteAssignment}>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <Button type="submit" variant="destructive" size="sm">
              {t("delete")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentProgress")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assignment.studentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noStudents")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentName")}</TableHead>
                  <TableHead>{t("progress")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignment.studentAssignments.map((sa) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">
                      {sa.student.user.nameAr ?? sa.student.user.name}
                    </TableCell>
                    <TableCell>
                      {sa._count.confirmations} / {assignment.requiredRepetitions}
                    </TableCell>
                    <TableCell>{t(`statuses.${sa.status}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
