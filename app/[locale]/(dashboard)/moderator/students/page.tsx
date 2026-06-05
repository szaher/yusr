import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorStudents } from "@/server/services/organization";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/shared/search-input";

export default async function ModeratorStudentsPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { locale } = await params;
  const { search } = await searchParamsPromise;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("moderator.students");

  const students = await getModeratorStudents(session.user.id, search);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {students.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noStudents")}</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("country")}</TableHead>
              <TableHead>{t("quranLevel")}</TableHead>
              <TableHead>{t("group")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.studentProfile.id}>
                <TableCell className="font-medium">
                  {s.user.nameAr ?? s.user.name}
                </TableCell>
                <TableCell>{s.user.email}</TableCell>
                <TableCell>{s.studentProfile.phone ?? "—"}</TableCell>
                <TableCell>{s.studentProfile.country ?? "—"}</TableCell>
                <TableCell>{s.studentProfile.currentQuranLevel ?? "—"}</TableCell>
                <TableCell>{s.groupName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
