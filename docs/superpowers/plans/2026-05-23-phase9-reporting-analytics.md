# Phase 9: Reporting & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich admin, moderator, and student dashboards with KPI cards and Recharts-based charts, all gated behind an `analytics` feature flag.

**Architecture:** Server components fetch analytics data via a new `server/services/analytics.ts` service (Prisma aggregations, no new tables). Data is passed as props to `"use client"` chart wrapper components in `components/charts/`. Feature flag check in each dashboard page controls whether analytics section renders or the existing layout is shown as fallback.

**Tech Stack:** Next.js 16 App Router, Prisma 7.8 aggregations, Recharts, shadcn/ui Card, next-intl i18n, feature flags via `isFeatureEnabled()`.

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `components/charts/stats-card.tsx` | KPI card with large number + label |
| `components/charts/bar-chart-card.tsx` | Recharts BarChart in a Card |
| `components/charts/line-chart-card.tsx` | Recharts LineChart in a Card |
| `components/charts/progress-list-card.tsx` | Progress bars list in a Card |
| `components/charts/distribution-chart-card.tsx` | Histogram bar chart in a Card |
| `components/charts/attendance-grid.tsx` | Student attendance heatmap table |
| `server/services/analytics.ts` | All analytics query functions |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `recharts` dependency |
| `prisma/seed.ts` | Add `analytics` feature flag |
| `messages/en.json` | Add `analytics` namespace |
| `messages/ar.json` | Add `analytics` namespace |
| `app/[locale]/(dashboard)/admin/dashboard/page.tsx` | Conditional analytics layout |
| `app/[locale]/(dashboard)/moderator/dashboard/page.tsx` | Conditional analytics layout |
| `app/[locale]/(dashboard)/student/dashboard/page.tsx` | Conditional analytics layout |

---

### Task 1: Install Recharts and Seed Analytics Feature Flag

**Files:**
- Modify: `package.json`
- Modify: `prisma/seed.ts:68-89`

- [ ] **Step 1: Install recharts**

```bash
pnpm add recharts
```

- [ ] **Step 2: Add analytics feature flag to seed**

In `prisma/seed.ts`, add to the `flags` array inside `seedFeatureFlags()` (after the `memorization_plans` entry at line 80):

```typescript
    { key: "analytics", enabled: false, description: "Dashboard analytics and charts" },
```

The full flags array becomes:

```typescript
  const flags = [
    { key: "ai_recitation_review", enabled: false, description: "AI-powered recitation review" },
    { key: "student_audio_upload", enabled: false, description: "Student audio upload for recitation" },
    { key: "moderator_voice_notes", enabled: true, description: "Moderator voice note attachments" },
    { key: "exams", enabled: false, description: "Exam system" },
    { key: "leave_requests", enabled: true, description: "Student leave request system" },
    { key: "announcements", enabled: true, description: "Announcement system" },
    { key: "english_locale", enabled: true, description: "English language support" },
    { key: "email_notifications", enabled: false, description: "Email notification delivery" },
    { key: "support_tickets", enabled: false, description: "Support ticket system" },
    { key: "audio_playback_tracking", enabled: false, description: "Track actual audio playback" },
    { key: "memorization_plans", enabled: true, description: "Individual student memorization plan tracking" },
    { key: "analytics", enabled: false, description: "Dashboard analytics and charts" },
  ];
```

- [ ] **Step 3: Verify build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

Expected: Build succeeds (recharts is a client-side dependency, no SSR issues at this stage).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml prisma/seed.ts
git commit -m "chore: add recharts dependency and analytics feature flag seed"
```

---

### Task 2: Add i18n Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add analytics namespace to en.json**

Add a new top-level `"analytics"` key to `messages/en.json`. Place it after the last existing top-level key (before the closing `}`):

```json
  "analytics": {
    "activeStudents": "Active Students",
    "avgAttendance": "Avg Attendance",
    "avgSessionGrade": "Avg Session Grade",
    "examPassRate": "Exam Pass Rate",
    "pendingRegistrations": "Pending Registrations",
    "attendanceRate": "Attendance Rate",
    "pendingGradings": "Pending Exam Gradings",
    "memorizationProgress": "Memorization Progress",
    "avgExamScore": "Avg Exam Score",
    "attendanceStreak": "Attendance Streak",
    "sessions": "sessions",
    "attendanceTrend": "Attendance Trend",
    "examScoreDistribution": "Exam Score Distribution",
    "memorizationByGroup": "Memorization by Group",
    "groupComparison": "Group Comparison",
    "studentAttendance": "Student Attendance",
    "sessionGradeTrend": "Session Grade Trend",
    "gradeHistory": "Grade History",
    "memorizationReviews": "Memorization Reviews",
    "attendance": "Attendance",
    "memorization": "Memorization",
    "exams": "Exams",
    "present": "Present",
    "absent": "Absent",
    "late": "Late",
    "excused": "Excused",
    "week": "Week",
    "grade": "Grade",
    "score": "Score",
    "noData": "No data available",
    "rate": "Rate",
    "count": "Count",
    "percentage": "%"
  }
```

- [ ] **Step 2: Add analytics namespace to ar.json**

Add the same structure to `messages/ar.json`:

```json
  "analytics": {
    "activeStudents": "الطلاب النشطون",
    "avgAttendance": "متوسط الحضور",
    "avgSessionGrade": "متوسط درجة الحلقة",
    "examPassRate": "نسبة النجاح",
    "pendingRegistrations": "طلبات معلقة",
    "attendanceRate": "نسبة الحضور",
    "pendingGradings": "اختبارات بانتظار التصحيح",
    "memorizationProgress": "تقدم الحفظ",
    "avgExamScore": "متوسط درجة الاختبار",
    "attendanceStreak": "سلسلة الحضور",
    "sessions": "حلقات",
    "attendanceTrend": "اتجاه الحضور",
    "examScoreDistribution": "توزيع درجات الاختبارات",
    "memorizationByGroup": "الحفظ حسب المجموعة",
    "groupComparison": "مقارنة المجموعات",
    "studentAttendance": "حضور الطلاب",
    "sessionGradeTrend": "اتجاه درجات الحلقات",
    "gradeHistory": "سجل الدرجات",
    "memorizationReviews": "مراجعات الحفظ",
    "attendance": "الحضور",
    "memorization": "الحفظ",
    "exams": "الاختبارات",
    "present": "حاضر",
    "absent": "غائب",
    "late": "متأخر",
    "excused": "معذور",
    "week": "أسبوع",
    "grade": "الدرجة",
    "score": "النتيجة",
    "noData": "لا توجد بيانات",
    "rate": "المعدل",
    "count": "العدد",
    "percentage": "٪"
  }
```

- [ ] **Step 3: Verify JSON validity**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ar.json','utf8')); console.log('ar.json OK')"
```

Expected: Both print OK.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): add analytics namespace for Phase 9 dashboards"
```

---

### Task 3: Create StatsCard Component

**Files:**
- Create: `components/charts/stats-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  colorClass?: string;
}

export function StatsCard({ title, value, colorClass = "text-foreground" }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/stats-card.tsx
git commit -m "feat(charts): add StatsCard KPI component"
```

---

### Task 4: Create BarChartCard Component

**Files:**
- Create: `components/charts/bar-chart-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
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

interface DataKey {
  key: string;
  color: string;
  label: string;
}

interface BarChartCardProps {
  title: string;
  data: Record<string, string | number>[];
  dataKeys: DataKey[];
  xAxisKey?: string;
}

export function BarChartCard({
  title,
  data,
  dataKeys,
  xAxisKey = "label",
}: BarChartCardProps) {
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
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {dataKeys.length > 1 && (
              <Legend wrapperStyle={{ fontSize: 12 }} />
            )}
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                fill={dk.color}
                name={dk.label}
                radius={[4, 4, 0, 0]}
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
git add components/charts/bar-chart-card.tsx
git commit -m "feat(charts): add BarChartCard component"
```

---

### Task 5: Create LineChartCard Component

**Files:**
- Create: `components/charts/line-chart-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineChartCardProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  yAxisLabel?: string;
}

export function LineChartCard({
  title,
  data,
  color = "#3b82f6",
  yAxisLabel,
}: LineChartCardProps) {
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
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 12 } }
                  : undefined
              }
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/line-chart-card.tsx
git commit -m "feat(charts): add LineChartCard component"
```

---

### Task 6: Create ProgressListCard Component

**Files:**
- Create: `components/charts/progress-list-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressItem {
  label: string;
  value: number;
  max: number;
}

interface ProgressListCardProps {
  title: string;
  items: ProgressItem[];
}

export function ProgressListCard({ title, items }: ProgressListCardProps) {
  if (items.length === 0) {
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
      <CardContent className="space-y-4">
        {items.map((item) => {
          const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${pct >= 60 ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/progress-list-card.tsx
git commit -m "feat(charts): add ProgressListCard component"
```

---

### Task 7: Create DistributionChartCard Component

**Files:**
- Create: `components/charts/distribution-chart-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DistributionChartCardProps {
  title: string;
  data: { range: string; count: number }[];
  color?: string;
}

export function DistributionChartCard({
  title,
  data,
  color = "#a855f7",
}: DistributionChartCardProps) {
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
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/distribution-chart-card.tsx
git commit -m "feat(charts): add DistributionChartCard component"
```

---

### Task 8: Create AttendanceGrid Component

**Files:**
- Create: `components/charts/attendance-grid.tsx`

- [ ] **Step 1: Create the component**

This is a custom table (not Recharts) showing students as rows and weeks as columns with colored cells for attendance status.

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CellStatus = "present" | "absent" | "late" | "excused" | "none";

interface AttendanceRow {
  studentName: string;
  weeks: { label: string; status: CellStatus }[];
}

interface AttendanceGridProps {
  title: string;
  rows: AttendanceRow[];
  statusLabels: Record<CellStatus, string>;
}

const statusColors: Record<CellStatus, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-yellow-500",
  excused: "bg-gray-400",
  none: "bg-muted",
};

export function AttendanceGrid({ title, rows, statusLabels }: AttendanceGridProps) {
  if (rows.length === 0) {
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

  const weekLabels = rows[0].weeks.map((w) => w.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-start py-2 pe-4 font-medium text-muted-foreground" />
                {weekLabels.map((wl) => (
                  <th
                    key={wl}
                    className="py-2 px-2 text-center font-medium text-muted-foreground text-xs"
                  >
                    {wl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentName} className="border-t border-muted">
                  <td className="py-2 pe-4 whitespace-nowrap">{row.studentName}</td>
                  {row.weeks.map((cell, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      <div
                        className={`mx-auto h-4 w-4 rounded-sm ${statusColors[cell.status]}`}
                        title={statusLabels[cell.status]}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          {(["present", "absent", "late", "excused"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm ${statusColors[s]}`} />
              {statusLabels[s]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/charts/attendance-grid.tsx
git commit -m "feat(charts): add AttendanceGrid heatmap component"
```

---

### Task 9: Create Analytics Service — Admin Functions

**Files:**
- Create: `server/services/analytics.ts`

This task creates the service file with the 5 admin analytics functions. Moderator and student functions are added in Tasks 10 and 11.

- [ ] **Step 1: Create the service with admin functions**

```typescript
import { db } from "@/server/db/client";

// ============================================================
// Admin Analytics
// ============================================================

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

  return {
    activeStudents,
    avgAttendance,
    avgSessionGrade,
    examPassRate,
    pendingRegistrations,
  };
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
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit server/services/analytics.ts 2>&1 | head -20
```

If tsc cannot run standalone, use the build check:

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add server/services/analytics.ts
git commit -m "feat(analytics): add admin analytics service functions"
```

---

### Task 10: Analytics Service — Moderator Functions

**Files:**
- Modify: `server/services/analytics.ts`

Append moderator analytics functions to the existing file.

- [ ] **Step 1: Add moderator functions**

Append the following to `server/services/analytics.ts`:

```typescript
// ============================================================
// Moderator Analytics
// ============================================================

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

export async function getStudentAttendanceGrid(
  userId: string,
  weeks: number = 8
) {
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

export async function getSessionGradeTrend(
  userId: string,
  weeks: number = 8
) {
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
```

- [ ] **Step 2: Commit**

```bash
git add server/services/analytics.ts
git commit -m "feat(analytics): add moderator analytics service functions"
```

---

### Task 11: Analytics Service — Student Functions

**Files:**
- Modify: `server/services/analytics.ts`

Append student analytics functions to the existing file.

- [ ] **Step 1: Add student functions**

Append the following to `server/services/analytics.ts`:

```typescript
// ============================================================
// Student Analytics
// ============================================================

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
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/services/analytics.ts
git commit -m "feat(analytics): add student analytics service functions"
```

---

### Task 12: Enhance Admin Dashboard

**Files:**
- Modify: `app/[locale]/(dashboard)/admin/dashboard/page.tsx`

Replace the entire file. The new version conditionally renders analytics KPIs + charts when `analytics` feature flag is enabled, or falls back to the existing 4-card layout.

- [ ] **Step 1: Replace the admin dashboard page**

Replace the full contents of `app/[locale]/(dashboard)/admin/dashboard/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getAdminKPIs,
  getAttendanceTrend,
  getExamScoreDistribution,
  getMemorizationProgressByGroup,
  getGroupComparison,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { DistributionChartCard } from "@/components/charts/distribution-chart-card";
import { ProgressListCard } from "@/components/charts/progress-list-card";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("admin.dashboard");
  const analyticsEnabled = await isFeatureEnabled("analytics");

  const announcements = await getActiveAnnouncementsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-50"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      {analyticsEnabled ? (
        <AdminAnalytics />
      ) : (
        <AdminFallbackCards />
      )}
    </div>
  );
}

async function AdminAnalytics() {
  const at = await getTranslations("analytics");

  const [kpis, attendanceTrend, scoreDistribution, memProgress, groupComparison] =
    await Promise.all([
      getAdminKPIs(),
      getAttendanceTrend(),
      getExamScoreDistribution(),
      getMemorizationProgressByGroup(),
      getGroupComparison(),
    ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={at("activeStudents")}
          value={kpis.activeStudents}
          colorClass="text-blue-600"
        />
        <StatsCard
          title={at("avgAttendance")}
          value={`${kpis.avgAttendance}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={at("avgSessionGrade")}
          value={`${kpis.avgSessionGrade}%`}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={at("examPassRate")}
          value={`${kpis.examPassRate}%`}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={at("pendingRegistrations")}
          value={kpis.pendingRegistrations}
          colorClass="text-rose-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={at("attendanceTrend")}
          data={attendanceTrend}
          dataKeys={[{ key: "rate", color: "#3b82f6", label: at("rate") }]}
          xAxisKey="label"
        />
        <DistributionChartCard
          title={at("examScoreDistribution")}
          data={scoreDistribution}
        />
        <ProgressListCard
          title={at("memorizationByGroup")}
          items={memProgress}
        />
        <BarChartCard
          title={at("groupComparison")}
          data={groupComparison}
          dataKeys={[
            { key: "attendance", color: "#3b82f6", label: at("attendance") },
            { key: "memorization", color: "#22c55e", label: at("memorization") },
            { key: "exams", color: "#a855f7", label: at("exams") },
          ]}
        />
      </div>
    </>
  );
}

async function AdminFallbackCards() {
  const t = await getTranslations("admin.dashboard");

  const [pendingCount, activeStudents, activeModerators, enrollmentSetting] =
    await Promise.all([
      db.enrollmentApplication.count({
        where: { registrationStatus: "PENDING_REVIEW" },
      }),
      db.user.count({
        where: {
          role: { name: "student" },
          accountStatus: "ACTIVE",
        },
      }),
      db.user.count({
        where: {
          role: { name: "moderator" },
          accountStatus: "ACTIVE",
        },
      }),
      db.systemSetting.findUnique({ where: { key: "enrollment_state" } }),
    ]);

  const cards = [
    { title: t("pendingRegistrations"), value: pendingCount },
    { title: t("activeStudents"), value: activeStudents },
    { title: t("activeModerators"), value: activeModerators },
    { title: t("enrollmentStatus"), value: enrollmentSetting?.value ?? "closed" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(dashboard)/admin/dashboard/page.tsx
git commit -m "feat(admin): add analytics KPIs and charts to dashboard"
```

---

### Task 13: Enhance Moderator Dashboard

**Files:**
- Modify: `app/[locale]/(dashboard)/moderator/dashboard/page.tsx`

Replace the entire file. Analytics section with KPIs, attendance grid, and grade trend chart is conditionally rendered above existing group cards.

- [ ] **Step 1: Replace the moderator dashboard page**

Replace the full contents of `app/[locale]/(dashboard)/moderator/dashboard/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorGroups } from "@/server/services/organization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getModeratorKPIs,
  getStudentAttendanceGrid,
  getSessionGradeTrend,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { AttendanceGrid } from "@/components/charts/attendance-grid";
import { LineChartCard } from "@/components/charts/line-chart-card";

export default async function ModeratorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("moderator.dashboard");
  const analyticsEnabled = await isFeatureEnabled("analytics");

  const groups = await getModeratorGroups(session.user.id);
  const announcements = await getActiveAnnouncementsForUser(session.user.id);
  const totalStudents = groups.reduce((sum, g) => sum + g._count.students, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-50"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroups")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {analyticsEnabled && (
            <ModeratorAnalytics userId={session.user.id} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("myGroups")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{groups.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("totalStudents")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{group.class.name} — {group.class.level.nameAr}</p>
                  <p>
                    {t("totalStudents")}: {group._count.students}
                  </p>
                  {group.weeklyDay && (
                    <p>
                      {group.weeklyDay} {group.weeklyTime ? `• ${group.weeklyTime}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function ModeratorAnalytics({ userId }: { userId: string }) {
  const at = await getTranslations("analytics");

  const [kpis, attendanceGrid, gradeTrend] = await Promise.all([
    getModeratorKPIs(userId),
    getStudentAttendanceGrid(userId),
    getSessionGradeTrend(userId),
  ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title={at("attendanceRate")}
          value={`${kpis.attendanceRate}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title={at("avgSessionGrade")}
          value={`${kpis.avgGrade}%`}
          colorClass="text-amber-600"
        />
        <StatsCard
          title={at("pendingGradings")}
          value={kpis.pendingGradings}
          colorClass="text-blue-600"
        />
      </div>

      <AttendanceGrid
        title={at("studentAttendance")}
        rows={attendanceGrid}
        statusLabels={{
          present: at("present"),
          absent: at("absent"),
          late: at("late"),
          excused: at("excused"),
          none: "—",
        }}
      />

      <LineChartCard
        title={at("sessionGradeTrend")}
        data={gradeTrend}
        color="#f59e0b"
        yAxisLabel={at("grade")}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(dashboard)/moderator/dashboard/page.tsx
git commit -m "feat(moderator): add analytics KPIs, attendance grid, and grade trend to dashboard"
```

---

### Task 14: Enhance Student Dashboard

**Files:**
- Modify: `app/[locale]/(dashboard)/student/dashboard/page.tsx`

Replace the entire file. When analytics flag is enabled: show compact info line for level/class/group/moderator, then 3 KPI cards, then 2 line charts. When disabled: existing card layout unchanged.

- [ ] **Step 1: Replace the student dashboard page**

Replace the full contents of `app/[locale]/(dashboard)/student/dashboard/page.tsx`:

```tsx
import { db } from "@/server/db/client";
import { auth } from "@/server/auth/config";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getStudentEligibility } from "@/server/services/assignment";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  getStudentKPIs,
  getStudentGradeHistory,
  getStudentMemorizationProgress,
} from "@/server/services/analytics";
import { StatsCard } from "@/components/charts/stats-card";
import { LineChartCard } from "@/components/charts/line-chart-card";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("student.dashboard");

  const application = await db.enrollmentApplication.findUnique({
    where: { userId: session.user.id },
  });

  if (!application || application.registrationStatus !== "APPROVED") {
    const regT = await getTranslations("registration");
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold">{regT("pendingReview")}</h2>
            <p className="mt-2 text-muted-foreground">
              {regT("pendingReviewDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analyticsEnabled = await isFeatureEnabled("analytics");
  const announcements = await getActiveAnnouncementsForUser(session.user.id);

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      groupStudents: {
        include: {
          group: {
            include: {
              class: {
                include: {
                  level: true,
                },
              },
              moderator: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const groupAssignment = studentProfile?.groupStudents[0];
  const eligibility = await getStudentEligibility(session.user.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {announcements.length > 0 && (
        <div className="space-y-2 mb-6">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${
                ann.priority === "urgent"
                  ? "border-red-300 bg-red-50"
                  : ann.priority === "high"
                    ? "border-amber-300 bg-amber-50"
                    : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{ann.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      {!groupAssignment ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("noGroupAssigned")}</p>
          </CardContent>
        </Card>
      ) : analyticsEnabled ? (
        <StudentAnalytics
          studentProfileId={studentProfile!.id}
          groupAssignment={groupAssignment}
          eligibility={eligibility}
          locale={locale}
          t={{
            myLevel: t("myLevel"),
            myClass: t("myClass"),
            myGroup: t("myGroup"),
            myModerator: t("myModerator"),
          }}
        />
      ) : (
        <StudentFallbackCards
          groupAssignment={groupAssignment}
          eligibility={eligibility}
          locale={locale}
          t={{
            myLevel: t("myLevel"),
            myClass: t("myClass"),
            myGroup: t("myGroup"),
            myModerator: t("myModerator"),
          }}
        />
      )}
    </div>
  );
}

async function StudentAnalytics({
  studentProfileId,
  groupAssignment,
  eligibility,
  locale,
  t,
}: {
  studentProfileId: string;
  groupAssignment: {
    group: {
      name: string;
      class: { name: string; level: { nameAr: string; nameEn?: string | null } };
      moderator: { user: { name: string | null } } | null;
    };
  };
  eligibility: { completed: number; total: number; eligible: boolean };
  locale: string;
  t: { myLevel: string; myClass: string; myGroup: string; myModerator: string };
}) {
  const at = await getTranslations("analytics");

  const [kpis, gradeHistory, memProgress] = await Promise.all([
    getStudentKPIs(studentProfileId),
    getStudentGradeHistory(studentProfileId),
    getStudentMemorizationProgress(studentProfileId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          <strong>{t.myLevel}:</strong> {groupAssignment.group.class.level.nameAr}
        </span>
        <span>
          <strong>{t.myClass}:</strong> {groupAssignment.group.class.name}
        </span>
        <span>
          <strong>{t.myGroup}:</strong> {groupAssignment.group.name}
        </span>
        <span>
          <strong>{t.myModerator}:</strong>{" "}
          {groupAssignment.group.moderator?.user?.name ?? "—"}
        </span>
        <span>
          <strong>{locale === "ar" ? "الواجبات" : "Assignments"}:</strong>{" "}
          <span className={eligibility.eligible ? "text-green-600" : "text-yellow-600"}>
            {eligibility.completed}/{eligibility.total}
          </span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.memorizationProgress !== null && (
          <StatsCard
            title={at("memorizationProgress")}
            value={`${kpis.memorizationProgress}%`}
            colorClass="text-green-600"
          />
        )}
        <StatsCard
          title={at("avgExamScore")}
          value={`${kpis.avgExamScore}%`}
          colorClass="text-purple-600"
        />
        <StatsCard
          title={at("attendanceStreak")}
          value={`${kpis.attendanceStreak} ${at("sessions")}`}
          colorClass="text-blue-600"
        />
      </div>

      <LineChartCard
        title={at("gradeHistory")}
        data={gradeHistory}
        color="#3b82f6"
        yAxisLabel={at("grade")}
      />

      {memProgress.length > 0 && (
        <LineChartCard
          title={at("memorizationReviews")}
          data={memProgress}
          color="#22c55e"
          yAxisLabel={at("grade")}
        />
      )}
    </div>
  );
}

function StudentFallbackCards({
  groupAssignment,
  eligibility,
  locale,
  t,
}: {
  groupAssignment: {
    group: {
      name: string;
      class: { name: string; level: { nameAr: string; nameEn?: string | null } };
      moderator: { user: { name: string | null } } | null;
    };
  };
  eligibility: { completed: number; total: number; eligible: boolean };
  locale: string;
  t: { myLevel: string; myClass: string; myGroup: string; myModerator: string };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myLevel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.class.level.nameAr}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myClass}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.class.name}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myGroup}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.name}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t.myModerator}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {groupAssignment.group.moderator?.user?.name ?? "-"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {locale === "ar" ? "الواجبات المكتملة" : "Assignments Completed"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-lg font-semibold ${eligibility.eligible ? "text-green-600" : "text-yellow-600"}`}>
            {eligibility.completed}/{eligibility.total}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(dashboard)/student/dashboard/page.tsx
git commit -m "feat(student): add analytics KPIs and charts to dashboard"
```

---

### Task 15: Full Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors from the Phase 9 files. Pre-existing errors in `server/permissions/__tests__/check.test.ts` (12 errors) are not related to this work.

- [ ] **Step 2: Verify all chart components are importable**

```bash
grep -r "from.*components/charts" app/ --include="*.tsx" | head -20
```

Expected: Shows imports in all 3 dashboard pages.

- [ ] **Step 3: Verify analytics service exports**

```bash
grep "^export" server/services/analytics.ts
```

Expected: Shows all 10 exported functions:
- `getAdminKPIs`
- `getAttendanceTrend`
- `getExamScoreDistribution`
- `getMemorizationProgressByGroup`
- `getGroupComparison`
- `getModeratorKPIs`
- `getStudentAttendanceGrid`
- `getSessionGradeTrend`
- `getStudentKPIs`
- `getStudentGradeHistory`
- `getStudentMemorizationProgress`

- [ ] **Step 4: Verify i18n keys match usage**

```bash
grep -r 'at("' app/[locale]/\(dashboard\)/admin/dashboard/page.tsx app/[locale]/\(dashboard\)/moderator/dashboard/page.tsx app/[locale]/\(dashboard\)/student/dashboard/page.tsx | grep -oP 'at\("\K[^"]+' | sort -u
```

Expected: All keys exist in both `messages/en.json` and `messages/ar.json` under `analytics` namespace.

- [ ] **Step 5: Verify feature flag seed entry**

```bash
grep "analytics" prisma/seed.ts
```

Expected: Shows the analytics feature flag entry.
