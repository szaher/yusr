import { db } from "@/server/db/client";
import { createNotification } from "@/server/services/notification";

export async function getSchoolAttendanceStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allRecords, monthRecords, sessionCount] = await Promise.all([
    db.sessionStudent.findMany({
      select: { attendance: true },
    }),
    db.sessionStudent.findMany({
      where: { session: { date: { gte: thirtyDaysAgo } } },
      select: { attendance: true },
    }),
    db.weeklySession.count({
      where: { date: { gte: thirtyDaysAgo } },
    }),
  ]);

  const total = allRecords.length;
  const present = allRecords.filter(
    (r) => r.attendance === "PRESENT" || r.attendance === "LATE"
  ).length;
  const overallRate = total > 0 ? Math.round((present / total) * 100) : null;

  const breakdown = {
    present: monthRecords.filter((r) => r.attendance === "PRESENT").length,
    absent: monthRecords.filter((r) => r.attendance === "ABSENT").length,
    late: monthRecords.filter((r) => r.attendance === "LATE").length,
    excused: monthRecords.filter((r) => r.attendance === "EXCUSED_ABSENCE").length,
  };

  return { overallRate, sessionsThisMonth: sessionCount, breakdown };
}

export async function getGroupAttendanceStats(groupId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allRecords, sessionCount] = await Promise.all([
    db.sessionStudent.findMany({
      where: { session: { groupId } },
      select: { attendance: true },
    }),
    db.weeklySession.count({
      where: { groupId, date: { gte: thirtyDaysAgo } },
    }),
  ]);

  const total = allRecords.length;
  const present = allRecords.filter(
    (r) => r.attendance === "PRESENT" || r.attendance === "LATE"
  ).length;
  const overallRate = total > 0 ? Math.round((present / total) * 100) : null;

  return { overallRate, sessionsThisMonth: sessionCount };
}

export async function getStudentAttendanceStats(studentProfileId: string) {
  const records = await db.sessionStudent.findMany({
    where: { studentId: studentProfileId },
    orderBy: { session: { date: "desc" } },
    select: { attendance: true },
  });

  const total = records.length;
  if (total === 0) {
    return { overallRate: null, totalSessions: 0, attended: 0, currentStreak: 0, longestStreak: 0 };
  }

  const attended = records.filter(
    (r) => r.attendance === "PRESENT" || r.attendance === "LATE"
  ).length;
  const overallRate = Math.round((attended / total) * 100);

  let currentStreak = 0;
  for (const r of records) {
    if (r.attendance === "ABSENT") break;
    currentStreak++;
  }

  let longestStreak = 0;
  let streak = 0;
  for (const r of records) {
    if (r.attendance !== "ABSENT") {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  return { overallRate, totalSessions: total, attended, currentStreak, longestStreak };
}

export async function getAttendanceByWeek(
  scope: "school" | "group" | "student",
  id?: string,
  weeks: number = 12
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const where: Record<string, unknown> = { session: { date: { gte: startDate } } };
  if (scope === "group" && id) {
    where.session = { ...where.session as object, groupId: id };
  } else if (scope === "student" && id) {
    where.studentId = id;
  }

  const records = await db.sessionStudent.findMany({
    where,
    select: {
      attendance: true,
      session: { select: { date: true } },
    },
  });

  const weeklyMap = new Map<string, { total: number; present: number }>();
  for (const r of records) {
    const d = new Date(r.session.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    const entry = weeklyMap.get(key) ?? { total: 0, present: 0 };
    entry.total++;
    if (r.attendance === "PRESENT" || r.attendance === "LATE") {
      entry.present++;
    }
    weeklyMap.set(key, entry);
  }

  return Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({
      label: label.slice(5),
      value: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));
}

export async function getAttendanceByMonth(
  scope: "school" | "group" | "student",
  id?: string,
  months: number = 6
) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const where: Record<string, unknown> = { session: { date: { gte: startDate } } };
  if (scope === "group" && id) {
    where.session = { ...where.session as object, groupId: id };
  } else if (scope === "student" && id) {
    where.studentId = id;
  }

  const records = await db.sessionStudent.findMany({
    where,
    select: {
      attendance: true,
      session: { select: { date: true } },
    },
  });

  const monthMap = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const r of records) {
    const key = new Date(r.session.date).toISOString().slice(0, 7);
    const entry = monthMap.get(key) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    if (r.attendance === "PRESENT") entry.present++;
    else if (r.attendance === "ABSENT") entry.absent++;
    else if (r.attendance === "LATE") entry.late++;
    else if (r.attendance === "EXCUSED_ABSENCE") entry.excused++;
    monthMap.set(key, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({ label, ...data }));
}

export async function getAttendanceGroupComparison() {
  const groups = await db.group.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      sessions: {
        select: {
          students: { select: { attendance: true } },
        },
      },
    },
  });

  return groups
    .map((g) => {
      const all = g.sessions.flatMap((s) => s.students);
      const total = all.length;
      const present = all.filter(
        (s) => s.attendance === "PRESENT" || s.attendance === "LATE"
      ).length;
      return {
        label: g.name,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}

export async function getStudentAttendanceLog(
  studentProfileId: string,
  page: number = 1,
  limit: number = 20
) {
  const [records, total] = await Promise.all([
    db.sessionStudent.findMany({
      where: { studentId: studentProfileId },
      orderBy: { session: { date: "desc" } },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        attendance: true,
        session: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            group: { select: { name: true } },
          },
        },
      },
    }),
    db.sessionStudent.count({ where: { studentId: studentProfileId } }),
  ]);

  return {
    records: records.map((r) => ({
      date: r.session.date,
      startTime: r.session.startTime,
      endTime: r.session.endTime,
      groupName: r.session.group.name,
      attendance: r.attendance,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function getStudentsAtRisk(groupId?: string) {
  const students = await db.studentProfile.findMany({
    where: groupId
      ? { groupStudents: { some: { groupId } } }
      : { user: { accountStatus: "ACTIVE" } },
    select: {
      id: true,
      user: { select: { name: true } },
      sessionStudents: {
        orderBy: { session: { date: "desc" } },
        take: 20,
        select: {
          attendance: true,
          session: { select: { date: true, group: { select: { name: true, id: true } } } },
        },
      },
    },
  });

  const config = await getAlertConfig(groupId ?? null);

  return students
    .map((s) => {
      const records = s.sessionStudents;
      if (records.length === 0) return null;

      let consecutiveAbsences = 0;
      for (const r of records) {
        if (r.attendance === "ABSENT") consecutiveAbsences++;
        else break;
      }

      const total = records.length;
      const present = records.filter(
        (r) => r.attendance === "PRESENT" || r.attendance === "LATE"
      ).length;
      const rate = Math.round((present / total) * 100);

      const isAtRisk =
        consecutiveAbsences >= config.consecutiveAbsenceThreshold ||
        rate < config.attendanceRateThreshold;

      if (!isAtRisk) return null;

      return {
        studentId: s.id,
        studentName: s.user.name ?? "—",
        groupName: records[0]?.session.group.name ?? "—",
        attendanceRate: rate,
        consecutiveAbsences,
        lastSessionDate: records[0]?.session.date ?? null,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);
}

export async function getMostAbsentGroup() {
  const comparison = await getAttendanceGroupComparison();
  if (comparison.length === 0) return null;
  return comparison[comparison.length - 1];
}

export async function getAlertConfig(groupId: string | null) {
  if (groupId) {
    const groupConfig = await db.attendanceAlertConfig.findUnique({
      where: { groupId },
    });
    if (groupConfig) return groupConfig;
  }

  const defaultConfig = await db.attendanceAlertConfig.findFirst({
    where: { groupId: null },
  });

  return defaultConfig ?? {
    consecutiveAbsenceThreshold: 3,
    attendanceRateThreshold: 75,
    notifyModerator: true,
    notifyAdmin: true,
  };
}

export async function upsertAlertConfig(
  groupId: string | null,
  data: {
    consecutiveAbsenceThreshold: number;
    attendanceRateThreshold: number;
    notifyModerator: boolean;
    notifyAdmin: boolean;
  }
) {
  if (groupId) {
    return db.attendanceAlertConfig.upsert({
      where: { groupId },
      update: data,
      create: { groupId, ...data },
    });
  }

  const existing = await db.attendanceAlertConfig.findFirst({
    where: { groupId: null },
  });

  if (existing) {
    return db.attendanceAlertConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  return db.attendanceAlertConfig.create({ data });
}

export async function checkAttendanceAlerts(sessionId: string) {
  const session = await db.weeklySession.findUnique({
    where: { id: sessionId },
    select: {
      groupId: true,
      group: { select: { moderatorId: true } },
      students: {
        where: { attendance: "ABSENT" },
        select: {
          studentId: true,
          student: { select: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!session || session.students.length === 0) return;

  const config = await getAlertConfig(session.groupId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const ss of session.students) {
    const recentRecords = await db.sessionStudent.findMany({
      where: { studentId: ss.studentId },
      orderBy: { session: { date: "desc" } },
      take: 20,
      select: { attendance: true },
    });

    let consecutiveAbsences = 0;
    for (const r of recentRecords) {
      if (r.attendance === "ABSENT") consecutiveAbsences++;
      else break;
    }

    const total = recentRecords.length;
    const present = recentRecords.filter(
      (r) => r.attendance === "PRESENT" || r.attendance === "LATE"
    ).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    const consecutiveTriggered = consecutiveAbsences >= config.consecutiveAbsenceThreshold;
    const rateTriggered = rate < config.attendanceRateThreshold;

    if (!consecutiveTriggered && !rateTriggered) continue;

    const recentAlerts = await db.notification.count({
      where: {
        type: "ATTENDANCE_ALERT",
        createdAt: { gte: sevenDaysAgo },
        body: { contains: ss.studentId },
      },
    });

    if (recentAlerts > 0) continue;

    const studentName = ss.student.user.name ?? "Student";
    const triggers: string[] = [];
    if (consecutiveTriggered) triggers.push(`${consecutiveAbsences} consecutive absences`);
    if (rateTriggered) triggers.push(`attendance rate ${rate}%`);
    const triggerText = triggers.join(", ");

    const recipients: string[] = [];

    if (config.notifyModerator && session.group.moderatorId) {
      const modUser = await db.moderatorProfile.findUnique({
        where: { id: session.group.moderatorId },
        select: { userId: true },
      });
      if (modUser) recipients.push(modUser.userId);
    }

    if (config.notifyAdmin) {
      const admins = await db.user.findMany({
        where: { role: { name: "admin" }, accountStatus: "ACTIVE" },
        select: { id: true },
      });
      recipients.push(...admins.map((a) => a.id));
    }

    for (const recipientId of [...new Set(recipients)]) {
      await createNotification({
        recipientId,
        type: "ATTENDANCE_ALERT",
        title: `Attendance Alert: ${studentName}`,
        body: `${studentName} (${ss.studentId}): ${triggerText}`,
      });
    }
  }
}
