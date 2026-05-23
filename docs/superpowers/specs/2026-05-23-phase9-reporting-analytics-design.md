# Phase 9: Reporting & Analytics — Design Spec

## Overview

Phase 9 enriches the existing admin, moderator, and student dashboard pages with charts and KPIs. Admin gets the deepest analytics (org-wide), moderator sees group-level stats, students see personal progress. All data is computed on-the-fly from existing Prisma models — no new database tables. Recharts is used for all visualizations. Feature-flagged behind `analytics`.

## Existing State

| Component | Status |
|-----------|--------|
| Admin dashboard | 4 KPI cards (pending, students, moderators, enrollment) + announcements |
| Moderator dashboard | Group cards with student counts + announcements |
| Student dashboard | Profile info (level, class, group, moderator) + assignment tracker + announcements |
| Charting library | None installed |
| Analytics service | None |
| Feature flag | `analytics` — must be created (disabled) |
| Prisma models | All data models exist: SessionStudent, WeeklySession, MemorizationReview, StudentMemorizationPlan, ExamSubmission, ExamInstance |

---

## 1. Charting Library

**Library:** `recharts` (latest stable)

Recharts is React-native, declarative, and supports RTL layouts. It covers all needed chart types: `BarChart`, `LineChart`, `PieChart`, `ResponsiveContainer`.

Since Recharts components use React hooks and DOM APIs, all chart components must be client components (`"use client"`). The dashboard pages remain server components — they fetch data server-side and pass it as props to client chart components.

---

## 2. Chart Components

Reusable wrapper components in `components/charts/`. Each is a `"use client"` component that accepts typed data arrays and renders a Recharts chart inside a `Card`.

### `components/charts/stats-card.tsx`

KPI card with a large number, label, and optional trend indicator. Not a chart — just a styled card for consistency.

Props:
- `title: string` — KPI label
- `value: string | number` — KPI value
- `colorClass?: string` — Tailwind color class for the value (default: text-foreground)

### `components/charts/bar-chart-card.tsx`

Bar chart inside a Card. Used for attendance trend, group comparison.

Props:
- `title: string` — chart title
- `data: { label: string; [key: string]: string | number }[]` — data points
- `dataKeys: { key: string; color: string; label: string }[]` — bar definitions
- `xAxisKey?: string` — key for x-axis labels (default: "label")

### `components/charts/line-chart-card.tsx`

Line chart inside a Card. Used for grade trends.

Props:
- `title: string` — chart title
- `data: { label: string; value: number }[]` — data points
- `color?: string` — line color (default: blue)
- `yAxisLabel?: string` — y-axis label

### `components/charts/progress-list-card.tsx`

List of labeled progress bars inside a Card. Used for memorization progress by group.

Props:
- `title: string` — card title
- `items: { label: string; value: number; max: number }[]` — progress items

### `components/charts/distribution-chart-card.tsx`

Histogram/bar chart for score distribution. Used for exam score distribution.

Props:
- `title: string` — chart title
- `data: { range: string; count: number }[]` — bucket data
- `color?: string` — bar color

---

## 3. Analytics Service

### `server/services/analytics.ts`

All analytics query functions. Each returns typed data ready for chart components. All queries use Prisma aggregations (`groupBy`, `count`, `aggregate`, `_avg`, `_count`).

### Admin Functions

**`getAdminKPIs()`**
Returns: `{ activeStudents, avgAttendance, avgSessionGrade, examPassRate, pendingRegistrations }`

- `activeStudents`: `db.user.count({ where: { role: { name: "student" }, accountStatus: "ACTIVE" } })`
- `avgAttendance`: Percentage of PRESENT attendance in SessionStudent records from last 30 days
- `avgSessionGrade`: Average `numericGrade` from SessionStudent records from last 30 days (where grade is not null)
- `examPassRate`: Percentage of ExamSubmission records with `passed === true` out of all GRADED submissions
- `pendingRegistrations`: `db.enrollmentApplication.count({ where: { registrationStatus: "PENDING_REVIEW" } })`

**`getAttendanceTrend(weeks: number = 8)`**
Returns: `{ label: string; rate: number }[]`

Groups SessionStudent records by week (using session.date), calculates attendance rate (PRESENT / total) per week. Returns last N weeks with week label (e.g. "May 12").

**`getExamScoreDistribution()`**
Returns: `{ range: string; count: number }[]`

Buckets GRADED ExamSubmission records by totalScore into 10 ranges: 0-10%, 10-20%, ..., 90-100%. Returns count per bucket.

**`getMemorizationProgressByGroup()`**
Returns: `{ label: string; value: number; max: number }[]`

For each group that has memorization plans, returns the average `grade` from the most recent MemorizationReview per student, grouped by group. Value is 0-100 (grade scale), max is always 100.

**`getGroupComparison()`**
Returns: `{ label: string; attendance: number; memorization: number; exams: number }[]`

For each group, calculates:
- `attendance`: Average attendance rate (last 30 days)
- `memorization`: Average latest review grade
- `exams`: Average exam score (GRADED submissions)

### Moderator Functions

**`getModeratorKPIs(userId: string)`**
Returns: `{ attendanceRate, avgGrade, pendingGradings }`

Scoped to groups where the moderator is assigned.

- `attendanceRate`: Attendance rate for moderator's groups (last 30 days)
- `avgGrade`: Average numericGrade for moderator's groups (last 30 days)
- `pendingGradings`: Count of ExamSubmission records with status SUBMITTED for moderator's group instances

**`getStudentAttendanceGrid(userId: string, weeks: number = 8)`**
Returns: `{ studentName: string; weeks: { label: string; status: "present" | "absent" | "late" | "excused" | "none" }[] }[]`

For each student in the moderator's groups, returns attendance status per week over the last N weeks. Used to render a colored grid/table.

**`getSessionGradeTrend(userId: string, weeks: number = 8)`**
Returns: `{ label: string; value: number }[]`

Average numericGrade per session over last N weeks for moderator's groups.

### Student Functions

**`getStudentKPIs(studentProfileId: string)`**
Returns: `{ memorizationProgress, avgExamScore, attendanceStreak }`

- `memorizationProgress`: Average grade from the student's MemorizationReview records (scale 0-100). If the student has an active plan but no reviews yet, returns 0. If no active plan, returns null.
- `avgExamScore`: Average `totalScore` from GRADED ExamSubmission records for this student.
- `attendanceStreak`: Count of consecutive PRESENT SessionStudent records from most recent session backwards.

**`getStudentGradeHistory(studentProfileId: string)`**
Returns: `{ label: string; value: number }[]`

`numericGrade` from SessionStudent records ordered by session date, last 12 sessions.

**`getStudentMemorizationProgress(studentProfileId: string)`**
Returns: `{ label: string; grade: number; date: string }[]`

Grade from MemorizationReview records ordered by reviewDate, last 12 reviews.

---

## 4. Admin Dashboard

### Page: `/admin/dashboard` (enhanced)

Replace the current 4-card layout. New layout:

**KPI Row (5 cards across the top):**
| Card | Value | Color |
|------|-------|-------|
| Active Students | count | blue |
| Avg Attendance | percentage | green |
| Avg Session Grade | percentage | amber |
| Exam Pass Rate | percentage | purple |
| Pending Registrations | count | rose |

**Chart Grid (2x2 below KPIs):**
| Position | Chart | Type |
|----------|-------|------|
| Top-left | Attendance Trend (8 weeks) | BarChartCard |
| Top-right | Exam Score Distribution | DistributionChartCard |
| Bottom-left | Memorization Progress by Group | ProgressListCard |
| Bottom-right | Group Comparison | BarChartCard (grouped) |

**Announcements** remain above the KPI row (existing behavior preserved).

**Analytics section is conditionally rendered:** Only shown when the `analytics` feature flag is enabled. If disabled, the page falls back to the current 4-card layout. This means the existing KPI cards (pending, students, moderators, enrollment) are kept as the fallback — the new layout replaces them when analytics is on.

---

## 5. Moderator Dashboard

### Page: `/moderator/dashboard` (enhanced)

Keep existing group cards. Add analytics section above them (when feature flag is on).

**KPI Row (3 cards):**
| Card | Value | Color |
|------|-------|-------|
| Attendance Rate | percentage | green |
| Avg Session Grade | percentage | amber |
| Pending Exam Gradings | count | blue |

**Charts (stacked, full-width):**
| Order | Chart | Type |
|-------|-------|------|
| 1 | Student Attendance Grid (8 weeks) | Custom table with colored cells |
| 2 | Session Grade Trend (8 weeks) | LineChartCard |

The student attendance grid is a custom component (not a Recharts chart) — a table with student names as rows and weeks as columns, cells colored by attendance status (green=present, red=absent, yellow=late, gray=excused, empty=no session).

**Existing group cards** remain below the charts.

---

## 6. Student Dashboard

### Page: `/student/dashboard` (enhanced)

Keep existing profile cards. Add analytics section below them (when feature flag is on).

**KPI Row (3 cards, replaces the existing level/class/group/moderator cards):**

The existing 5 cards (level, class, group, moderator, assignments completed) are reorganized:
- Keep level, class, group, moderator as a compact info line (not cards)
- Replace with 3 analytics KPI cards:

| Card | Value | Color |
|------|-------|-------|
| Memorization Progress | percentage | green |
| Avg Exam Score | percentage | purple |
| Attendance Streak | count + "sessions" | blue |

**Charts (stacked, full-width):**
| Order | Chart | Type |
|-------|-------|------|
| 1 | Grade History (12 sessions) | LineChartCard |
| 2 | Memorization Review Grades (12 reviews) | LineChartCard |

**Existing announcements and assignment tracker** remain.

---

## 7. Feature Flag

| Flag | State | Gates |
|------|-------|-------|
| `analytics` | Disabled (enabled during rollout) | Analytics sections on all 3 dashboards |

When disabled, dashboards render their current (pre-Phase 9) layout unchanged. The check uses `isFeatureEnabled("analytics")` in each dashboard page.

---

## 8. Permissions

No new permissions required. Dashboard pages are already role-gated:
- Admin dashboard requires admin role (existing)
- Moderator dashboard requires moderator role (existing)
- Student dashboard requires approved student (existing)

Analytics data follows existing access patterns — admin sees all, moderator sees own groups, student sees own data. The analytics service functions enforce this by accepting userId/studentProfileId parameters.

---

## 9. i18n

New `analytics` namespace in `messages/en.json` and `messages/ar.json` with ~35 keys:

**KPI labels:** `activeStudents`, `avgAttendance`, `avgSessionGrade`, `examPassRate`, `pendingRegistrations`, `attendanceRate`, `pendingGradings`, `memorizationProgress`, `avgExamScore`, `attendanceStreak`, `sessions`

**Chart titles:** `attendanceTrend`, `examScoreDistribution`, `memorizationByGroup`, `groupComparison`, `studentAttendance`, `sessionGradeTrend`, `gradeHistory`, `memorizationReviews`

**Chart labels:** `attendance`, `memorization`, `exams`, `present`, `absent`, `late`, `excused`, `week`, `grade`, `score`, `noData`

**Legend/axis:** `rate`, `count`, `percentage`

---

## 10. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `server/services/analytics.ts` | All analytics query functions (admin, moderator, student) |
| `components/charts/stats-card.tsx` | KPI card component |
| `components/charts/bar-chart-card.tsx` | Recharts bar chart in a Card |
| `components/charts/line-chart-card.tsx` | Recharts line chart in a Card |
| `components/charts/progress-list-card.tsx` | Progress bars list in a Card |
| `components/charts/distribution-chart-card.tsx` | Histogram chart in a Card |
| `components/charts/attendance-grid.tsx` | Student attendance heatmap table |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `recharts` dependency |
| `app/[locale]/(dashboard)/admin/dashboard/page.tsx` | Add analytics KPIs and charts (conditional on feature flag) |
| `app/[locale]/(dashboard)/moderator/dashboard/page.tsx` | Add analytics KPIs, attendance grid, grade trend (conditional on feature flag) |
| `app/[locale]/(dashboard)/student/dashboard/page.tsx` | Add analytics KPIs and charts, reorganize profile info (conditional on feature flag) |
| `messages/en.json` | Add `analytics` namespace (~35 keys) |
| `messages/ar.json` | Add `analytics` namespace (~35 keys) |
| `prisma/seed.ts` | Seed `analytics` feature flag (disabled) |

---

## 11. Deferred to Phase 9.1

- **Date range picker** — filter analytics by custom period
- **CSV/PDF export** — download analytics data
- **Drill-down** — click chart element to see individual records
- **Comparative periods** — this month vs last month
- **Trend arrows** — KPI cards show up/down arrows compared to previous period
- **Caching layer** — cache expensive aggregation queries
