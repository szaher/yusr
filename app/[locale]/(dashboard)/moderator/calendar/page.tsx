import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorCalendarEvents } from "@/server/services/calendar";
import { CalendarView } from "@/components/shared/calendar-view";

export default async function ModeratorCalendarPage({
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

  const events = await getModeratorCalendarEvents(session.user.id, year, month);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CalendarView
        events={events}
        year={year}
        month={month}
        locale={locale}
        selectedDay={selectedDay}
        basePath={`/${locale}/moderator/calendar`}
      />
    </div>
  );
}
