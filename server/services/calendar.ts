import { db } from "@/server/db/client";

export type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  type: "session" | "assignment" | "exam";
  url?: string;
};

export async function getStudentCalendarEvents(
  studentProfileId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [sessions, assignments, exams] = await Promise.all([
    db.sessionStudent.findMany({
      where: {
        studentId: studentProfileId,
        session: { date: { gte: startDate, lte: endDate } },
      },
      select: {
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
            group: { select: { name: true } },
          },
        },
      },
    }),
    db.studentAssignment.findMany({
      where: {
        studentId: studentProfileId,
        assignment: {
          dueDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      },
      select: {
        assignment: {
          select: { id: true, title: true, dueDate: true, type: true },
        },
      },
    }),
    db.examSubmission.findMany({
      where: {
        studentId: studentProfileId,
        instance: { startDate: { gte: startDate, lte: endDate } },
      },
      select: {
        instance: {
          select: {
            id: true,
            startDate: true,
            template: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const s of sessions) {
    events.push({
      id: s.session.id,
      date: s.session.date,
      title:
        s.session.group.name +
        (s.session.startTime ? ` — ${s.session.startTime}` : ""),
      type: "session",
    });
  }

  for (const a of assignments) {
    if (a.assignment.dueDate) {
      events.push({
        id: a.assignment.id,
        date: a.assignment.dueDate,
        title: a.assignment.title,
        type: "assignment",
      });
    }
  }

  for (const e of exams) {
    events.push({
      id: e.instance.id,
      date: e.instance.startDate,
      title: e.instance.template.title,
      type: "exam",
    });
  }

  return events;
}

export async function getModeratorCalendarEvents(
  moderatorUserId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: moderatorUserId },
    select: { id: true, groups: { select: { id: true } } },
  });
  if (!profile) return [];
  const groupIds = profile.groups.map((g) => g.id);

  const [sessions, exams] = await Promise.all([
    db.weeklySession.findMany({
      where: {
        groupId: { in: groupIds },
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        group: { select: { name: true } },
        _count: { select: { students: true } },
      },
    }),
    db.examInstance.findMany({
      where: {
        groupId: { in: groupIds },
        startDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        startDate: true,
        template: { select: { title: true } },
        group: { select: { name: true } },
      },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const s of sessions) {
    events.push({
      id: s.id,
      date: s.date,
      title:
        s.group.name + (s.startTime ? ` — ${s.startTime}` : ""),
      type: "session",
    });
  }

  for (const e of exams) {
    events.push({
      id: e.id,
      date: e.startDate,
      title: `${e.template.title} — ${e.group.name}`,
      type: "exam",
    });
  }

  return events;
}
