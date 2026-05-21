# Phase 4: Weekly Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the weekly recitation session lifecycle — moderator creates/manages sessions, students see sessions with eligibility gate, moderator grades students with attendance/recitation results/comments/review ranges, students view their grades.

**Architecture:** Same layered pattern as Phase 3: Prisma schema → validation schemas → service layer → server actions → pages. Sessions belong to groups and auto-populate `SessionStudent` rows for all group members. Grading is per-student with Quran review ranges.

**Tech Stack:** Next.js App Router, Prisma 7.8, Zod, shadcn/ui, next-intl, server actions with FormData

---

## Pre-requisite: Commit uncommitted Phase 2 work

Before starting Phase 4, the uncommitted Phase 2 files must be committed.

### Task 0: Commit outstanding Phase 2 work

**Files:**
- Modified: `app/[locale]/(dashboard)/moderator/dashboard/page.tsx`
- Modified: `app/[locale]/(dashboard)/student/profile/page.tsx`
- Modified: `app/[locale]/layout.tsx`
- Modified: `app/layout.tsx`
- Modified: `prisma/seed.ts`
- Modified: `server/services/organization.ts`
- New: `app/[locale]/(dashboard)/moderator/groups/page.tsx`
- New: `app/[locale]/(dashboard)/moderator/students/page.tsx`
- New: `app/[locale]/(dashboard)/student/profile/profile-form.tsx`
- New: `app/[locale]/(dashboard)/support/tickets/page.tsx`
- New: `lib/validations/student.ts`
- New: `server/actions/student.ts`

- [ ] **Step 1: Stage and commit all uncommitted Phase 2 files**

```bash
git add \
  "app/[locale]/(dashboard)/moderator/dashboard/page.tsx" \
  "app/[locale]/(dashboard)/student/profile/page.tsx" \
  "app/[locale]/layout.tsx" \
  "app/layout.tsx" \
  "prisma/seed.ts" \
  "server/services/organization.ts" \
  "app/[locale]/(dashboard)/moderator/groups/page.tsx" \
  "app/[locale]/(dashboard)/moderator/students/page.tsx" \
  "app/[locale]/(dashboard)/student/profile/profile-form.tsx" \
  "app/[locale]/(dashboard)/support/tickets/page.tsx" \
  "lib/validations/student.ts" \
  "server/actions/student.ts"

git commit -m "feat(phase2): add moderator groups/students pages, student profile edit, support tickets placeholder, and seed data"
```

- [ ] **Step 2: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean` (except `demo.md` which is untracked and fine to leave)

---

## Task 1: Add session models to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add session enums after the `StudentAssignmentStatus` enum (line 245)**

Add these enums after line 245 in `prisma/schema.prisma`, before the `model Assignment` line:

```prisma
enum SessionStatus {
  SCHEDULED
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum AttendanceStatus {
  PENDING
  PRESENT
  ABSENT
  EXCUSED_ABSENCE
  LATE
}

enum RecitationResult {
  NOT_GRADED
  EXCELLENT
  GOOD
  NEEDS_REVIEW
  INCOMPLETE
  NOT_RECITED
}
```

- [ ] **Step 2: Add WeeklySession, SessionStudent, ReviewRange models**

Add before the `// Quran Reference` section comment (line 342):

```prisma
// ============================================================
// Weekly Sessions
// ============================================================

model WeeklySession {
  id          String        @id @default(cuid())
  groupId     String
  group       Group         @relation(fields: [groupId], references: [id])
  moderatorId String
  moderator   ModeratorProfile @relation("sessionModerator", fields: [moderatorId], references: [id])
  date        DateTime
  startTime   String?
  endTime     String?
  status      SessionStatus @default(SCHEDULED)
  meetingLink String?
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  students    SessionStudent[]

  @@index([groupId])
  @@index([moderatorId])
  @@index([date])
  @@index([status])
}

model SessionStudent {
  id                String           @id @default(cuid())
  sessionId         String
  session           WeeklySession    @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentId         String
  student           StudentProfile   @relation(fields: [studentId], references: [id])
  attendance        AttendanceStatus @default(PENDING)
  recitationResult  RecitationResult @default(NOT_GRADED)
  numericGrade      Float?
  mistakeCount      Int?
  tajweedNotes      String?
  memorizationNotes String?
  fluencyNotes      String?
  comment           String?
  voiceNoteUrl      String?
  gradedAt          DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  reviewRanges      ReviewRange[]

  @@unique([sessionId, studentId])
  @@index([studentId])
  @@index([sessionId])
}

model ReviewRange {
  id               String         @id @default(cuid())
  sessionStudentId String
  sessionStudent   SessionStudent @relation(fields: [sessionStudentId], references: [id], onDelete: Cascade)
  fromSurahNumber  Int
  fromAyahNumber   Int
  toSurahNumber    Int
  toAyahNumber     Int
  note             String?

  fromSurah        QuranSurah     @relation("reviewRangeFrom", fields: [fromSurahNumber], references: [number])
  toSurah          QuranSurah     @relation("reviewRangeTo", fields: [toSurahNumber], references: [number])

  @@index([sessionStudentId])
}
```

- [ ] **Step 3: Add reverse relations to existing models**

In `model Group` (line 180), add after `students GroupStudent[]`:
```prisma
  sessions          WeeklySession[]
```

In `model ModeratorProfile` (line 209), add after `groups Group[]`:
```prisma
  sessions          WeeklySession[] @relation("sessionModerator")
```

In `model StudentProfile` (line 100), add after `studentAssignments StudentAssignment[]`:
```prisma
  sessionStudents   SessionStudent[]
```

In `model QuranSurah` (line 346), add after the existing `quranAssignmentsTo` line:
```prisma
  reviewRangesFrom  ReviewRange[] @relation("reviewRangeFrom")
  reviewRangesTo    ReviewRange[] @relation("reviewRangeTo")
```

- [ ] **Step 4: Run prisma generate and push**

```bash
npx prisma generate
npx prisma db push
```

Expected: Client generates successfully to `./prisma/generated/prisma`. Schema push applies without errors.

- [ ] **Step 5: Verify the new models are accessible**

```bash
grep -c "weeklySession\|sessionStudent\|reviewRange" prisma/generated/prisma/internal/class.ts
```

Expected: Multiple matches confirming the accessors exist.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add WeeklySession, SessionStudent, ReviewRange models for Phase 4"
```

---

## Task 2: Add validation schemas

**Files:**
- Create: `lib/validations/session.ts`

- [ ] **Step 1: Create the session validation schemas**

Create `lib/validations/session.ts`:

```typescript
import { z } from "zod";

export const createSessionSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

const sessionStatusEnum = z.enum([
  "SCHEDULED",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const updateSessionStatusSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusEnum,
});

export type UpdateSessionStatusInput = z.infer<typeof updateSessionStatusSchema>;

export const updateMeetingLinkSchema = z.object({
  sessionId: z.string().min(1),
  meetingLink: z.string().url().or(z.literal("")),
});

export type UpdateMeetingLinkInput = z.infer<typeof updateMeetingLinkSchema>;

const attendanceEnum = z.enum([
  "PENDING",
  "PRESENT",
  "ABSENT",
  "EXCUSED_ABSENCE",
  "LATE",
]);

const recitationResultEnum = z.enum([
  "NOT_GRADED",
  "EXCELLENT",
  "GOOD",
  "NEEDS_REVIEW",
  "INCOMPLETE",
  "NOT_RECITED",
]);

const reviewRangeSchema = z.object({
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyahNumber: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyahNumber: z.coerce.number().int().min(1),
  note: z.string().optional(),
});

export const gradeStudentSchema = z.object({
  sessionStudentId: z.string().min(1),
  attendance: attendanceEnum,
  recitationResult: recitationResultEnum,
  numericGrade: z.coerce.number().min(0).max(100).optional().nullable(),
  mistakeCount: z.coerce.number().int().min(0).optional().nullable(),
  tajweedNotes: z.string().optional(),
  memorizationNotes: z.string().optional(),
  fluencyNotes: z.string().optional(),
  comment: z.string().optional(),
  voiceNoteUrl: z.string().url().optional().or(z.literal("")),
  reviewRanges: z.array(reviewRangeSchema).optional(),
});

export type GradeStudentInput = z.infer<typeof gradeStudentSchema>;
export type ReviewRangeInput = z.infer<typeof reviewRangeSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "session" | head -10
```

Expected: No session-related errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/session.ts
git commit -m "feat(validation): add Zod schemas for session CRUD and grading"
```

---

## Task 3: Add i18n translations

**Files:**
- Modify: `messages/ar.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add session and grades keys to English translations**

In `messages/en.json`, add a `"sessions"` section and a `"grades"` section at the same level as `"assignments"`:

```json
"sessions": {
  "title": "Weekly Sessions",
  "createSession": "Create Session",
  "group": "Group",
  "date": "Date",
  "startTime": "Start Time",
  "endTime": "End Time",
  "meetingLink": "Meeting Link",
  "notes": "Notes",
  "status": "Status",
  "statusScheduled": "Scheduled",
  "statusOpen": "Open",
  "statusInProgress": "In Progress",
  "statusCompleted": "Completed",
  "statusCancelled": "Cancelled",
  "openSession": "Open Session",
  "startSession": "Start Session",
  "completeSession": "Complete Session",
  "cancelSession": "Cancel Session",
  "noSessions": "No sessions yet",
  "upcoming": "Upcoming",
  "past": "Past Sessions",
  "studentProgress": "Student Progress",
  "attendance": "Attendance",
  "attendancePending": "Pending",
  "attendancePresent": "Present",
  "attendanceAbsent": "Absent",
  "attendanceExcused": "Excused",
  "attendanceLate": "Late",
  "recitationResult": "Recitation Result",
  "resultNotGraded": "Not Graded",
  "resultExcellent": "Excellent",
  "resultGood": "Good",
  "resultNeedsReview": "Needs Review",
  "resultIncomplete": "Incomplete",
  "resultNotRecited": "Not Recited",
  "numericGrade": "Grade (0-100)",
  "mistakeCount": "Mistake Count",
  "tajweedNotes": "Tajweed Notes",
  "memorizationNotes": "Memorization Notes",
  "fluencyNotes": "Fluency Notes",
  "comment": "Comment",
  "voiceNoteUrl": "Voice Note URL",
  "gradeStudent": "Grade Student",
  "saveGrade": "Save Grade",
  "reviewRanges": "Ranges to Review",
  "addReviewRange": "Add Review Range",
  "fromSurah": "From Surah",
  "fromAyah": "From Ayah",
  "toSurah": "To Surah",
  "toAyah": "To Ayah",
  "eligible": "Eligible",
  "notEligible": "Not Eligible",
  "completeAssignmentsFirst": "Complete your assignments to access the session",
  "sessionDetail": "Session Detail",
  "yourGrade": "Your Grade"
},
"grades": {
  "title": "Grades",
  "noGrades": "No grades yet",
  "sessionDate": "Session Date",
  "result": "Result",
  "grade": "Grade",
  "viewDetail": "View Detail"
}
```

- [ ] **Step 2: Add session and grades keys to Arabic translations**

In `messages/ar.json`, add the corresponding Arabic `"sessions"` and `"grades"` sections:

```json
"sessions": {
  "title": "الحلقات الأسبوعية",
  "createSession": "إنشاء حلقة",
  "group": "المجموعة",
  "date": "التاريخ",
  "startTime": "وقت البداية",
  "endTime": "وقت النهاية",
  "meetingLink": "رابط الاجتماع",
  "notes": "ملاحظات",
  "status": "الحالة",
  "statusScheduled": "مجدولة",
  "statusOpen": "مفتوحة",
  "statusInProgress": "جارية",
  "statusCompleted": "مكتملة",
  "statusCancelled": "ملغاة",
  "openSession": "فتح الحلقة",
  "startSession": "بدء الحلقة",
  "completeSession": "إنهاء الحلقة",
  "cancelSession": "إلغاء الحلقة",
  "noSessions": "لا توجد حلقات بعد",
  "upcoming": "القادمة",
  "past": "الحلقات السابقة",
  "studentProgress": "تقدم الطلاب",
  "attendance": "الحضور",
  "attendancePending": "في الانتظار",
  "attendancePresent": "حاضر",
  "attendanceAbsent": "غائب",
  "attendanceExcused": "غياب بعذر",
  "attendanceLate": "متأخر",
  "recitationResult": "نتيجة التسميع",
  "resultNotGraded": "لم يُقيَّم",
  "resultExcellent": "ممتاز",
  "resultGood": "جيد",
  "resultNeedsReview": "يحتاج مراجعة",
  "resultIncomplete": "غير مكتمل",
  "resultNotRecited": "لم يُسمِّع",
  "numericGrade": "الدرجة (0-100)",
  "mistakeCount": "عدد الأخطاء",
  "tajweedNotes": "ملاحظات التجويد",
  "memorizationNotes": "ملاحظات الحفظ",
  "fluencyNotes": "ملاحظات الطلاقة",
  "comment": "تعليق",
  "voiceNoteUrl": "رابط الملاحظة الصوتية",
  "gradeStudent": "تقييم الطالب",
  "saveGrade": "حفظ التقييم",
  "reviewRanges": "نطاقات المراجعة",
  "addReviewRange": "إضافة نطاق مراجعة",
  "fromSurah": "من سورة",
  "fromAyah": "من آية",
  "toSurah": "إلى سورة",
  "toAyah": "إلى آية",
  "eligible": "مؤهل",
  "notEligible": "غير مؤهل",
  "completeAssignmentsFirst": "أكمل واجباتك للوصول إلى الحلقة",
  "sessionDetail": "تفاصيل الحلقة",
  "yourGrade": "تقييمك"
},
"grades": {
  "title": "الدرجات",
  "noGrades": "لا توجد درجات بعد",
  "sessionDate": "تاريخ الحلقة",
  "result": "النتيجة",
  "grade": "الدرجة",
  "viewDetail": "عرض التفاصيل"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/ar.json messages/en.json
git commit -m "feat(i18n): add session and grades translations for Arabic and English"
```

---

## Task 4: Add sidebar navigation entries

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Import Calendar and Award icons**

In `components/layout/sidebar.tsx`, add `Calendar` and `Award` to the lucide-react import:

```typescript
import { Calendar, Award } from "lucide-react";
```

(Add to existing import — check which icons are already imported.)

- [ ] **Step 2: Add sessions to moderator nav**

In the `moderatorNav` array, add after the `assignments` entry:

```typescript
{ labelKey: "sessions", href: "/moderator/sessions", icon: Calendar },
```

- [ ] **Step 3: Add sessions and grades to student nav**

In the `studentNav` array, add after the `assignments` entry:

```typescript
{ labelKey: "sessions", href: "/student/sessions", icon: Calendar },
{ labelKey: "grades", href: "/student/grades", icon: Award },
```

- [ ] **Step 4: Add sessions to admin nav**

In the `adminNav` array, add after the `assignments` entry:

```typescript
{ labelKey: "sessions", href: "/admin/sessions", icon: Calendar },
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(nav): add session and grades links to moderator, student, and admin sidebars"
```

---

## Task 5: Create session service layer

**Files:**
- Create: `server/services/session.ts`

- [ ] **Step 1: Create the session service**

Create `server/services/session.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateSessionInput, GradeStudentInput, ReviewRangeInput } from "@/lib/validations/session";

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

export async function createSession(input: CreateSessionInput, actorId: string) {
  const group = await db.group.findUnique({
    where: { id: input.groupId },
    select: {
      id: true,
      moderatorId: true,
      students: { select: { studentId: true } },
    },
  });

  if (!group) throw new Error("Group not found");

  return db.$transaction(async (tx) => {
    const session = await tx.weeklySession.create({
      data: {
        groupId: input.groupId,
        moderatorId: group.moderatorId!,
        date: new Date(input.date),
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        meetingLink: input.meetingLink || null,
        notes: input.notes || null,
      },
    });

    if (group.students.length > 0) {
      await tx.sessionStudent.createMany({
        data: group.students.map((gs) => ({
          sessionId: session.id,
          studentId: gs.studentId,
        })),
      });
    }

    await createAuditLog({
      actorId,
      action: "session.create",
      entityType: "WeeklySession",
      entityId: session.id,
      metadata: { groupId: input.groupId, date: input.date },
    });

    return session;
  });
}

export async function getModeratorSessions(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { id: true, groups: { select: { id: true } } },
  });

  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.weeklySession.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { students: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getStudentSessions(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return [];

  const sessionStudents = await db.sessionStudent.findMany({
    where: { studentId: profile.id },
    include: {
      session: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  return sessionStudents;
}

export async function getAdminSessions() {
  return db.weeklySession.findMany({
    include: {
      group: {
        select: {
          id: true,
          name: true,
          class: { select: { name: true, level: { select: { nameAr: true } } } },
        },
      },
      moderator: {
        select: { user: { select: { name: true, nameAr: true } } },
      },
      _count: { select: { students: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getSessionDetail(sessionId: string) {
  return db.weeklySession.findUnique({
    where: { id: sessionId },
    include: {
      group: { select: { id: true, name: true } },
      moderator: { select: { user: { select: { name: true, nameAr: true } } } },
      students: {
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              user: { select: { name: true, nameAr: true } },
            },
          },
          reviewRanges: {
            include: {
              fromSurah: { select: { nameAr: true, nameEn: true } },
              toSurah: { select: { nameAr: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
}

export async function updateSessionStatus(
  sessionId: string,
  newStatus: string,
  actorId: string
) {
  const session = await db.weeklySession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!session) throw new Error("Session not found");

  const allowed = VALID_TRANSITIONS[session.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${session.status} to ${newStatus}`);
  }

  const updated = await db.weeklySession.update({
    where: { id: sessionId },
    data: { status: newStatus as any },
  });

  await createAuditLog({
    actorId,
    action: "session.status_change",
    entityType: "WeeklySession",
    entityId: sessionId,
    metadata: { from: session.status, to: newStatus },
  });

  return updated;
}

export async function updateMeetingLink(
  sessionId: string,
  meetingLink: string,
  actorId: string
) {
  return db.weeklySession.update({
    where: { id: sessionId },
    data: { meetingLink: meetingLink || null },
  });
}

export async function gradeStudent(
  input: GradeStudentInput,
  actorId: string
) {
  const sessionStudent = await db.sessionStudent.findUnique({
    where: { id: input.sessionStudentId },
    select: { id: true, sessionId: true },
  });

  if (!sessionStudent) throw new Error("Session student record not found");

  return db.$transaction(async (tx) => {
    await tx.reviewRange.deleteMany({
      where: { sessionStudentId: input.sessionStudentId },
    });

    const updated = await tx.sessionStudent.update({
      where: { id: input.sessionStudentId },
      data: {
        attendance: input.attendance as any,
        recitationResult: input.recitationResult as any,
        numericGrade: input.numericGrade ?? null,
        mistakeCount: input.mistakeCount ?? null,
        tajweedNotes: input.tajweedNotes || null,
        memorizationNotes: input.memorizationNotes || null,
        fluencyNotes: input.fluencyNotes || null,
        comment: input.comment || null,
        voiceNoteUrl: input.voiceNoteUrl || null,
        gradedAt: new Date(),
      },
    });

    if (input.reviewRanges && input.reviewRanges.length > 0) {
      await tx.reviewRange.createMany({
        data: input.reviewRanges.map((rr) => ({
          sessionStudentId: input.sessionStudentId,
          fromSurahNumber: rr.fromSurahNumber,
          fromAyahNumber: rr.fromAyahNumber,
          toSurahNumber: rr.toSurahNumber,
          toAyahNumber: rr.toAyahNumber,
          note: rr.note || null,
        })),
      });
    }

    await createAuditLog({
      actorId,
      action: "session.grade_student",
      entityType: "SessionStudent",
      entityId: input.sessionStudentId,
      metadata: {
        sessionId: sessionStudent.sessionId,
        attendance: input.attendance,
        recitationResult: input.recitationResult,
      },
    });

    return updated;
  });
}

export async function getStudentGrades(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) return [];

  return db.sessionStudent.findMany({
    where: {
      studentId: profile.id,
      session: { status: "COMPLETED" },
      recitationResult: { not: "NOT_GRADED" },
    },
    include: {
      session: {
        select: {
          id: true,
          date: true,
          group: { select: { name: true } },
        },
      },
      reviewRanges: {
        include: {
          fromSurah: { select: { nameAr: true, nameEn: true } },
          toSurah: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "session" | head -10
```

Expected: No session-related type errors.

- [ ] **Step 3: Commit**

```bash
git add server/services/session.ts
git commit -m "feat(service): add session service with CRUD, status transitions, and grading"
```

---

## Task 6: Create server actions

**Files:**
- Create: `server/actions/session.ts`

- [ ] **Step 1: Create session server actions**

Create `server/actions/session.ts`:

```typescript
"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createSession,
  updateSessionStatus,
  updateMeetingLink,
  gradeStudent,
} from "@/server/services/session";
import {
  createSessionSchema,
  updateSessionStatusSchema,
  gradeStudentSchema,
} from "@/lib/validations/session";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";

export async function createSessionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  if (session.user.role === "moderator") {
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (!groupIds.includes(parsed.data.groupId)) {
      return { error: "notAuthorized" };
    }
  }

  await createSession(parsed.data, session.user.id);

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/admin/sessions");
  revalidatePath("/en/admin/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  return { success: true };
}

export async function updateSessionStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_START);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSessionStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  if (session.user.role === "moderator") {
    const weeklySession = await db.weeklySession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { group: { select: { moderatorId: true } } },
    });
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (weeklySession?.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  try {
    await updateSessionStatus(parsed.data.sessionId, parsed.data.status, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/admin/sessions");
  revalidatePath("/en/admin/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  return { success: true };
}

export async function updateMeetingLinkAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const sessionId = formData.get("sessionId") as string;
  const meetingLink = formData.get("meetingLink") as string;

  if (!sessionId) return { error: "validationError" };

  await updateMeetingLink(sessionId, meetingLink || "", session.user.id);

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  return { success: true };
}

export async function gradeStudentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SESSIONS_GRADE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const reviewRanges: Array<{
    fromSurahNumber: number;
    fromAyahNumber: number;
    toSurahNumber: number;
    toAyahNumber: number;
    note?: string;
  }> = [];
  let i = 0;
  while (raw[`reviewRanges.${i}.fromSurahNumber`]) {
    reviewRanges.push({
      fromSurahNumber: Number(raw[`reviewRanges.${i}.fromSurahNumber`]),
      fromAyahNumber: Number(raw[`reviewRanges.${i}.fromAyahNumber`]),
      toSurahNumber: Number(raw[`reviewRanges.${i}.toSurahNumber`]),
      toAyahNumber: Number(raw[`reviewRanges.${i}.toAyahNumber`]),
      note: (raw[`reviewRanges.${i}.note`] as string) || undefined,
    });
    i++;
  }

  const input = {
    sessionStudentId: raw.sessionStudentId as string,
    attendance: raw.attendance as string,
    recitationResult: raw.recitationResult as string,
    numericGrade: raw.numericGrade ? Number(raw.numericGrade) : undefined,
    mistakeCount: raw.mistakeCount ? Number(raw.mistakeCount) : undefined,
    tajweedNotes: (raw.tajweedNotes as string) || undefined,
    memorizationNotes: (raw.memorizationNotes as string) || undefined,
    fluencyNotes: (raw.fluencyNotes as string) || undefined,
    comment: (raw.comment as string) || undefined,
    voiceNoteUrl: (raw.voiceNoteUrl as string) || undefined,
    reviewRanges: reviewRanges.length > 0 ? reviewRanges : undefined,
  };

  const parsed = gradeStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  if (session.user.role === "moderator") {
    const sessionStudent = await db.sessionStudent.findUnique({
      where: { id: parsed.data.sessionStudentId },
      select: { session: { select: { group: { select: { moderatorId: true } } } } },
    });
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (sessionStudent?.session.group.moderatorId !== profile?.id) {
      return { error: "notAuthorized" };
    }
  }

  try {
    await gradeStudent(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/moderator/sessions");
  revalidatePath("/en/moderator/sessions");
  revalidatePath("/ar/student/sessions");
  revalidatePath("/en/student/sessions");
  revalidatePath("/ar/student/grades");
  revalidatePath("/en/student/grades");
  return { success: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "session" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add server/actions/session.ts
git commit -m "feat(actions): add server actions for session CRUD, status transitions, and grading"
```

---

## Task 7: Moderator sessions list page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/sessions/page.tsx`

- [ ] **Step 1: Create the moderator sessions page**

Create `app/[locale]/(dashboard)/moderator/sessions/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorSessions } from "@/server/services/session";
import { getModeratorGroups } from "@/server/services/organization";
import { createSessionAction } from "@/server/actions/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function ModeratorSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  const t = await getTranslations("sessions");

  const [sessions, groups] = await Promise.all([
    getModeratorSessions(session.user.id),
    getModeratorGroups(session.user.id),
  ]);

  const now = new Date();
  const upcoming = sessions.filter(
    (s) => s.status !== "COMPLETED" && s.status !== "CANCELLED"
  );
  const past = sessions.filter(
    (s) => s.status === "COMPLETED" || s.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createSession")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSessionAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="groupId">{t("group")}</Label>
                <Select name="groupId" required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t("date")}</Label>
                <Input type="date" name="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">{t("startTime")}</Label>
                <Input type="time" name="startTime" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t("endTime")}</Label>
                <Input type="time" name="endTime" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meetingLink">{t("meetingLink")}</Label>
                <Input type="url" name="meetingLink" placeholder="https://" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{t("notes")}</Label>
                <Input name="notes" />
              </div>
            </div>
            <Button type="submit">{t("createSession")}</Button>
          </form>
        </CardContent>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("upcoming")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("startTime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("studentProgress")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/moderator/sessions/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.group.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(s.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>{s.startTime || "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status] || ""}>
                        {t(`status${s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>{s._count.students}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("past")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("studentProgress")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/moderator/sessions/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.group.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(s.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status] || ""}>
                        {t(`status${s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>{s._count.students}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {sessions.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          {t("noSessions")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "moderator/sessions" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/sessions/page.tsx"
git commit -m "feat(moderator): add sessions list page with create form"
```

---

## Task 8: Moderator session detail page with grading

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx`

- [ ] **Step 1: Create the moderator session detail page**

Create `app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getSessionDetail } from "@/server/services/session";
import { getStudentEligibility } from "@/server/services/assignment";
import {
  updateSessionStatusAction,
  updateMeetingLinkAction,
  gradeStudentAction,
} from "@/server/actions/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const NEXT_STATUS: Record<string, { status: string; labelKey: string }> = {
  SCHEDULED: { status: "OPEN", labelKey: "openSession" },
  OPEN: { status: "IN_PROGRESS", labelKey: "startSession" },
  IN_PROGRESS: { status: "COMPLETED", labelKey: "completeSession" },
};

export default async function ModeratorSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  const t = await getTranslations("sessions");

  const sessionDetail = await getSessionDetail(id);
  if (!sessionDetail) return notFound();

  const surahs = await db.quranSurah.findMany({ orderBy: { number: "asc" } });

  const eligibilityMap: Record<string, { total: number; completed: number; eligible: boolean }> = {};
  for (const ss of sessionDetail.students) {
    try {
      eligibilityMap[ss.student.userId] = await getStudentEligibility(ss.student.userId);
    } catch {
      eligibilityMap[ss.student.userId] = { total: 0, completed: 0, eligible: true };
    }
  }

  const nextAction = NEXT_STATUS[sessionDetail.status];
  const canCancel = sessionDetail.status === "SCHEDULED" || sessionDetail.status === "OPEN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("sessionDetail")} — {sessionDetail.group.name}
        </h1>
        <Badge className={STATUS_COLORS[sessionDetail.status] || ""}>
          {t(`status${sessionDetail.status.charAt(0) + sessionDetail.status.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("date")}</p>
              <p className="font-medium">
                {new Date(sessionDetail.date).toLocaleDateString(locale)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("startTime")}</p>
              <p className="font-medium">{sessionDetail.startTime || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("endTime")}</p>
              <p className="font-medium">{sessionDetail.endTime || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("meetingLink")}</p>
              {sessionDetail.meetingLink ? (
                <a
                  href={sessionDetail.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {t("meetingLink")}
                </a>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
          </div>

          {sessionDetail.notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{t("notes")}</p>
              <p>{sessionDetail.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {nextAction && (
          <form action={updateSessionStatusAction}>
            <input type="hidden" name="sessionId" value={sessionDetail.id} />
            <input type="hidden" name="status" value={nextAction.status} />
            <Button type="submit">{t(nextAction.labelKey as any)}</Button>
          </form>
        )}
        {canCancel && (
          <form action={updateSessionStatusAction}>
            <input type="hidden" name="sessionId" value={sessionDetail.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <Button type="submit" variant="destructive">
              {t("cancelSession")}
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetingLink")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateMeetingLinkAction} className="flex gap-2">
            <input type="hidden" name="sessionId" value={sessionDetail.id} />
            <Input
              name="meetingLink"
              type="url"
              defaultValue={sessionDetail.meetingLink || ""}
              placeholder="https://"
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              {t("saveGrade")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentProgress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionDetail.students.map((ss) => {
            const elig = eligibilityMap[ss.student.userId];
            return (
              <div key={ss.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {ss.student.user.nameAr || ss.student.user.name}
                  </h3>
                  <Badge
                    className={
                      elig?.eligible
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {elig?.eligible ? t("eligible") : t("notEligible")}
                    {elig ? ` (${elig.completed}/${elig.total})` : ""}
                  </Badge>
                </div>

                <form action={gradeStudentAction} className="space-y-3">
                  <input type="hidden" name="sessionStudentId" value={ss.id} />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>{t("attendance")}</Label>
                      <Select name="attendance" defaultValue={ss.attendance}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">{t("attendancePending")}</SelectItem>
                          <SelectItem value="PRESENT">{t("attendancePresent")}</SelectItem>
                          <SelectItem value="ABSENT">{t("attendanceAbsent")}</SelectItem>
                          <SelectItem value="EXCUSED_ABSENCE">{t("attendanceExcused")}</SelectItem>
                          <SelectItem value="LATE">{t("attendanceLate")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t("recitationResult")}</Label>
                      <Select name="recitationResult" defaultValue={ss.recitationResult}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOT_GRADED">{t("resultNotGraded")}</SelectItem>
                          <SelectItem value="EXCELLENT">{t("resultExcellent")}</SelectItem>
                          <SelectItem value="GOOD">{t("resultGood")}</SelectItem>
                          <SelectItem value="NEEDS_REVIEW">{t("resultNeedsReview")}</SelectItem>
                          <SelectItem value="INCOMPLETE">{t("resultIncomplete")}</SelectItem>
                          <SelectItem value="NOT_RECITED">{t("resultNotRecited")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t("numericGrade")}</Label>
                      <Input
                        type="number"
                        name="numericGrade"
                        min={0}
                        max={100}
                        defaultValue={ss.numericGrade ?? ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>{t("mistakeCount")}</Label>
                      <Input
                        type="number"
                        name="mistakeCount"
                        min={0}
                        defaultValue={ss.mistakeCount ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("voiceNoteUrl")}</Label>
                      <Input
                        type="url"
                        name="voiceNoteUrl"
                        defaultValue={ss.voiceNoteUrl || ""}
                        placeholder="https://"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>{t("tajweedNotes")}</Label>
                      <Input name="tajweedNotes" defaultValue={ss.tajweedNotes || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("memorizationNotes")}</Label>
                      <Input name="memorizationNotes" defaultValue={ss.memorizationNotes || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("fluencyNotes")}</Label>
                      <Input name="fluencyNotes" defaultValue={ss.fluencyNotes || ""} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>{t("comment")}</Label>
                    <Input name="comment" defaultValue={ss.comment || ""} />
                  </div>

                  <Button type="submit" size="sm">
                    {t("saveGrade")}
                  </Button>
                </form>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/sessions/[id]/page.tsx"
git commit -m "feat(moderator): add session detail page with per-student grading"
```

---

## Task 9: Student sessions list page

**Files:**
- Create: `app/[locale]/(dashboard)/student/sessions/page.tsx`

- [ ] **Step 1: Create the student sessions page**

Create `app/[locale]/(dashboard)/student/sessions/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentSessions } from "@/server/services/session";
import { getStudentEligibility } from "@/server/services/assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  const t = await getTranslations("sessions");

  const [sessionStudents, eligibility] = await Promise.all([
    getStudentSessions(session.user.id),
    getStudentEligibility(session.user.id),
  ]);

  const upcoming = sessionStudents.filter(
    (ss) =>
      ss.session.status !== "COMPLETED" && ss.session.status !== "CANCELLED"
  );
  const past = sessionStudents.filter(
    (ss) =>
      ss.session.status === "COMPLETED" || ss.session.status === "CANCELLED"
  );

  const showLink = (status: string) =>
    (status === "OPEN" || status === "IN_PROGRESS") && eligibility.eligible;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {!eligibility.eligible && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              {t("completeAssignmentsFirst")} ({eligibility.completed}/{eligibility.total})
            </p>
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("upcoming")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((ss) => (
              <div
                key={ss.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{ss.session.group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ss.session.date).toLocaleDateString(locale)}
                    {ss.session.startTime && ` — ${ss.session.startTime}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[ss.session.status] || ""}>
                    {t(`status${ss.session.status.charAt(0) + ss.session.status.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                  </Badge>
                  {showLink(ss.session.status) && ss.session.meetingLink && (
                    <a
                      href={ss.session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t("joinSession")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("past")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {past.map((ss) => (
              <Link
                key={ss.id}
                href={`/${locale}/student/sessions/${ss.session.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{ss.session.group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ss.session.date).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {ss.recitationResult !== "NOT_GRADED" && (
                    <Badge className="bg-purple-100 text-purple-800">
                      {t(`result${ss.recitationResult.charAt(0) + ss.recitationResult.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                    </Badge>
                  )}
                  {ss.numericGrade !== null && (
                    <span className="text-sm font-medium">{ss.numericGrade}/100</span>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {sessionStudents.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          {t("noSessions")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/sessions/page.tsx"
git commit -m "feat(student): add sessions list page with eligibility gate"
```

---

## Task 10: Student session detail page (grade view)

**Files:**
- Create: `app/[locale]/(dashboard)/student/sessions/[id]/page.tsx`

- [ ] **Step 1: Create the student session detail page**

Create `app/[locale]/(dashboard)/student/sessions/[id]/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getSessionDetail } from "@/server/services/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
  INCOMPLETE: "bg-orange-100 text-orange-800",
  NOT_RECITED: "bg-red-100 text-red-800",
  NOT_GRADED: "bg-gray-100 text-gray-800",
};

const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg", ".webm"];

function isAudioUrl(url: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const authSession = await requireApprovedUser();
  const t = await getTranslations("sessions");

  const sessionDetail = await getSessionDetail(id);
  if (!sessionDetail) return notFound();

  const profile = await db.studentProfile.findUnique({
    where: { userId: authSession.user.id },
    select: { id: true },
  });

  const myRecord = sessionDetail.students.find(
    (ss) => ss.studentId === profile?.id
  );

  if (!myRecord) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("yourGrade")}</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("group")}</p>
              <p className="font-medium">{sessionDetail.group.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("date")}</p>
              <p className="font-medium">
                {new Date(sessionDetail.date).toLocaleDateString(locale)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("attendance")}</p>
              <p className="font-medium">
                {t(`attendance${myRecord.attendance.charAt(0) + myRecord.attendance.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("recitationResult")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={RESULT_COLORS[myRecord.recitationResult] || ""}>
              {t(`result${myRecord.recitationResult.charAt(0) + myRecord.recitationResult.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
            </Badge>
            {myRecord.numericGrade !== null && (
              <span className="text-lg font-bold">{myRecord.numericGrade}/100</span>
            )}
            {myRecord.mistakeCount !== null && (
              <span className="text-sm text-muted-foreground">
                {t("mistakeCount")}: {myRecord.mistakeCount}
              </span>
            )}
          </div>

          {(myRecord.tajweedNotes || myRecord.memorizationNotes || myRecord.fluencyNotes) && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {myRecord.tajweedNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("tajweedNotes")}</p>
                  <p>{myRecord.tajweedNotes}</p>
                </div>
              )}
              {myRecord.memorizationNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("memorizationNotes")}</p>
                  <p>{myRecord.memorizationNotes}</p>
                </div>
              )}
              {myRecord.fluencyNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("fluencyNotes")}</p>
                  <p>{myRecord.fluencyNotes}</p>
                </div>
              )}
            </div>
          )}

          {myRecord.comment && (
            <div>
              <p className="text-sm text-muted-foreground">{t("comment")}</p>
              <p className="rounded-lg bg-muted p-3">{myRecord.comment}</p>
            </div>
          )}

          {myRecord.voiceNoteUrl && (
            <div>
              <p className="text-sm text-muted-foreground">{t("voiceNoteUrl")}</p>
              {isAudioUrl(myRecord.voiceNoteUrl) ? (
                <audio controls src={myRecord.voiceNoteUrl} className="mt-1 w-full" />
              ) : (
                <a
                  href={myRecord.voiceNoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("voiceNoteUrl")}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {myRecord.reviewRanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reviewRanges")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRecord.reviewRanges.map((rr) => (
                <div key={rr.id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {locale === "ar" ? rr.fromSurah.nameAr : rr.fromSurah.nameEn}:{" "}
                    {rr.fromAyahNumber} →{" "}
                    {locale === "ar" ? rr.toSurah.nameAr : rr.toSurah.nameEn}:{" "}
                    {rr.toAyahNumber}
                  </p>
                  {rr.note && <p className="text-sm text-muted-foreground">{rr.note}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/sessions/[id]/page.tsx"
git commit -m "feat(student): add session detail page with grade, notes, review ranges"
```

---

## Task 11: Student grades page

**Files:**
- Create: `app/[locale]/(dashboard)/student/grades/page.tsx`

- [ ] **Step 1: Create the student grades page**

Create `app/[locale]/(dashboard)/student/grades/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentGrades } from "@/server/services/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800",
  GOOD: "bg-blue-100 text-blue-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
  INCOMPLETE: "bg-orange-100 text-orange-800",
  NOT_RECITED: "bg-red-100 text-red-800",
};

export default async function StudentGradesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  const t = await getTranslations("grades");
  const ts = await getTranslations("sessions");

  const grades = await getStudentGrades(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {grades.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {t("noGrades")}
        </p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sessionDate")}</TableHead>
                  <TableHead>{ts("group")}</TableHead>
                  <TableHead>{t("result")}</TableHead>
                  <TableHead>{t("grade")}</TableHead>
                  <TableHead>{ts("comment")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      {new Date(g.session.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>{g.session.group.name}</TableCell>
                    <TableCell>
                      <Badge className={RESULT_COLORS[g.recitationResult] || ""}>
                        {ts(`result${g.recitationResult.charAt(0) + g.recitationResult.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {g.numericGrade !== null ? `${g.numericGrade}/100` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {g.comment || "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/${locale}/student/sessions/${g.session.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {t("viewDetail")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/grades/page.tsx"
git commit -m "feat(student): add grades page with aggregated session results"
```

---

## Task 12: Admin sessions page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/sessions/page.tsx`

- [ ] **Step 1: Create the admin sessions page**

Create `app/[locale]/(dashboard)/admin/sessions/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAdminSessions } from "@/server/services/session";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function AdminSessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  const t = await getTranslations("sessions");

  const sessions = await getAdminSessions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {t("noSessions")}
        </p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("group")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("startTime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("studentProgress")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.moderator.user.nameAr || s.moderator.user.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(s.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>{s.startTime || "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status] || ""}>
                        {t(`status${s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>{s._count.students}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/sessions/page.tsx"
git commit -m "feat(admin): add read-only sessions overview page"
```

---

## Task 13: Build verification and final commit

**Files:** None new — verification only.

- [ ] **Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit --pretty 2>&1 | tail -20
```

Expected: No errors, or only pre-existing errors unrelated to sessions.

- [ ] **Step 2: Run the build**

```bash
pnpm build 2>&1 | tail -30
```

Expected: Build succeeds. All new session pages compile.

- [ ] **Step 3: Fix any TypeScript or build errors**

If errors exist, fix them and commit the fixes:

```bash
git add -A
git commit -m "fix: resolve TypeScript errors in Phase 4 session pages"
```

- [ ] **Step 4: Verify all pages are reachable (manual check)**

Start the dev server and verify in browser:
- `/ar/moderator/sessions` — shows create form and empty state
- `/ar/student/sessions` — shows empty state
- `/ar/student/grades` — shows empty state
- `/ar/admin/sessions` — shows empty state

```bash
pnpm dev
```

- [ ] **Step 5: Commit design spec**

```bash
git add docs/superpowers/specs/2026-05-20-phase4-weekly-sessions-design.md
git add docs/superpowers/plans/2026-05-20-phase4-weekly-sessions.md
git commit -m "docs: add Phase 4 weekly sessions design spec and implementation plan"
```
