import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { CalendarEvent } from "@/server/services/calendar";

type CalendarViewProps = {
  events: CalendarEvent[];
  year: number;
  month: number;
  locale: string;
  selectedDay?: number;
  basePath: string;
};

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  session: "bg-blue-500",
  assignment: "bg-amber-500",
  exam: "bg-red-500",
};

const EVENT_BG: Record<CalendarEvent["type"], string> = {
  session: "bg-blue-500/10 dark:bg-blue-500/20",
  assignment: "bg-amber-500/10 dark:bg-amber-500/20",
  exam: "bg-red-500/10 dark:bg-red-500/20",
};

const EVENT_BORDER: Record<CalendarEvent["type"], string> = {
  session: "border-s-blue-500",
  assignment: "border-s-amber-500",
  exam: "border-s-red-500",
};

const EVENT_TEXT_COLORS: Record<CalendarEvent["type"], string> = {
  session: "text-blue-700 dark:text-blue-300",
  assignment: "text-amber-700 dark:text-amber-300",
  exam: "text-red-700 dark:text-red-300",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function getPrevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function getNextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function getWeekdayOrder(locale: string): number[] {
  if (locale === "ar") return [6, 0, 1, 2, 3, 4, 5];
  return [1, 2, 3, 4, 5, 6, 0];
}

function isWeekend(dayIndex: number, locale: string): boolean {
  if (locale === "ar") return dayIndex === 6 || dayIndex === 0;
  return dayIndex === 5 || dayIndex === 6;
}

function getWeekdayNames(locale: string): string[] {
  const order = getWeekdayOrder(locale);
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return order.map((dayIndex) => {
    const date = new Date(2024, 0, 7 + dayIndex);
    return formatter.format(date);
  });
}

function getMonthName(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatDayHeader(year: number, month: number, day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

export function CalendarView({
  events,
  year,
  month,
  locale,
  selectedDay,
  basePath,
}: CalendarViewProps) {
  const t = useTranslations("calendar");
  const isRtl = locale === "ar";

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month);
  const weekdayOrder = getWeekdayOrder(locale);
  const weekdayNames = getWeekdayNames(locale);
  const monthName = getMonthName(year, month, locale);
  const startOffset = weekdayOrder.indexOf(firstDayOfWeek);

  const prev = getPrevMonth(year, month);
  const next = getNextMonth(year, month);
  const prevDaysInMonth = getDaysInMonth(prev.year, prev.month);

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (const event of events) {
    const d = new Date(event.date).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(event);
  }

  const displayDay = selectedDay ?? todayDay;
  const dayEvents = displayDay > 0 ? (eventsByDay[displayDay] ?? []) : [];

  const totalEvents = events.length;

  return (
    <div className="space-y-4">
      {/* Main calendar card */}
      <Card className="overflow-hidden">
        {/* Header with gradient accent */}
        <div className="bg-gradient-to-b from-primary/5 to-transparent px-4 pt-5 pb-3 sm:px-6">
          <div className="flex items-center justify-between">
            <a
              href={`${basePath}?year=${prev.year}&month=${prev.month}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all"
              aria-label={t("previousMonth")}
            >
              {isRtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </a>

            <div className="flex flex-col items-center gap-1">
              <h2 className="text-xl font-bold tracking-tight">{monthName}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {totalEvents > 0 && (
                  <span>{totalEvents} {totalEvents === 1 ? t("event") : t("events")}</span>
                )}
                {!isCurrentMonth && (
                  <a
                    href={basePath}
                    className="rounded-full bg-primary/10 px-3 py-0.5 font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t("today")}
                  </a>
                )}
              </div>
            </div>

            <a
              href={`${basePath}?year=${next.year}&month=${next.month}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all"
              aria-label={t("nextMonth")}
            >
              {isRtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </a>
          </div>
        </div>

        <CardContent className="px-2 pb-4 sm:px-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdayNames.map((name, i) => (
              <div
                key={i}
                className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                  isWeekend(i, locale)
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-xl bg-border/50 overflow-hidden">
            {/* Leading blank cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`prev-${i}`} className="flex flex-col items-center bg-card/50 p-1.5 min-h-[3.25rem] sm:min-h-[4rem]">
                <span className="text-[11px] text-muted-foreground/30">{prevDaysInMonth - startOffset + 1 + i}</span>
              </div>
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === todayDay;
              const isSelected = day === displayDay;
              const dayEvts = eventsByDay[day] ?? [];
              const colIndex = (startOffset + i) % 7;
              const isWeekendDay = isWeekend(colIndex, locale);
              const eventTypes = Array.from(new Set(dayEvts.map((e) => e.type)));

              return (
                <a
                  key={day}
                  href={`${basePath}?year=${year}&month=${month}&day=${day}`}
                  className={`group relative flex flex-col items-center p-1.5 min-h-[3.25rem] sm:min-h-[4rem] transition-all
                    ${isSelected ? "bg-primary/8 dark:bg-primary/15" : isWeekendDay ? "bg-muted/30" : "bg-card"}
                    ${isSelected ? "z-10 shadow-sm ring-1 ring-primary/25" : "hover:bg-accent/60"}
                  `}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors
                      ${isToday ? "bg-primary text-primary-foreground shadow-sm" : ""}
                      ${isSelected && !isToday ? "bg-primary/15 text-primary font-semibold" : ""}
                      ${!isToday && !isSelected ? "group-hover:bg-accent" : ""}
                      ${isWeekendDay && !isToday && !isSelected ? "text-muted-foreground/70" : ""}
                    `}
                  >
                    {day}
                  </span>

                  {/* Event indicators */}
                  {dayEvts.length > 0 && (
                    <div className="mt-auto flex flex-col items-center gap-0.5 pt-0.5">
                      {/* Dots for event types */}
                      <div className="flex gap-[3px]">
                        {eventTypes.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className={`h-[5px] w-[5px] rounded-full ${EVENT_COLORS[type]} shadow-sm`}
                          />
                        ))}
                      </div>
                      {/* Count badge for multiple events */}
                      {dayEvts.length > 1 && (
                        <span className="text-[9px] font-semibold text-muted-foreground/70 leading-none">
                          {dayEvts.length}
                        </span>
                      )}
                    </div>
                  )}
                </a>
              );
            })}

            {/* Trailing blank cells */}
            {(() => {
              const totalCells = startOffset + daysInMonth;
              const remainder = totalCells % 7;
              const trailingCount = remainder === 0 ? 0 : 7 - remainder;
              return Array.from({ length: trailingCount }).map((_, i) => (
                <div key={`next-${i}`} className="flex flex-col items-center bg-card/50 p-1.5 min-h-[3.25rem] sm:min-h-[4rem]">
                  <span className="text-[11px] text-muted-foreground/30">{i + 1}</span>
                </div>
              ));
            })()}
          </div>

          {/* Integrated legend */}
          <div className="mt-3 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" /> {t("session")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-sm" /> {t("assignment")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm" /> {t("exam")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected day events panel */}
      {displayDay > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {formatDayHeader(year, month, displayDay, locale)}
              </h3>
              {dayEvents.length > 0 && (
                <span className="ms-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {dayEvents.length}
                </span>
              )}
            </div>

            {dayEvents.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="rounded-full bg-muted p-3 mb-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className={`flex items-center gap-3 rounded-lg border-s-[3px] ${EVENT_BORDER[event.type]} ${EVENT_BG[event.type]} px-3 py-2.5 transition-colors hover:opacity-90`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className={`text-xs font-medium ${EVENT_TEXT_COLORS[event.type]}`}>
                        {t(event.type)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
