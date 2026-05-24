# Phase 11a: Attendance Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated attendance pages for admin/moderator/student with KPI cards, charts, quick-mark attendance, configurable alert thresholds, and at-risk student tracking — all built on the existing `SessionStudent.attendance` field.

**Architecture:** New `AttendanceAlertConfig` Prisma model stores per-group or school-wide alert thresholds. A new `server/services/attendance.ts` service provides all query and alert functions. Server actions handle quick-mark attendance and config updates. Four new pages (admin, moderator overview, moderator student detail, student) display data using existing chart components (`StatsCard`, `BarChartCard`, `LineChartCard`). A new `StackedBarChartCard` component handles monthly breakdowns. Everything is feature-flag gated under `attendance_management`.

**Tech Stack:** Next.js 16 (RSC + Server Actions), Prisma 7, Recharts, next-intl, Tailwind CSS 4, Zod

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `server/services/attendance.ts` | All attendance query + alert functions |
| Create | `server/actions/attendance.ts` | Server actions: quick-mark, config update |
| Create | `components/charts/stacked-bar-chart-card.tsx` | Stacked bar chart for monthly breakdown |
| Create | `components/attendance/quick-mark-form.tsx` | Client component: quick-mark attendance form |
| Create | `components/attendance/alert-config-form.tsx` | Client component: alert threshold config form |
| Create | `app/[locale]/(dashboard)/admin/attendance/page.tsx` | Admin attendance dashboard |
| Create | `app/[locale]/(dashboard)/moderator/attendance/page.tsx` | Moderator attendance overview |
| Create | `app/[locale]/(dashboard)/moderator/attendance/[studentId]/page.tsx` | Student attendance detail |
| Create | `app/[locale]/(dashboard)/student/attendance/page.tsx` | Student's own attendance view |
| Modify | `prisma/schema.prisma` | Add `AttendanceAlertConfig` model + Group relation |
| Modify | `prisma/seed.ts` | Add `attendance_management` feature flag + default config |
| Modify | `components/layout/sidebar.tsx` | Add attendance nav items for 3 roles |
| Modify | `messages/en.json` | Add `attendance` namespace + `nav.attendance` |
| Modify | `messages/ar.json` | Add `attendance` namespace + `nav.attendance` |
| Modify | `server/actions/session.ts` | Hook `checkAttendanceAlerts` into `gradeStudentAction` |

---

### Task 1: Prisma Schema — AttendanceAlertConfig Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add AttendanceAlertConfig model to schema**

Add after the `Notification` model (around line 738) in `prisma/schema.prisma`:

```prisma
model AttendanceAlertConfig {
  id                           String   @id @default(cuid())
  groupId                      String?  @unique
  group                        Group?   @relation(fields: [groupId], references: [id])
  consecutiveAbsenceThreshold  Int      @default(3)
  attendanceRateThreshold      Int      @default(75)
  notifyModerator              Boolean  @default(true)
  notifyAdmin                  Boolean  @default(true)
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt
}
```

Add the reverse relation to the `Group` model (around line 209, before `createdAt`):

```prisma
  attendanceAlertConfig AttendanceAlertConfig?
```

- [ ] **Step 2: Add feature flag and default config to seed**

In `prisma/seed.ts`, add to the `flags` array inside `seedFeatureFlags()` (around line 82):

```typescript
    { key: "attendance_management", enabled: true, description: "Attendance tracking, reports, and alerts" },
```

Add a new function after `seedFeatureFlags()`:

```typescript
async function seedAttendanceConfig() {
  await prisma.attendanceAlertConfig.upsert({
    where: { groupId: null },
    update: {},
    create: {
      consecutiveAbsenceThreshold: 3,
      attendanceRateThreshold: 75,
      notifyModerator: true,
      notifyAdmin: true,
    },
  });
  console.log("Seeded default attendance alert config");
}
```

Call `seedAttendanceConfig()` in the `main()` function after `seedFeatureFlags()`.

- [ ] **Step 3: Push schema and regenerate client**

Run:
```bash
npx prisma db push
npx prisma generate
```

Expected: Schema pushed successfully, client regenerated.

- [ ] **Step 4: Run seed to create flag and default config**

Run:
```bash
npx prisma db seed
```

Expected: "Seeded default attendance alert config" in output.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(attendance): add AttendanceAlertConfig model and feature flag"
```

---

### Task 2: i18n — Attendance Namespace

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add attendance namespace and nav key to en.json**

Add `"attendance"` key to the `nav` object:

```json
"attendance": "Attendance"
```

Add new top-level `"attendance"` namespace after the `"quranReader"` namespace:

```json
"attendance": {
  "title": "Attendance",
  "schoolOverview": "School Overview",
  "groupOverview": "Group Overview",
  "myAttendance": "My Attendance",
  "overallRate": "Overall Attendance Rate",
  "sessionsThisMonth": "Sessions This Month",
  "studentsAtRisk": "Students at Risk",
  "mostAbsentGroup": "Most Absent Group",
  "currentStreak": "Current Streak",
  "longestStreak": "Longest Streak",
  "sessionsAttended": "Sessions Attended",
  "weeklyTrend": "Weekly Attendance Trend",
  "monthlyBreakdown": "Monthly Breakdown",
  "groupComparison": "Attendance by Group",
  "present": "Present",
  "absent": "Absent",
  "late": "Late",
  "excusedAbsence": "Excused",
  "pending": "Pending",
  "quickMark": "Quick Mark Attendance",
  "selectSession": "Select Session",
  "selectGroup": "Select Group",
  "markAttendance": "Mark Attendance",
  "save": "Save",
  "saved": "Attendance saved",
  "atRiskStudents": "At-Risk Students",
  "consecutiveAbsences": "Consecutive Absences",
  "attendanceRate": "Attendance Rate",
  "lastSession": "Last Session",
  "alertConfig": "Alert Configuration",
  "consecutiveThreshold": "Consecutive Absence Threshold",
  "rateThreshold": "Rate Threshold (%)",
  "notifyModerator": "Notify Moderator",
  "notifyAdmin": "Notify Admin",
  "schoolDefault": "School Default",
  "groupOverride": "Group Override",
  "usingSchoolDefault": "Using school default",
  "overridingDefault": "Overriding school default",
  "sessionLog": "Session Log",
  "noSessions": "No sessions recorded yet",
  "status": "Status",
  "date": "Date",
  "sessionTime": "Session Time",
  "studentName": "Student Name",
  "group": "Group",
  "configSaved": "Configuration saved",
  "sessions": "{count} sessions",
  "consecutiveDays": "{count} consecutive",
  "na": "N/A"
}
```

- [ ] **Step 2: Add attendance namespace and nav key to ar.json**

Add `"attendance"` key to the `nav` object:

```json
"attendance": "الحضور"
```

Add new top-level `"attendance"` namespace:

```json
"attendance": {
  "title": "الحضور",
  "schoolOverview": "نظرة عامة على المدرسة",
  "groupOverview": "نظرة عامة على الحلقة",
  "myAttendance": "حضوري",
  "overallRate": "نسبة الحضور الإجمالية",
  "sessionsThisMonth": "الحصص هذا الشهر",
  "studentsAtRisk": "طلاب معرضون للخطر",
  "mostAbsentGroup": "أكثر حلقة غياباً",
  "currentStreak": "التتابع الحالي",
  "longestStreak": "أطول تتابع",
  "sessionsAttended": "الحصص التي حضرها",
  "weeklyTrend": "اتجاه الحضور الأسبوعي",
  "monthlyBreakdown": "التوزيع الشهري",
  "groupComparison": "الحضور حسب الحلقة",
  "present": "حاضر",
  "absent": "غائب",
  "late": "متأخر",
  "excusedAbsence": "غياب بعذر",
  "pending": "معلق",
  "quickMark": "تسجيل حضور سريع",
  "selectSession": "اختر الحصة",
  "selectGroup": "اختر الحلقة",
  "markAttendance": "تسجيل الحضور",
  "save": "حفظ",
  "saved": "تم حفظ الحضور",
  "atRiskStudents": "طلاب معرضون للخطر",
  "consecutiveAbsences": "غيابات متتالية",
  "attendanceRate": "نسبة الحضور",
  "lastSession": "آخر حصة",
  "alertConfig": "إعدادات التنبيهات",
  "consecutiveThreshold": "حد الغياب المتتالي",
  "rateThreshold": "حد النسبة (%)",
  "notifyModerator": "إشعار المحفظ",
  "notifyAdmin": "إشعار المدير",
  "schoolDefault": "الإعداد الافتراضي",
  "groupOverride": "إعداد الحلقة",
  "usingSchoolDefault": "يستخدم الإعداد الافتراضي",
  "overridingDefault": "يتجاوز الإعداد الافتراضي",
  "sessionLog": "سجل الحصص",
  "noSessions": "لا توجد حصص مسجلة بعد",
  "status": "الحالة",
  "date": "التاريخ",
  "sessionTime": "وقت الحصة",
  "studentName": "اسم الطالب",
  "group": "الحلقة",
  "configSaved": "تم حفظ الإعدادات",
  "sessions": "{count} حصة",
  "consecutiveDays": "{count} متتالية",
  "na": "غ/م"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(attendance): add i18n keys for attendance namespace"
```

---

### Task 3: Sidebar Navigation — Add Attendance Nav Items

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add CalendarCheck import**

Add `CalendarCheck` to the lucide-react import (line 28):

```typescript
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookOpenCheck,
  Settings,
  FileText,
  ClipboardList,
  Layers,
  UsersRound,
  ToggleLeft,
  ScrollText,
  Calendar,
  Award,
  CalendarOff,
  Megaphone,
  Headset,
  ClipboardCheck,
  BookOpenText,
  BookType,
  CalendarCheck,
} from "lucide-react";
```

- [ ] **Step 2: Add attendance nav item to adminNav**

Add after the `exams` entry (line 51):

```typescript
  { labelKey: "attendance", href: "/admin/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
```

- [ ] **Step 3: Add attendance nav item to moderatorNav**

Add after the `exams` entry (line 64):

```typescript
  { labelKey: "attendance", href: "/moderator/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
```

- [ ] **Step 4: Add attendance nav item to studentNav**

Add after the `exams` entry (line 79):

```typescript
  { labelKey: "attendance", href: "/student/attendance", icon: CalendarCheck, featureFlag: "attendance_management" },
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(attendance): add attendance nav items for admin, moderator, student"
```

---

### Task 4: Attendance Service — Query Functions

**Files:**
- Create: `server/services/attendance.ts`

- [ ] **Step 1: Create attendance service with all query functions**

Create `server/services/attendance.ts`:

```typescript
import { db } from "@/server/db/client";

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
  const where: Record<string, unknown> = {};
  if (groupId) {
    where.session = { groupId };
  }

  const students = await db.studentProfile.findMany({
    where: groupId
      ? { groups: { some: { groupId } } }
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
```

- [ ] **Step 2: Verify the service compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to attendance.ts.

- [ ] **Step 3: Commit**

```bash
git add server/services/attendance.ts
git commit -m "feat(attendance): add attendance service with query functions"
```

---

### Task 5: Attendance Service — Alert Functions

**Files:**
- Modify: `server/services/attendance.ts`

- [ ] **Step 1: Add alert functions to attendance service**

Append to `server/services/attendance.ts`:

```typescript
import { createNotification } from "@/server/services/notification";
```

Move this import to the top of the file alongside the existing db import. Then append these functions at the bottom:

```typescript
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
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/services/attendance.ts
git commit -m "feat(attendance): add alert config and checkAttendanceAlerts"
```

---

### Task 6: Server Actions — Quick Mark & Config Update

**Files:**
- Create: `server/actions/attendance.ts`
- Modify: `server/actions/session.ts`

- [ ] **Step 1: Create attendance server actions**

Create `server/actions/attendance.ts`:

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { checkAttendanceAlerts, upsertAlertConfig } from "@/server/services/attendance";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

export async function markQuickAttendanceAction(
  sessionId: string,
  records: { studentId: string; status: string }[]
) {
  const session = await requireApprovedUser();

  const weeklySession = await db.weeklySession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      group: { select: { moderatorId: true } },
    },
  });

  if (!weeklySession) return { error: "sessionNotFound" };
  if (weeklySession.status !== "SCHEDULED" && weeklySession.status !== "OPEN") {
    return { error: "sessionNotMarkable" };
  }

  if (session.user.role === "moderator") {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (weeklySession.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  const validStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED_ABSENCE"];

  await db.$transaction(
    records
      .filter((r) => validStatuses.includes(r.status))
      .map((r) =>
        db.sessionStudent.updateMany({
          where: { sessionId, studentId: r.studentId },
          data: { attendance: r.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED_ABSENCE" },
        })
      )
  );

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "ATTENDANCE_QUICK_MARK",
      entityType: "WeeklySession",
      entityId: sessionId,
      metadata: { studentCount: records.length },
    },
  });

  await checkAttendanceAlerts(sessionId);

  revalidatePath("/ar/moderator/attendance");
  revalidatePath("/en/moderator/attendance");
  revalidatePath("/ar/admin/attendance");
  revalidatePath("/en/admin/attendance");

  return { success: true };
}

export async function updateAlertConfigAction(
  groupId: string | null,
  data: {
    consecutiveAbsenceThreshold: number;
    attendanceRateThreshold: number;
    notifyModerator: boolean;
    notifyAdmin: boolean;
  }
) {
  const session = await requireApprovedUser();

  if (groupId === null && session.user.role !== "admin") {
    return { error: "notAuthorized" };
  }

  if (session.user.role === "moderator" && groupId) {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (!groupIds.includes(groupId)) {
      return { error: "notAuthorized" };
    }
  }

  const oldConfig = await db.attendanceAlertConfig.findFirst({
    where: { groupId },
  });

  await upsertAlertConfig(groupId, data);

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "ATTENDANCE_CONFIG_UPDATE",
      entityType: "AttendanceAlertConfig",
      entityId: groupId ?? "school-default",
      metadata: {
        oldValues: oldConfig
          ? {
              consecutiveAbsenceThreshold: oldConfig.consecutiveAbsenceThreshold,
              attendanceRateThreshold: oldConfig.attendanceRateThreshold,
            }
          : null,
        newValues: data,
      },
    },
  });

  revalidatePath("/ar/moderator/attendance");
  revalidatePath("/en/moderator/attendance");
  revalidatePath("/ar/admin/attendance");
  revalidatePath("/en/admin/attendance");

  return { success: true };
}
```

- [ ] **Step 2: Hook checkAttendanceAlerts into gradeStudentAction**

In `server/actions/session.ts`, add import at top:

```typescript
import { checkAttendanceAlerts } from "@/server/services/attendance";
```

After the `gradeStudent()` call (around line 190), before the `revalidatePath` calls, add:

```typescript
    const sessionStudentRecord = await db.sessionStudent.findUnique({
      where: { id: parsed.data.sessionStudentId },
      select: { sessionId: true },
    });
    if (sessionStudentRecord) {
      await checkAttendanceAlerts(sessionStudentRecord.sessionId);
    }
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/actions/attendance.ts server/actions/session.ts
git commit -m "feat(attendance): add quick-mark and config actions, hook alerts into grading"
```

---

### Task 7: StackedBarChartCard Component

**Files:**
- Create: `components/charts/stacked-bar-chart-card.tsx`

- [ ] **Step 1: Create StackedBarChartCard component**

Create `components/charts/stacked-bar-chart-card.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StackLayer {
  key: string;
  color: string;
  label: string;
}

interface StackedBarChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  layers: StackLayer[];
  xAxisKey?: string;
}

export function StackedBarChartCard({
  title,
  data,
  layers,
  xAxisKey = "label",
}: StackedBarChartCardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">—</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {layers.map((layer) => (
              <Bar
                key={layer.key}
                dataKey={layer.key}
                stackId="stack"
                fill={layer.color}
                name={layer.label}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/stacked-bar-chart-card.tsx
git commit -m "feat(attendance): add StackedBarChartCard component"
```

---

### Task 8: Client Components — QuickMarkForm & AlertConfigForm

**Files:**
- Create: `components/attendance/quick-mark-form.tsx`
- Create: `components/attendance/alert-config-form.tsx`

- [ ] **Step 1: Create QuickMarkForm**

Create `components/attendance/quick-mark-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markQuickAttendanceAction } from "@/server/actions/attendance";
import { toast } from "sonner";

type Session = {
  id: string;
  date: string;
  startTime: string | null;
};

type Student = {
  id: string;
  name: string;
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED_ABSENCE"] as const;

export function QuickMarkForm({
  sessions,
  students,
}: {
  sessions: Session[];
  students: Student[];
}) {
  const t = useTranslations("attendance");
  const [selectedSession, setSelectedSession] = useState(sessions[0]?.id ?? "");
  const [records, setRecords] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of students) initial[s.id] = "PRESENT";
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  const statusLabels: Record<string, string> = {
    PRESENT: t("present"),
    ABSENT: t("absent"),
    LATE: t("late"),
    EXCUSED_ABSENCE: t("excusedAbsence"),
  };

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800 border-green-300",
    ABSENT: "bg-red-100 text-red-800 border-red-300",
    LATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    EXCUSED_ABSENCE: "bg-blue-100 text-blue-800 border-blue-300",
  };

  function handleSave() {
    if (!selectedSession) return;
    startTransition(async () => {
      const result = await markQuickAttendanceAction(
        selectedSession,
        Object.entries(records).map(([studentId, status]) => ({ studentId, status }))
      );
      if (result.success) {
        toast.success(t("saved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("quickMark")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.date).toLocaleDateString()} {s.startTime ?? ""}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
              <span className="text-sm font-medium">{student.name}</span>
              <div className="flex gap-1">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRecords((prev) => ({ ...prev, [student.id]: status }))}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      records[student.id] === status
                        ? statusColors[status]
                        : "bg-muted/50 text-muted-foreground border-transparent"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? "..." : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create AlertConfigForm**

Create `components/attendance/alert-config-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateAlertConfigAction } from "@/server/actions/attendance";
import { toast } from "sonner";

type Config = {
  consecutiveAbsenceThreshold: number;
  attendanceRateThreshold: number;
  notifyModerator: boolean;
  notifyAdmin: boolean;
};

export function AlertConfigForm({
  groupId,
  initialConfig,
  isOverride,
  label,
}: {
  groupId: string | null;
  initialConfig: Config;
  isOverride: boolean;
  label: string;
}) {
  const t = useTranslations("attendance");
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateAlertConfigAction(groupId, config);
      if (result.success) {
        toast.success(t("configSaved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("alertConfig")} — {label}
        </CardTitle>
        {isOverride && (
          <p className="text-xs text-muted-foreground">{t("overridingDefault")}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">{t("consecutiveThreshold")}</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.consecutiveAbsenceThreshold}
              onChange={(e) =>
                setConfig((c) => ({ ...c, consecutiveAbsenceThreshold: parseInt(e.target.value) || 3 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("rateThreshold")}</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={config.attendanceRateThreshold}
              onChange={(e) =>
                setConfig((c) => ({ ...c, attendanceRateThreshold: parseInt(e.target.value) || 75 }))
              }
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.notifyModerator}
              onChange={(e) => setConfig((c) => ({ ...c, notifyModerator: e.target.checked }))}
              className="rounded"
            />
            {t("notifyModerator")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.notifyAdmin}
              onChange={(e) => setConfig((c) => ({ ...c, notifyAdmin: e.target.checked }))}
              className="rounded"
            />
            {t("notifyAdmin")}
          </label>
        </div>
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? "..." : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/attendance/quick-mark-form.tsx components/attendance/alert-config-form.tsx
git commit -m "feat(attendance): add QuickMarkForm and AlertConfigForm client components"
```

---

### Task 9: Admin Attendance Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/attendance/page.tsx`

- [ ] **Step 1: Create admin attendance page**

Create `app/[locale]/(dashboard)/admin/attendance/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import {
  getSchoolAttendanceStats,
  getAttendanceByWeek,
  getAttendanceByMonth,
  getAttendanceGroupComparison,
  getStudentsAtRisk,
  getMostAbsentGroup,
  getAlertConfig,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { AlertConfigForm } from "@/components/attendance/alert-config-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");

  const [stats, weeklyTrend, monthlyData, groupComparison, atRisk, worstGroup, alertConfig] =
    await Promise.all([
      getSchoolAttendanceStats(),
      getAttendanceByWeek("school"),
      getAttendanceByMonth("school"),
      getAttendanceGroupComparison(),
      getStudentsAtRisk(),
      getMostAbsentGroup(),
      getAlertConfig(null),
    ]);

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    ABSENT: "bg-red-100 text-red-800",
    LATE: "bg-yellow-100 text-yellow-800",
    EXCUSED_ABSENCE: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("sessionsThisMonth")}
          value={stats.sessionsThisMonth}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("studentsAtRisk")}
          value={atRisk.length}
          colorClass="text-red-600"
        />
        <StatsCard
          title={t("mostAbsentGroup")}
          value={worstGroup ? `${worstGroup.label} (${worstGroup.rate}%)` : t("na")}
          colorClass="text-amber-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard title={t("weeklyTrend")} data={weeklyTrend} color="#22c55e" />
        <StackedBarChartCard
          title={t("monthlyBreakdown")}
          data={monthlyData}
          layers={[
            { key: "present", color: "#22c55e", label: t("present") },
            { key: "late", color: "#eab308", label: t("late") },
            { key: "excused", color: "#3b82f6", label: t("excusedAbsence") },
            { key: "absent", color: "#ef4444", label: t("absent") },
          ]}
        />
        <BarChartCard
          title={t("groupComparison")}
          data={groupComparison}
          dataKeys={[{ key: "rate", color: "#3b82f6", label: t("attendanceRate") }]}
        />
      </div>

      {atRisk.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("atRiskStudents")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentName")}</TableHead>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("attendanceRate")}</TableHead>
                  <TableHead>{t("consecutiveAbsences")}</TableHead>
                  <TableHead>{t("lastSession")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRisk.map((s) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="font-medium">{s.studentName}</TableCell>
                    <TableCell>{s.groupName}</TableCell>
                    <TableCell>
                      <Badge variant={s.attendanceRate < 75 ? "destructive" : "secondary"}>
                        {s.attendanceRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>{s.consecutiveAbsences}</TableCell>
                    <TableCell>
                      {s.lastSessionDate
                        ? new Date(s.lastSessionDate).toLocaleDateString()
                        : t("na")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AlertConfigForm
        groupId={null}
        initialConfig={{
          consecutiveAbsenceThreshold: alertConfig.consecutiveAbsenceThreshold,
          attendanceRateThreshold: alertConfig.attendanceRateThreshold,
          notifyModerator: alertConfig.notifyModerator,
          notifyAdmin: alertConfig.notifyAdmin,
        }}
        isOverride={false}
        label={t("schoolDefault")}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/admin/attendance/page.tsx
git commit -m "feat(attendance): add admin attendance dashboard page"
```

---

### Task 10: Moderator Attendance Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/attendance/page.tsx`

- [ ] **Step 1: Create moderator attendance page**

Create `app/[locale]/(dashboard)/moderator/attendance/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getGroupAttendanceStats,
  getAttendanceByWeek,
  getStudentsAtRisk,
  getStudentAttendanceStats,
  getAlertConfig,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { QuickMarkForm } from "@/components/attendance/quick-mark-form";
import { AlertConfigForm } from "@/components/attendance/alert-config-form";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ModeratorAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");
  const sp = await searchParams;

  const profile = await db.moderatorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      groups: {
        where: { active: true },
        select: { id: true, name: true },
      },
    },
  });

  const groups = profile?.groups ?? [];
  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("noSessions")}</p>
      </div>
    );
  }

  const selectedGroupId = sp.group && groups.some((g) => g.id === sp.group)
    ? sp.group
    : groups[0].id;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId)!;

  const [stats, weeklyTrend, atRisk, alertConfig] = await Promise.all([
    getGroupAttendanceStats(selectedGroupId),
    getAttendanceByWeek("group", selectedGroupId),
    getStudentsAtRisk(selectedGroupId),
    getAlertConfig(selectedGroupId),
  ]);

  const recentSessions = await db.weeklySession.findMany({
    where: {
      groupId: selectedGroupId,
      status: { in: ["SCHEDULED", "OPEN"] },
    },
    orderBy: { date: "desc" },
    take: 5,
    select: { id: true, date: true, startTime: true },
  });

  const groupStudents = await db.groupStudent.findMany({
    where: { groupId: selectedGroupId },
    select: {
      student: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  const studentList = groupStudents.map((gs) => ({
    id: gs.student.id,
    name: gs.student.user.name ?? "—",
  }));

  const studentStats = await Promise.all(
    studentList.map(async (s) => {
      const stats = await getStudentAttendanceStats(s.id);
      const recent = await db.sessionStudent.findFirst({
        where: { studentId: s.id },
        orderBy: { session: { date: "desc" } },
        select: { attendance: true },
      });
      return {
        ...s,
        rate: stats.overallRate,
        consecutiveAbsences: stats.totalSessions - stats.attended,
        lastStatus: recent?.attendance ?? "PENDING",
      };
    })
  );

  const hasOverride = !!(await db.attendanceAlertConfig.findUnique({
    where: { groupId: selectedGroupId },
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <a key={g.id} href={`?group=${g.id}`}>
              <Badge
                variant={g.id === selectedGroupId ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("sessionsThisMonth")}
          value={stats.sessionsThisMonth}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("studentsAtRisk")}
          value={atRisk.length}
          colorClass="text-red-600"
        />
      </div>

      <QuickMarkForm
        sessions={recentSessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          startTime: s.startTime,
        }))}
        students={studentList}
      />

      <LineChartCard title={t("weeklyTrend")} data={weeklyTrend} color="#22c55e" />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("groupOverview")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("attendanceRate")}</TableHead>
                <TableHead>{t("lastSession")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentStats.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/moderator/attendance/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {s.rate != null ? (
                      <Badge variant={s.rate < 75 ? "destructive" : "secondary"}>
                        {s.rate}%
                      </Badge>
                    ) : (
                      t("na")
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(s.lastStatus.toLowerCase() === "excused_absence" ? "excusedAbsence" : s.lastStatus.toLowerCase())}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertConfigForm
        groupId={selectedGroupId}
        initialConfig={{
          consecutiveAbsenceThreshold: alertConfig.consecutiveAbsenceThreshold,
          attendanceRateThreshold: alertConfig.attendanceRateThreshold,
          notifyModerator: alertConfig.notifyModerator,
          notifyAdmin: alertConfig.notifyAdmin,
        }}
        isOverride={hasOverride}
        label={selectedGroup.name}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/attendance/page.tsx
git commit -m "feat(attendance): add moderator attendance page with quick-mark"
```

---

### Task 11: Moderator Student Attendance Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/attendance/[studentId]/page.tsx`

- [ ] **Step 1: Create student attendance detail page**

Create `app/[locale]/(dashboard)/moderator/attendance/[studentId]/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentAttendanceStats,
  getAttendanceByMonth,
  getStudentAttendanceLog,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function StudentAttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; studentId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, studentId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");
  const sp = await searchParams;
  const currentPage = sp.page ? parseInt(sp.page, 10) : 1;

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      user: { select: { name: true } },
      groups: {
        select: { group: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  const [stats, monthlyData, log] = await Promise.all([
    getStudentAttendanceStats(studentId),
    getAttendanceByMonth("student", studentId),
    getStudentAttendanceLog(studentId, currentPage),
  ]);

  const statusBadge: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    PRESENT: { variant: "default", label: t("present") },
    ABSENT: { variant: "destructive", label: t("absent") },
    LATE: { variant: "secondary", label: t("late") },
    EXCUSED_ABSENCE: { variant: "outline", label: t("excusedAbsence") },
    PENDING: { variant: "outline", label: t("pending") },
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/moderator/attendance`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("groupOverview")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{student.user.name}</h1>
        {student.groups[0] && (
          <p className="text-sm text-muted-foreground">
            {student.groups[0].group.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("consecutiveDays", { count: stats.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("consecutiveDays", { count: stats.longestStreak })}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={t("sessionsAttended")}
          value={`${stats.attended} / ${stats.totalSessions}`}
          colorClass="text-amber-600"
        />
      </div>

      <StackedBarChartCard
        title={t("monthlyBreakdown")}
        data={monthlyData}
        layers={[
          { key: "present", color: "#22c55e", label: t("present") },
          { key: "late", color: "#eab308", label: t("late") },
          { key: "excused", color: "#3b82f6", label: t("excusedAbsence") },
          { key: "absent", color: "#ef4444", label: t("absent") },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("sessionLog")}</h2>
        {log.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("sessionTime")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.records.map((r, i) => {
                    const badge = statusBadge[r.attendance] ?? statusBadge.PENDING;
                    return (
                      <TableRow key={i}>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.startTime ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {log.pages > 1 && (
              <div className="flex items-center justify-between pt-3">
                {currentPage > 1 ? (
                  <Link href={`?page=${currentPage - 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {log.pages}
                </span>
                {currentPage < log.pages ? (
                  <Link href={`?page=${currentPage + 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/attendance/\[studentId\]/page.tsx
git commit -m "feat(attendance): add moderator student attendance detail page"
```

---

### Task 12: Student Attendance Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/attendance/page.tsx`

- [ ] **Step 1: Create student attendance page**

Create `app/[locale]/(dashboard)/student/attendance/page.tsx`:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import {
  getStudentAttendanceStats,
  getAttendanceByMonth,
  getStudentAttendanceLog,
} from "@/server/services/attendance";
import { StatsCard } from "@/components/charts/stats-card";
import { StackedBarChartCard } from "@/components/charts/stacked-bar-chart-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function StudentAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("attendance_management");
  if (!enabled) notFound();

  const t = await getTranslations("attendance");
  const sp = await searchParams;
  const currentPage = sp.page ? parseInt(sp.page, 10) : 1;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) notFound();

  const [stats, monthlyData, log] = await Promise.all([
    getStudentAttendanceStats(profile.id),
    getAttendanceByMonth("student", profile.id),
    getStudentAttendanceLog(profile.id, currentPage),
  ]);

  const statusBadge: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    PRESENT: { variant: "default", label: t("present") },
    ABSENT: { variant: "destructive", label: t("absent") },
    LATE: { variant: "secondary", label: t("late") },
    EXCUSED_ABSENCE: { variant: "outline", label: t("excusedAbsence") },
    PENDING: { variant: "outline", label: t("pending") },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("myAttendance")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("overallRate")}
          value={stats.overallRate != null ? `${stats.overallRate}%` : t("na")}
          colorClass="text-green-600"
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("consecutiveDays", { count: stats.currentStreak })}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={t("longestStreak")}
          value={t("consecutiveDays", { count: stats.longestStreak })}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={t("sessionsAttended")}
          value={`${stats.attended} / ${stats.totalSessions}`}
          colorClass="text-amber-600"
        />
      </div>

      <StackedBarChartCard
        title={t("monthlyBreakdown")}
        data={monthlyData}
        layers={[
          { key: "present", color: "#22c55e", label: t("present") },
          { key: "late", color: "#eab308", label: t("late") },
          { key: "excused", color: "#3b82f6", label: t("excusedAbsence") },
          { key: "absent", color: "#ef4444", label: t("absent") },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("sessionLog")}</h2>
        {log.records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("sessionTime")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.records.map((r, i) => {
                    const badge = statusBadge[r.attendance] ?? statusBadge.PENDING;
                    return (
                      <TableRow key={i}>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                        <TableCell>{r.startTime ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {log.pages > 1 && (
              <div className="flex items-center justify-between pt-3">
                {currentPage > 1 ? (
                  <Link href={`?page=${currentPage - 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {log.pages}
                </span>
                {currentPage < log.pages ? (
                  <Link href={`?page=${currentPage + 1}`}>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/attendance/page.tsx
git commit -m "feat(attendance): add student attendance page"
```

---

### Task 13: Build Verification & Docker Rebuild

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compilation check**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 2: Run Next.js build**

Run:
```bash
npx next build
```

Expected: Build succeeds with all new pages compiled.

- [ ] **Step 3: Rebuild Docker and verify**

Run:
```bash
docker-compose build --no-cache app && docker-compose up -d --force-recreate app
```

Wait for ready, then:
```bash
docker logs yusr-app-1 2>&1 | tail -5
```

Expected: "Ready in 0ms", seed output includes "Seeded default attendance alert config".

- [ ] **Step 4: Verify feature flag is enabled**

Run:
```bash
docker exec yusr-app-1 node -e "
  const { PrismaClient } = require('./node_modules/.prisma/client');
  const db = new PrismaClient();
  db.featureFlag.findUnique({ where: { key: 'attendance_management' } }).then(f => { console.log(f); db.\$disconnect(); });
"
```

Expected: `{ key: 'attendance_management', enabled: true, ... }`
