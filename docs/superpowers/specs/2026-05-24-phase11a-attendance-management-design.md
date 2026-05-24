# Phase 11a: Attendance Management — Design Spec

## Goal

Add dedicated attendance tracking pages, configurable absence alert thresholds, and rich attendance reports for admin, moderator, and student roles. Builds on the existing `SessionStudent.attendance` field — no changes to how attendance data is recorded during session grading, but adds a quick-mark shortcut and a reporting/alerting layer on top.

## Background

Attendance is already tracked per session via the `SessionStudent` model with `AttendanceStatus` enum: `PENDING | PRESENT | ABSENT | EXCUSED_ABSENCE | LATE`. Moderators mark attendance during session grading (`/moderator/sessions/[id]`). Analytics service already computes an 8-week attendance trend for the admin dashboard.

What's missing: dedicated attendance pages, monthly/overall aggregations, per-student history, configurable absence alerts, and a quick-mark flow for moderators who just need to record attendance without full session grading.

## Data Model

### New: AttendanceAlertConfig

Stores alert thresholds. A `null` groupId means school-wide default. Per-group configs override the default.

```prisma
model AttendanceAlertConfig {
  id                           Int      @id @default(autoincrement())
  groupId                      Int?     @unique
  group                        Group?   @relation(fields: [groupId], references: [id])
  consecutiveAbsenceThreshold  Int      @default(3)
  attendanceRateThreshold      Int      @default(75)
  notifyModerator              Boolean  @default(true)
  notifyAdmin                  Boolean  @default(true)
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt
}
```

- `consecutiveAbsenceThreshold`: Number of consecutive ABSENT sessions before alert fires. Default 3.
- `attendanceRateThreshold`: Attendance percentage below which an alert fires. Default 75%.
- School-wide default: row where `groupId IS NULL`. Created by seed with defaults.
- Per-group override: moderator or admin creates a row with a specific `groupId`.

### Existing Models (no changes)

- `SessionStudent.attendance` — already stores per-session attendance status
- `WeeklySession` — session date/time for temporal queries
- `Notification` — used for alert delivery

## Feature Flag

Key: `attendance_management`. Seed default: `enabled: true`.

Sidebar nav entries for `/admin/attendance`, `/moderator/attendance`, `/student/attendance` gated by this flag.

## Service Layer

### server/services/attendance.ts

#### Query Functions

- `getSchoolAttendanceStats()` — school-wide: overall rate, total sessions, total students, breakdown by status
- `getGroupAttendanceStats(groupId)` — per-group: same metrics scoped to group
- `getStudentAttendanceStats(userId)` — per-student: overall rate, total sessions attended/missed, current streak (consecutive present), longest streak
- `getAttendanceByWeek(scope, id?, weeks?)` — weekly trend data (default 12 weeks). Scope: `school` | `group` | `student`.
- `getAttendanceByMonth(scope, id?, months?)` — monthly breakdown (default 6 months). Returns per-month counts of present/absent/late/excused.
- `getGroupComparison()` — admin only: attendance rate per group for comparison chart.
- `getStudentAttendanceLog(userId, page?, limit?)` — paginated session-by-session log with date, session info, and attendance status.
- `getStudentsAtRisk(groupId?)` — students who have crossed or are near crossing alert thresholds. Returns student info + consecutive absences + attendance rate.

#### Alert Functions

- `checkAttendanceAlerts(sessionId)` — called after attendance is marked. For each student in the session:
  1. Load applicable config (group-specific, falling back to school default)
  2. Count consecutive absences (query recent SessionStudent records ordered by session date desc)
  3. Calculate rolling attendance rate (all sessions for this student in this group)
  4. If consecutive absences >= threshold OR rate < threshold → create Notification for moderator and/or admin per config
  5. Notification type: `ATTENDANCE_ALERT`, title includes student name and specific trigger (e.g., "3 consecutive absences" or "attendance below 75%")

- `getAlertConfig(groupId?)` — get config for a group (or school default if no group-specific config exists)
- `upsertAlertConfig(groupId, data)` — create or update config. Admin can set school default (groupId=null), moderator can set per-group.

### server/actions/attendance.ts

Server actions for:
- `markQuickAttendance(sessionId, records: { studentId, status }[])` — bulk mark attendance for a session. Calls `checkAttendanceAlerts` after saving.
- `updateAlertConfig(groupId, data)` — update thresholds. Admin only for school default, moderator for their own groups.

## Pages

### Admin: /admin/attendance

Dashboard layout with:

1. **KPI Cards** (top row):
   - Overall attendance rate (%)
   - Total sessions this month
   - Students at risk (count of students who crossed alert thresholds)
   - Most absent group (lowest attendance rate)

2. **Weekly Trend Chart** (Recharts LineChart):
   - X: week label, Y: attendance %, 12 weeks
   - Single line for school-wide rate

3. **Monthly Breakdown Chart** (Recharts StackedBarChart):
   - X: month, Y: count
   - Stacked bars: Present (green), Late (yellow), Excused (blue), Absent (red)
   - Last 6 months

4. **Group Comparison Chart** (Recharts BarChart):
   - X: group name, Y: attendance %
   - Sorted descending

5. **At-Risk Students Table**:
   - Columns: Student Name, Group, Attendance Rate, Consecutive Absences, Last Session
   - Sorted by consecutive absences desc
   - Link to moderator's student attendance detail

6. **Alert Configuration Section**:
   - Edit school-wide default thresholds
   - Form: consecutive absence threshold (number input), rate threshold (% input), notify moderator (toggle), notify admin (toggle)

### Moderator: /moderator/attendance

1. **Group Selector** (if moderator has multiple groups):
   - Dropdown or tab bar to switch between groups

2. **Quick-Mark Attendance** (collapsible section):
   - Select a session (dropdown of recent SCHEDULED/OPEN sessions for selected group)
   - Checklist of students in group with radio buttons: Present / Absent / Late / Excused
   - Save button → calls `markQuickAttendance`

3. **Group KPI Cards**:
   - Group attendance rate
   - Sessions this month
   - Students at risk in this group

4. **Per-Student Table**:
   - Columns: Student Name, Attendance Rate, Consecutive Absences, Last Attendance Status
   - Click row → navigates to student detail

5. **Weekly Trend Chart** (scoped to selected group)

6. **Alert Configuration** (per-group):
   - Same form as admin but scoped to this group
   - Shows whether overriding school default or using it

### Moderator: /moderator/attendance/[studentId]

1. **Student Header**: Name, group, overall attendance rate, current streak, longest streak

2. **Monthly Breakdown Chart**: Same stacked bar chart scoped to this student

3. **Session Log Table** (paginated):
   - Columns: Date, Session Time, Status (badge colored: green/red/yellow/blue), Notes
   - Most recent first
   - 20 per page

### Student: /student/attendance

1. **Attendance Summary Cards**:
   - Overall attendance rate
   - Current streak (consecutive present)
   - Sessions attended / total sessions
   - Status this month (present/absent/late counts)

2. **Monthly Breakdown Chart**: Stacked bars for own attendance

3. **Session Log Table** (paginated):
   - Columns: Date, Session Time, Status
   - Most recent first

## i18n Keys

Namespace: `attendance`

```
title, schoolOverview, groupOverview, myAttendance,
overallRate, sessionsThisMonth, studentsAtRisk, mostAbsentGroup,
currentStreak, longestStreak, sessionsAttended,
weeklyTrend, monthlyBreakdown, groupComparison,
present, absent, late, excusedAbsence, pending,
quickMark, selectSession, markAttendance, save,
atRiskStudents, consecutiveAbsences, attendanceRate, lastSession,
alertConfig, consecutiveThreshold, rateThreshold,
notifyModerator, notifyAdmin, schoolDefault, groupOverride,
sessionLog, noSessions, status
```

Arabic translations follow existing app patterns.

## Sidebar Navigation

Add to all three role nav arrays in `components/layout/sidebar.tsx`:

- Admin: `{ labelKey: "attendance", href: "/admin/attendance", icon: CalendarCheck, featureFlag: "attendance_management" }`
- Moderator: `{ labelKey: "attendance", href: "/moderator/attendance", icon: CalendarCheck, featureFlag: "attendance_management" }`
- Student: `{ labelKey: "attendance", href: "/student/attendance", icon: CalendarCheck, featureFlag: "attendance_management" }`

Nav label i18n key: `nav.attendance` = "Attendance" / "الحضور"

## Alert Flow (Sequence)

1. Moderator marks attendance (via session grading page OR quick-mark page)
2. Server action saves `SessionStudent` records
3. Server action calls `checkAttendanceAlerts(sessionId)`
4. For each student marked ABSENT:
   a. Query last N `SessionStudent` records for this student (ordered by session date desc)
   b. Count consecutive ABSENT (stop counting at first non-ABSENT)
   c. Calculate total attendance rate: `(PRESENT + LATE) / total * 100`
   d. Load `AttendanceAlertConfig` for this group (fallback to school default)
   e. If consecutive >= threshold → create notification with type `ATTENDANCE_ALERT`
   f. If rate < threshold → create notification with type `ATTENDANCE_ALERT`
   g. Deduplicate: don't re-alert if an alert was already sent for the same student+trigger within the last 7 days

## Audit Logging

- `ATTENDANCE_QUICK_MARK` — when moderator uses quick-mark (metadata: sessionId, studentCount)
- `ATTENDANCE_CONFIG_UPDATE` — when thresholds are changed (metadata: groupId, old values, new values)

## Constraints & Edge Cases

- A student with no sessions yet has no attendance rate — show "N/A" instead of 0%
- Quick-mark only available for sessions in SCHEDULED or OPEN status (not COMPLETED — use session grading for those)
- Consecutive absence count resets on any non-ABSENT status (PRESENT, LATE, EXCUSED_ABSENCE all reset the counter)
- LATE counts as "present" for both rate calculation and streak reset (student was there, just not on time)
- Alert deduplication: 7-day cooldown per student per trigger type prevents notification spam

## Out of Scope

- Parent notifications (Phase 11b — requires parent accounts)
- Email/SMS/push delivery (current phase uses in-app notifications only)
- Attendance prediction or ML-based risk scoring
- Calendar integration
- QR code or automatic attendance (manual marking only)
