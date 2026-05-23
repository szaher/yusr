import { db } from "@/server/db/client";

export async function getAdminKPIs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activeStudents, pendingRegistrations, sessionStudents, examSubmissions] =
    await Promise.all([
      db.user.count({
        where: { role: { name: "student" }, accountStatus: "ACTIVE" },
      }),
      db.enrollmentApplication.count({
        where: { registrationStatus: "PENDING_REVIEW" },
      }),
      db.sessionStudent.findMany({
        where: { session: { date: { gte: thirtyDaysAgo } } },
        select: { attendance: true, numericGrade: true },
      }),
      db.examSubmission.findMany({
        where: { status: "GRADED" },
        select: { passed: true },
      }),
    ]);

  const totalAttendance = sessionStudents.length;
  const presentCount = sessionStudents.filter(
    (s) => s.attendance === "PRESENT" || s.attendance === "LATE"
  ).length;
  const avgAttendance =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const gradedStudents = sessionStudents.filter((s) => s.numericGrade != null);
  const avgSessionGrade =
    gradedStudents.length > 0
      ? Math.round(
          gradedStudents.reduce((sum, s) => sum + (s.numericGrade ?? 0), 0) /
            gradedStudents.length
        )
      : 0;

  const totalExams = examSubmissions.length;
  const passedCount = examSubmissions.filter((s) => s.passed === true).length;
  const examPassRate =
    totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0;

  return { activeStudents, avgAttendance, avgSessionGrade, examPassRate, pendingRegistrations };
}

export async function getAttendanceTrend(weeks: number = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const records = await db.sessionStudent.findMany({
    where: { session: { date: { gte: startDate } } },
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
    const key = weekStart.toISOString().slice(5, 10);

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
      label,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));
}

export async function getExamScoreDistribution() {
  const submissions = await db.examSubmission.findMany({
    where: { status: "GRADED", totalScore: { not: null } },
    select: { totalScore: true },
  });

  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count: 0,
  }));

  for (const s of submissions) {
    const score = s.totalScore ?? 0;
    const idx = Math.min(Math.floor(score / 10), 9);
    buckets[idx].count++;
  }

  return buckets;
}

export async function getMemorizationProgressByGroup() {
  const groups = await db.group.findMany({
    where: { active: true, memorizationPlansEnabled: true },
    select: {
      name: true,
      memorizationPlans: {
        where: { active: true },
        select: {
          reviews: {
            orderBy: { reviewDate: "desc" },
            take: 1,
            select: { grade: true },
          },
        },
      },
    },
  });

  return groups
    .filter((g) => g.memorizationPlans.length > 0)
    .map((g) => {
      const grades = g.memorizationPlans
        .map((p) => p.reviews[0]?.grade)
        .filter((grade): grade is number => grade != null);
      const avg =
        grades.length > 0
          ? Math.round(grades.reduce((s, v) => s + v, 0) / grades.length)
          : 0;
      return { label: g.name, value: avg, max: 100 };
    });
}

export async function getGroupComparison() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groups = await db.group.findMany({
    where: { active: true },
    select: {
      name: true,
      sessions: {
        where: { date: { gte: thirtyDaysAgo } },
        select: {
          students: {
            select: { attendance: true, numericGrade: true },
          },
        },
      },
      memorizationPlans: {
        where: { active: true },
        select: {
          reviews: {
            orderBy: { reviewDate: "desc" },
            take: 1,
            select: { grade: true },
          },
        },
      },
      examInstances: {
        select: {
          submissions: {
            where: { status: "GRADED", totalScore: { not: null } },
            select: { totalScore: true },
          },
        },
      },
    },
  });

  return groups.map((g) => {
    const allStudents = g.sessions.flatMap((s) => s.students);
    const totalAtt = allStudents.length;
    const presentAtt = allStudents.filter(
      (s) => s.attendance === "PRESENT" || s.attendance === "LATE"
    ).length;
    const attendance = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

    const memGrades = g.memorizationPlans
      .map((p) => p.reviews[0]?.grade)
      .filter((grade): grade is number => grade != null);
    const memorization =
      memGrades.length > 0
        ? Math.round(memGrades.reduce((s, v) => s + v, 0) / memGrades.length)
        : 0;

    const examScores = g.examInstances
      .flatMap((i) => i.submissions)
      .map((s) => s.totalScore ?? 0);
    const exams =
      examScores.length > 0
        ? Math.round(examScores.reduce((s, v) => s + v, 0) / examScores.length)
        : 0;

    return { label: g.name, attendance, memorization, exams };
  });
}

async function getModeratorGroupIds(userId: string): Promise<string[]> {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true } } },
  });
  return profile?.groups.map((g) => g.id) ?? [];
}

export async function getModeratorKPIs(userId: string) {
  const groupIds = await getModeratorGroupIds(userId);
  if (groupIds.length === 0) {
    return { attendanceRate: 0, avgGrade: 0, pendingGradings: 0 };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [sessionStudents, pendingGradings] = await Promise.all([
    db.sessionStudent.findMany({
      where: {
        session: {
          groupId: { in: groupIds },
          date: { gte: thirtyDaysAgo },
        },
      },
      select: { attendance: true, numericGrade: true },
    }),
    db.examSubmission.count({
      where: {
        status: "SUBMITTED",
        instance: { groupId: { in: groupIds } },
      },
    }),
  ]);

  const total = sessionStudents.length;
  const present = sessionStudents.filter(
    (s) => s.attendance === "PRESENT" || s.attendance === "LATE"
  ).length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const graded = sessionStudents.filter((s) => s.numericGrade != null);
  const avgGrade =
    graded.length > 0
      ? Math.round(
          graded.reduce((sum, s) => sum + (s.numericGrade ?? 0), 0) / graded.length
        )
      : 0;

  return { attendanceRate, avgGrade, pendingGradings };
}

export async function getStudentAttendanceGrid(userId: string, weeks: number = 8) {
  const groupIds = await getModeratorGroupIds(userId);
  if (groupIds.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const sessions = await db.weeklySession.findMany({
    where: {
      groupId: { in: groupIds },
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      students: {
        select: {
          attendance: true,
          student: {
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  const weekLabels: string[] = [];
  const sessionsByWeek = new Map<string, typeof sessions>();

  for (const session of sessions) {
    const d = new Date(session.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(5, 10);

    if (!sessionsByWeek.has(key)) {
      weekLabels.push(key);
      sessionsByWeek.set(key, []);
    }
    sessionsByWeek.get(key)!.push(session);
  }

  type CellStatus = "present" | "absent" | "late" | "excused" | "none";

  const studentMap = new Map<
    string,
    { studentName: string; weeks: Map<string, CellStatus> }
  >();

  for (const [weekKey, weekSessions] of sessionsByWeek) {
    for (const session of weekSessions) {
      for (const ss of session.students) {
        const name = ss.student.user.name ?? "—";
        if (!studentMap.has(name)) {
          studentMap.set(name, { studentName: name, weeks: new Map() });
        }
        const statusMap: Record<string, CellStatus> = {
          PRESENT: "present",
          ABSENT: "absent",
          LATE: "late",
          EXCUSED_ABSENCE: "excused",
          PENDING: "none",
        };
        const existing = studentMap.get(name)!.weeks.get(weekKey);
        if (!existing || existing === "none") {
          studentMap.get(name)!.weeks.set(weekKey, statusMap[ss.attendance] ?? "none");
        }
      }
    }
  }

  return Array.from(studentMap.values()).map((entry) => ({
    studentName: entry.studentName,
    weeks: weekLabels.map((wl) => ({
      label: wl,
      status: entry.weeks.get(wl) ?? ("none" as CellStatus),
    })),
  }));
}

export async function getSessionGradeTrend(userId: string, weeks: number = 8) {
  const groupIds = await getModeratorGroupIds(userId);
  if (groupIds.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const sessions = await db.weeklySession.findMany({
    where: {
      groupId: { in: groupIds },
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      students: {
        select: { numericGrade: true },
      },
    },
  });

  return sessions
    .map((session) => {
      const graded = session.students.filter((s) => s.numericGrade != null);
      if (graded.length === 0) return null;
      const avg = Math.round(
        graded.reduce((sum, s) => sum + (s.numericGrade ?? 0), 0) / graded.length
      );
      return {
        label: new Date(session.date).toISOString().slice(5, 10),
        value: avg,
      };
    })
    .filter((entry): entry is { label: string; value: number } => entry !== null);
}

export async function getStudentKPIs(studentProfileId: string) {
  const [reviews, examSubmissions, sessionStudents] = await Promise.all([
    db.memorizationReview.findMany({
      where: { plan: { studentId: studentProfileId, active: true } },
      select: { grade: true },
    }),
    db.examSubmission.findMany({
      where: { studentId: studentProfileId, status: "GRADED", totalScore: { not: null } },
      select: { totalScore: true },
    }),
    db.sessionStudent.findMany({
      where: { studentId: studentProfileId },
      orderBy: { session: { date: "desc" } },
      select: { attendance: true },
    }),
  ]);

  const activePlan = await db.studentMemorizationPlan.findFirst({
    where: { studentId: studentProfileId, active: true },
  });

  let memorizationProgress: number | null = null;
  if (activePlan) {
    memorizationProgress =
      reviews.length > 0
        ? Math.round(reviews.reduce((s, r) => s + r.grade, 0) / reviews.length)
        : 0;
  }

  const avgExamScore =
    examSubmissions.length > 0
      ? Math.round(
          examSubmissions.reduce((s, e) => s + (e.totalScore ?? 0), 0) /
            examSubmissions.length
        )
      : 0;

  let attendanceStreak = 0;
  for (const ss of sessionStudents) {
    if (ss.attendance === "PRESENT") {
      attendanceStreak++;
    } else {
      break;
    }
  }

  return { memorizationProgress, avgExamScore, attendanceStreak };
}

export async function getStudentGradeHistory(studentProfileId: string) {
  const records = await db.sessionStudent.findMany({
    where: {
      studentId: studentProfileId,
      numericGrade: { not: null },
    },
    orderBy: { session: { date: "desc" } },
    take: 12,
    select: {
      numericGrade: true,
      session: { select: { date: true } },
    },
  });

  return records.reverse().map((r) => ({
    label: new Date(r.session.date).toISOString().slice(5, 10),
    value: Math.round(r.numericGrade ?? 0),
  }));
}

export async function getStudentMemorizationProgress(studentProfileId: string) {
  const reviews = await db.memorizationReview.findMany({
    where: { plan: { studentId: studentProfileId } },
    orderBy: { reviewDate: "desc" },
    take: 12,
    select: {
      grade: true,
      reviewDate: true,
    },
  });

  return reviews.reverse().map((r) => ({
    label: new Date(r.reviewDate).toISOString().slice(5, 10),
    value: r.grade,
  }));
}
