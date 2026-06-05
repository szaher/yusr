import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getStudentCalendarEvents } from "@/server/services/calendar";
import { CalendarView } from "@/components/shared/calendar-view";

export default async function StudentCalendarPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  const { locale } = await params;
  const { year: yearStr, month: monthStr, day: dayStr } = await searchParamsPromise;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("calendar");
  const now = new Date();
  const year = yearStr ? parseInt(yearStr) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
  const selectedDay = dayStr ? parseInt(dayStr) : undefined;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const events = profile
    ? await getStudentCalendarEvents(profile.id, year, month)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CalendarView
        events={events}
        year={year}
        month={month}
        locale={locale}
        selectedDay={selectedDay}
        basePath={`/${locale}/student/calendar`}
      />
    </div>
  );
}
