import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorGroups } from "@/server/services/organization";
import { updateGroupCadenceAction } from "@/server/actions/memorization";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const updateGroupCadence = updateGroupCadenceAction as unknown as (formData: FormData) => void;

export default async function ModeratorGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("moderator.groups");
  const mt = await getTranslations("memorization.cadence");

  const groups = await getModeratorGroups(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroups")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("groupName")}</TableHead>
                <TableHead>{t("className")}</TableHead>
                <TableHead>{t("levelName")}</TableHead>
                <TableHead>{t("weeklyDay")}</TableHead>
                <TableHead>{t("weeklyTime")}</TableHead>
                <TableHead>{t("studentCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.class.name}</TableCell>
                  <TableCell>{group.class.level.nameAr}</TableCell>
                  <TableCell>{group.weeklyDay ?? "—"}</TableCell>
                  <TableCell>{group.weeklyTime ?? "—"}</TableCell>
                  <TableCell>{group._count.students}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h2 className="text-xl font-semibold">{mt("title")}</h2>
          {groups.map((group) => (
            <Card key={`cadence-${group.id}`}>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">{group.name}</h3>
                <form action={updateGroupCadence} className="grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="groupId" value={group.id} />
                  <div className="space-y-1">
                    <Label>{mt("groupDefault")}</Label>
                    <select
                      name="meetingCadence"
                      defaultValue={group.meetingCadence || "WEEKLY"}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="WEEKLY">{mt("weekly")}</option>
                      <option value="BIWEEKLY">{mt("biweekly")}</option>
                      <option value="TWICE_WEEKLY">{mt("twiceWeekly")}</option>
                      <option value="CUSTOM">{mt("custom")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>{mt("customDays")}</Label>
                    <Input
                      name="customCadenceDays"
                      type="number"
                      min="1"
                      defaultValue={group.customCadenceDays ?? ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{mt("enablePlans")}</Label>
                    <div className="flex items-center gap-2 h-10">
                      <input
                        type="checkbox"
                        name="memorizationPlansEnabled"
                        value="true"
                        defaultChecked={group.memorizationPlansEnabled}
                        className="h-4 w-4"
                      />
                      <Button type="submit" size="sm">{mt("save")}</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
