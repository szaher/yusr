# Phase 6: Leave Requests, Announcements & Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add leave request management, admin announcements with dashboard banners, and in-app notification system with header bell icon and dedicated notifications page.

**Architecture:** Three features sharing a notification layer. Leave request and announcement actions call `createNotification()` / `createBulkNotifications()` inline. Notification bell is a client component wrapper around a server-rendered count. All pages are async server components following existing patterns.

**Tech Stack:** Next.js App Router, Prisma ORM, Zod validation, next-intl i18n, shadcn/ui, lucide-react icons

---

## Task 1: Add LeaveRequest model and Announcement relation to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add LeaveRequestStatus enum and LeaveRequest model**

In `prisma/schema.prisma`, after the `AttendanceStatus` enum (around line 270), add the new enum:

```prisma
enum LeaveRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

After the `SessionStudent` model (around line 450), add the `LeaveRequest` model:

```prisma
model LeaveRequest {
  id           String             @id @default(cuid())
  studentId    String
  student      StudentProfile     @relation(fields: [studentId], references: [id])
  sessionId    String
  session      WeeklySession      @relation(fields: [sessionId], references: [id])
  reason       String
  status       LeaveRequestStatus @default(PENDING)
  reviewedById String?
  reviewedBy   User?              @relation("leaveReviewer", fields: [reviewedById], references: [id])
  reviewNote   String?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@unique([studentId, sessionId])
  @@index([studentId])
  @@index([sessionId])
  @@index([status])
}
```

- [ ] **Step 2: Add reverse relations**

Add to `User` model (after the existing `memorizationReviews` relation):

```prisma
  reviewedLeaveRequests LeaveRequest[]   @relation("leaveReviewer")
  createdAnnouncements  Announcement[]   @relation("announcementCreator")
```

Add to `StudentProfile` model (after `memorizationPlans`):

```prisma
  leaveRequests          LeaveRequest[]
```

Add to `WeeklySession` model (after `memorizationReviews`):

```prisma
  leaveRequests       LeaveRequest[]
```

- [ ] **Step 3: Add createdBy relation to Announcement model**

In the existing `Announcement` model, add a relation for the `createdById` field. Change the model to:

```prisma
model Announcement {
  id          String    @id @default(cuid())
  title       String
  body        String
  priority    String    @default("normal")
  targetType  String?
  targetId    String?
  publishDate DateTime  @default(now())
  expiryDate  DateTime?
  createdById String
  createdBy   User      @relation("announcementCreator", fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
}
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(phase6): add LeaveRequest model and Announcement relation to schema"
```

---

## Task 2: Add validation schemas for leave requests and announcements

**Files:**
- Create: `lib/validations/leave-request.ts`
- Create: `lib/validations/announcement.ts`

- [ ] **Step 1: Create leave request validation schemas**

Create `lib/validations/leave-request.ts`:

```typescript
import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  leaveRequestId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;
```

- [ ] **Step 2: Create announcement validation schemas**

Create `lib/validations/announcement.ts`:

```typescript
import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  targetType: z.enum(["ALL", "ROLE", "GROUP"]).default("ALL"),
  targetId: z.string().optional(),
  publishDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.extend({
  announcementId: z.string().min(1),
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add lib/validations/leave-request.ts lib/validations/announcement.ts
git commit -m "feat(phase6): add validation schemas for leave requests and announcements"
```

---

## Task 3: Add i18n translations for leave requests, announcements, and notifications

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add English translations**

Add these top-level namespaces to `messages/en.json`:

```json
"leaveRequests": {
  "title": "Leave Requests",
  "requestLeave": "Request Leave",
  "selectSession": "Select Session",
  "reason": "Reason",
  "reasonPlaceholder": "Explain why you need to be excused...",
  "submit": "Submit Request",
  "status": "Status",
  "sessionDate": "Session Date",
  "groupName": "Group",
  "submittedAt": "Submitted",
  "reviewNote": "Review Note",
  "reviewNotePlaceholder": "Optional note...",
  "approve": "Approve",
  "reject": "Reject",
  "noRequests": "No leave requests",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected",
  "studentName": "Student",
  "showAll": "Show All",
  "showPending": "Show Pending Only",
  "alreadyRequested": "You already have a request for this session"
},
"announcements": {
  "title": "Announcements",
  "create": "Create Announcement",
  "edit": "Edit",
  "delete": "Delete",
  "confirmDelete": "Are you sure you want to delete this announcement?",
  "announcementTitle": "Title",
  "body": "Body",
  "priority": "Priority",
  "priorityNormal": "Normal",
  "priorityHigh": "High",
  "priorityUrgent": "Urgent",
  "targetType": "Target Audience",
  "targetAll": "All Users",
  "targetRole": "By Role",
  "targetGroup": "By Group",
  "targetId": "Target",
  "publishDate": "Publish Date",
  "expiryDate": "Expiry Date",
  "save": "Save",
  "noAnnouncements": "No announcements",
  "active": "Active",
  "expired": "Expired",
  "selectRole": "Select Role",
  "selectGroup": "Select Group"
},
"notifications": {
  "title": "Notifications",
  "markAllRead": "Mark All as Read",
  "viewAll": "View All",
  "noNotifications": "No notifications",
  "justNow": "Just now",
  "minutesAgo": "{count}m ago",
  "hoursAgo": "{count}h ago",
  "daysAgo": "{count}d ago"
}
```

- [ ] **Step 2: Add Arabic translations**

Add these top-level namespaces to `messages/ar.json`:

```json
"leaveRequests": {
  "title": "طلبات الإجازة",
  "requestLeave": "طلب إجازة",
  "selectSession": "اختر الحلقة",
  "reason": "السبب",
  "reasonPlaceholder": "اشرح سبب طلب الإجازة...",
  "submit": "إرسال الطلب",
  "status": "الحالة",
  "sessionDate": "تاريخ الحلقة",
  "groupName": "المجموعة",
  "submittedAt": "تاريخ التقديم",
  "reviewNote": "ملاحظة المراجعة",
  "reviewNotePlaceholder": "ملاحظة اختيارية...",
  "approve": "قبول",
  "reject": "رفض",
  "noRequests": "لا توجد طلبات إجازة",
  "pending": "قيد المراجعة",
  "approved": "مقبول",
  "rejected": "مرفوض",
  "studentName": "الطالب",
  "showAll": "عرض الكل",
  "showPending": "المعلقة فقط",
  "alreadyRequested": "لديك طلب مسبق لهذه الحلقة"
},
"announcements": {
  "title": "الإعلانات",
  "create": "إنشاء إعلان",
  "edit": "تعديل",
  "delete": "حذف",
  "confirmDelete": "هل أنت متأكد من حذف هذا الإعلان؟",
  "announcementTitle": "العنوان",
  "body": "المحتوى",
  "priority": "الأولوية",
  "priorityNormal": "عادي",
  "priorityHigh": "مهم",
  "priorityUrgent": "عاجل",
  "targetType": "الفئة المستهدفة",
  "targetAll": "جميع المستخدمين",
  "targetRole": "حسب الدور",
  "targetGroup": "حسب المجموعة",
  "targetId": "الهدف",
  "publishDate": "تاريخ النشر",
  "expiryDate": "تاريخ الانتهاء",
  "save": "حفظ",
  "noAnnouncements": "لا توجد إعلانات",
  "active": "نشط",
  "expired": "منتهي",
  "selectRole": "اختر الدور",
  "selectGroup": "اختر المجموعة"
},
"notifications": {
  "title": "الإشعارات",
  "markAllRead": "تعيين الكل كمقروء",
  "viewAll": "عرض الكل",
  "noNotifications": "لا توجد إشعارات",
  "justNow": "الآن",
  "minutesAgo": "منذ {count} دقيقة",
  "hoursAgo": "منذ {count} ساعة",
  "daysAgo": "منذ {count} يوم"
}
```

- [ ] **Step 3: Add nav keys**

The nav keys `leaveRequests`, `announcements`, and `notifications` should already exist in both files. Verify they exist under the `"nav"` namespace:

English (`messages/en.json` → `nav`):
```json
"leaveRequests": "Leave Requests"
```

Arabic (`messages/ar.json` → `nav`):
```json
"leaveRequests": "طلبات الإجازة"
```

If missing, add them.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(phase6): add i18n translations for leave requests, announcements, and notifications"
```

---

## Task 4: Add leave request service

**Files:**
- Create: `server/services/leave-request.ts`

- [ ] **Step 1: Create the leave request service**

Create `server/services/leave-request.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification } from "./notification";
import type { CreateLeaveRequestInput, ReviewLeaveRequestInput } from "@/lib/validations/leave-request";

export async function createLeaveRequest(input: CreateLeaveRequestInput, studentProfileId: string, actorId: string) {
  const session = await db.weeklySession.findUniqueOrThrow({
    where: { id: input.sessionId },
    include: {
      group: {
        include: {
          moderator: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  const request = await db.leaveRequest.create({
    data: {
      studentId: studentProfileId,
      sessionId: input.sessionId,
      reason: input.reason,
      status: "PENDING",
    },
  });

  const student = await db.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { name: true, nameAr: true },
  });

  if (session.group.moderator?.user?.id) {
    const sessionDate = session.date.toISOString().split("T")[0];
    await createNotification({
      recipientId: session.group.moderator.user.id,
      type: "LEAVE_SUBMITTED",
      title: `${student.nameAr || student.name} requested leave for ${sessionDate}`,
    });
  }

  await createAuditLog({
    actorId,
    action: "leave_request.create",
    entityType: "LeaveRequest",
    entityId: request.id,
    metadata: { sessionId: input.sessionId, reason: input.reason },
  });

  return request;
}

export async function reviewLeaveRequest(input: ReviewLeaveRequestInput, actorId: string) {
  const request = await db.leaveRequest.findUniqueOrThrow({
    where: { id: input.leaveRequestId },
    include: {
      student: { include: { user: { select: { id: true } } } },
      session: true,
    },
  });

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: input.leaveRequestId },
      data: {
        status: input.action,
        reviewedById: actorId,
        reviewNote: input.reviewNote || null,
      },
    });

    if (input.action === "APPROVED") {
      await tx.sessionStudent.upsert({
        where: {
          sessionId_studentId: {
            sessionId: request.sessionId,
            studentId: request.studentId,
          },
        },
        update: { attendance: "EXCUSED_ABSENCE" },
        create: {
          sessionId: request.sessionId,
          studentId: request.studentId,
          attendance: "EXCUSED_ABSENCE",
        },
      });
    }

    return result;
  });

  const sessionDate = request.session.date.toISOString().split("T")[0];
  const notifType = input.action === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED";
  const notifTitle = input.action === "APPROVED"
    ? `Your leave request for ${sessionDate} has been approved`
    : `Your leave request for ${sessionDate} has been rejected`;

  await createNotification({
    recipientId: request.student.user.id,
    type: notifType,
    title: notifTitle,
    body: input.reviewNote || undefined,
  });

  await createAuditLog({
    actorId,
    action: `leave_request.${input.action.toLowerCase()}`,
    entityType: "LeaveRequest",
    entityId: input.leaveRequestId,
    metadata: { action: input.action, reviewNote: input.reviewNote },
  });

  return updated;
}

export async function getStudentLeaveRequests(studentProfileId: string) {
  return db.leaveRequest.findMany({
    where: { studentId: studentProfileId },
    include: {
      session: {
        select: { date: true, group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getModeratorLeaveRequests(userId: string, statusFilter?: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true } } },
  });

  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.leaveRequest.findMany({
    where: {
      session: { groupId: { in: groupIds } },
      ...(statusFilter ? { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    },
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      session: {
        select: { date: true, group: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUpcomingSessionsForStudent(studentProfileId: string) {
  const groupStudents = await db.groupStudent.findMany({
    where: { studentId: studentProfileId },
    select: { groupId: true },
  });

  const groupIds = groupStudents.map((gs) => gs.groupId);

  return db.weeklySession.findMany({
    where: {
      groupId: { in: groupIds },
      date: { gte: new Date() },
      status: { in: ["SCHEDULED", "OPEN"] },
    },
    include: {
      group: { select: { name: true } },
    },
    orderBy: { date: "asc" },
    take: 20,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/leave-request.ts
git commit -m "feat(phase6): add leave request service with create, review, and query functions"
```

---

## Task 5: Add announcement service

**Files:**
- Create: `server/services/announcement.ts`

- [ ] **Step 1: Create the announcement service**

Create `server/services/announcement.ts`:

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createBulkNotifications } from "./notification";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "@/lib/validations/announcement";

export async function createAnnouncement(input: CreateAnnouncementInput, actorId: string) {
  const announcement = await db.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      priority: input.priority || "normal",
      targetType: input.targetType || "ALL",
      targetId: input.targetId || null,
      publishDate: input.publishDate || new Date(),
      expiryDate: input.expiryDate || null,
      createdById: actorId,
    },
  });

  const recipientIds = await resolveTargetUsers(input.targetType || "ALL", input.targetId);
  if (recipientIds.length > 0) {
    await createBulkNotifications(recipientIds, "ANNOUNCEMENT", input.title, input.body);
  }

  await createAuditLog({
    actorId,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: input.title, targetType: input.targetType, targetId: input.targetId },
  });

  return announcement;
}

export async function updateAnnouncement(input: UpdateAnnouncementInput, actorId: string) {
  const announcement = await db.announcement.update({
    where: { id: input.announcementId },
    data: {
      title: input.title,
      body: input.body,
      priority: input.priority || "normal",
      targetType: input.targetType || "ALL",
      targetId: input.targetId || null,
      publishDate: input.publishDate || new Date(),
      expiryDate: input.expiryDate || null,
    },
  });

  await createAuditLog({
    actorId,
    action: "announcement.update",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: input.title },
  });

  return announcement;
}

export async function deleteAnnouncement(announcementId: string, actorId: string) {
  await db.announcement.delete({ where: { id: announcementId } });

  await createAuditLog({
    actorId,
    action: "announcement.delete",
    entityType: "Announcement",
    entityId: announcementId,
    metadata: {},
  });
}

export async function listAnnouncements() {
  return db.announcement.findMany({
    include: {
      createdBy: { select: { name: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveAnnouncementsForUser(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { select: { name: true } },
      studentProfile: {
        include: {
          groupStudents: { select: { groupId: true } },
        },
      },
    },
  });

  const now = new Date();
  const roleName = user.role.name;
  const groupIds = user.studentProfile?.groupStudents.map((gs) => gs.groupId) ?? [];

  return db.announcement.findMany({
    where: {
      publishDate: { lte: now },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: now } },
      ],
      AND: {
        OR: [
          { targetType: null },
          { targetType: "ALL" },
          { targetType: "ROLE", targetId: roleName },
          ...(groupIds.length > 0
            ? [{ targetType: "GROUP", targetId: { in: groupIds } }]
            : []),
        ],
      },
    },
    orderBy: { publishDate: "desc" },
    take: 5,
  });
}

async function resolveTargetUsers(targetType: string, targetId?: string): Promise<string[]> {
  if (targetType === "ALL") {
    const users = await db.user.findMany({
      where: { accountStatus: "ACTIVE" },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (targetType === "ROLE" && targetId) {
    const users = await db.user.findMany({
      where: { accountStatus: "ACTIVE", role: { name: targetId } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (targetType === "GROUP" && targetId) {
    const group = await db.group.findUnique({
      where: { id: targetId },
      include: {
        students: {
          include: {
            student: {
              include: { user: { select: { id: true } } },
            },
          },
        },
        moderator: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!group) return [];

    const ids: string[] = group.students.map((gs) => gs.student.user.id);
    if (group.moderator?.user?.id) {
      ids.push(group.moderator.user.id);
    }
    return ids;
  }

  return [];
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/announcement.ts
git commit -m "feat(phase6): add announcement service with CRUD and target resolution"
```

---

## Task 6: Extend notification service with bulk and paginated functions

**Files:**
- Modify: `server/services/notification.ts`

- [ ] **Step 1: Add new functions to the notification service**

Add the following functions to the end of `server/services/notification.ts`:

```typescript
export async function getNotifications(userId: string, limit: number = 50) {
  return db.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}

export async function createBulkNotifications(
  recipientIds: string[],
  type: string,
  title: string,
  body?: string
) {
  if (recipientIds.length === 0) return;

  return db.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      type,
      title,
      body: body || null,
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/notification.ts
git commit -m "feat(phase6): add bulk notifications, paginated list, and mark-all-read to notification service"
```

---

## Task 7: Add server actions for leave requests, announcements, and notifications

**Files:**
- Create: `server/actions/leave-request.ts`
- Create: `server/actions/announcement.ts`
- Create: `server/actions/notification.ts`

- [ ] **Step 1: Create leave request server actions**

Create `server/actions/leave-request.ts`:

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createLeaveRequest, reviewLeaveRequest } from "@/server/services/leave-request";
import { createLeaveRequestSchema, reviewLeaveRequestSchema } from "@/lib/validations/leave-request";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

export async function createLeaveRequestAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createLeaveRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return { error: "noStudentProfile" };
  }

  try {
    await createLeaveRequest(parsed.data, studentProfile.id, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/student/leave-requests");
  revalidatePath("/en/student/leave-requests");
  revalidatePath("/ar/moderator/leave-requests");
  revalidatePath("/en/moderator/leave-requests");
  return { success: true };
}

export async function reviewLeaveRequestAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LEAVE_REQUESTS_REVIEW);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = reviewLeaveRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await reviewLeaveRequest(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/student/leave-requests");
  revalidatePath("/en/student/leave-requests");
  revalidatePath("/ar/moderator/leave-requests");
  revalidatePath("/en/moderator/leave-requests");
  return { success: true };
}
```

- [ ] **Step 2: Create announcement server actions**

Create `server/actions/announcement.ts`:

```typescript
"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requireApprovedUser } from "@/server/auth/session";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/server/services/announcement";
import { createAnnouncementSchema, updateAnnouncementSchema } from "@/lib/validations/announcement";
import { revalidatePath } from "next/cache";

export async function createAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createAnnouncementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createAnnouncement(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  revalidatePath("/ar/admin/dashboard");
  revalidatePath("/en/admin/dashboard");
  revalidatePath("/ar/moderator/dashboard");
  revalidatePath("/en/moderator/dashboard");
  revalidatePath("/ar/student/dashboard");
  revalidatePath("/en/student/dashboard");
  revalidatePath("/ar/support/dashboard");
  revalidatePath("/en/support/dashboard");
  return { success: true };
}

export async function updateAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateAnnouncementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateAnnouncement(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  return { success: true };
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const session = await requireApprovedUser();

  const announcementId = formData.get("announcementId") as string;
  if (!announcementId) {
    return { error: "missingId" };
  }

  try {
    await deleteAnnouncement(announcementId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidatePath("/ar/admin/announcements");
  revalidatePath("/en/admin/announcements");
  return { success: true };
}
```

- [ ] **Step 3: Create notification server actions**

Create `server/actions/notification.ts`:

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { markNotificationRead, markAllNotificationsRead } from "@/server/services/notification";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(formData: FormData) {
  await requireApprovedUser();

  const notificationId = formData.get("notificationId") as string;
  if (!notificationId) {
    return { error: "missingId" };
  }

  await markNotificationRead(notificationId);
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await requireApprovedUser();

  await markAllNotificationsRead(session.user.id);

  revalidatePath("/ar");
  revalidatePath("/en");
  return { success: true };
}
```

- [ ] **Step 4: Commit**

```bash
git add server/actions/leave-request.ts server/actions/announcement.ts server/actions/notification.ts
git commit -m "feat(phase6): add server actions for leave requests, announcements, and notifications"
```

---

## Task 8: Add sidebar navigation entries

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add icon import and nav items**

In `components/layout/sidebar.tsx`, add `CalendarOff` and `Megaphone` to the lucide-react imports:

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
} from "lucide-react";
```

Add to `adminNav` array (after the `sessions` entry):

```typescript
  { labelKey: "announcements", href: "/admin/announcements", icon: Megaphone },
```

Add to `moderatorNav` array (after the `memorization` entry):

```typescript
  { labelKey: "leaveRequests", href: "/moderator/leave-requests", icon: CalendarOff },
```

Add to `studentNav` array (after the `memorization` entry):

```typescript
  { labelKey: "leaveRequests", href: "/student/leave-requests", icon: CalendarOff },
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(phase6): add leave requests and announcements nav items to sidebar"
```

---

## Task 9: Add notification bell component and integrate into header

**Files:**
- Create: `components/layout/notification-bell.tsx`
- Modify: `components/layout/header.tsx`

- [ ] **Step 1: Create the notification bell client component**

Create `components/layout/notification-bell.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import Link from "next/link";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string, t: ReturnType<typeof useTranslations>) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  if (diffHr < 24) return t("hoursAgo", { count: diffHr });
  return t("daysAgo", { count: diffDay });
}

export function NotificationBell({
  unreadCount,
  notifications,
  role,
}: {
  unreadCount: number;
  notifications: NotificationItem[];
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const t = useTranslations("notifications");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (notificationId: string) => {
    const formData = new FormData();
    formData.set("notificationId", notificationId);
    await markNotificationReadAction(formData);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">{t("title")}</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {t("noNotifications")}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`block w-full border-b px-4 py-3 text-start text-sm hover:bg-accent ${
                    !n.read ? "bg-accent/50" : ""
                  }`}
                >
                  <p className={`${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(n.createdAt, t)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="border-t px-4 py-2 text-center">
            <Link
              href={`/${locale}/${role}/notifications`}
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate the bell into the header**

Modify `components/layout/header.tsx`. Add imports:

```typescript
import { getUnreadCount, getUnreadNotifications } from "@/server/services/notification";
import { NotificationBell } from "./notification-bell";
```

In the return JSX, add the notification bell between `<LocaleSwitcher />` and the logout form. The right-side `div` should become:

```tsx
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <NotificationBell
          unreadCount={unreadCount}
          notifications={recentNotifications}
          role={session.user.role}
        />
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            {t("logout")}
          </Button>
        </form>
      </div>
```

And add the data fetching before the return statement (after the `roleLabels` object):

```typescript
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(session.user.id),
    getUnreadNotifications(session.user.id),
  ]);
```

The `recentNotifications` need to be serialized for the client component. Add this transformation:

```typescript
  const serializedNotifications = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
```

Then use `serializedNotifications` instead of `recentNotifications` in the JSX prop.

- [ ] **Step 3: Commit**

```bash
git add components/layout/notification-bell.tsx components/layout/header.tsx
git commit -m "feat(phase6): add notification bell component with dropdown to header"
```

---

## Task 10: Add student leave requests page

**Files:**
- Create: `app/[locale]/(dashboard)/student/leave-requests/page.tsx`

- [ ] **Step 1: Create the student leave requests page**

Create `app/[locale]/(dashboard)/student/leave-requests/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentLeaveRequests, getUpcomingSessionsForStudent } from "@/server/services/leave-request";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createLeaveRequestAction } from "@/server/actions/leave-request";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createLeaveRequest = createLeaveRequestAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default async function StudentLeaveRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("leave_requests");
  if (!enabled) notFound();

  const t = await getTranslations("leaveRequests");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noRequests")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [requests, upcomingSessions] = await Promise.all([
    getStudentLeaveRequests(studentProfile.id),
    getUpcomingSessionsForStudent(studentProfile.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("requestLeave")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
          ) : (
            <form action={createLeaveRequest} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("selectSession")}</Label>
                <select
                  name="sessionId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {upcomingSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString(locale)} — {s.group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("reason")}</Label>
                <textarea
                  name="reason"
                  required
                  placeholder={t("reasonPlaceholder")}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">{t("submit")}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sessionDate")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("submittedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  {new Date(req.session.date).toLocaleDateString(locale)}
                </TableCell>
                <TableCell>{req.session.group.name}</TableCell>
                <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[req.status] || ""}>
                    {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(req.createdAt).toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noRequests")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/leave-requests/page.tsx"
git commit -m "feat(phase6): add student leave requests page with request form and history table"
```

---

## Task 11: Add moderator leave requests page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/leave-requests/page.tsx`

- [ ] **Step 1: Create the moderator leave requests page**

Create `app/[locale]/(dashboard)/moderator/leave-requests/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getModeratorLeaveRequests } from "@/server/services/leave-request";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { reviewLeaveRequestAction } from "@/server/actions/leave-request";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const reviewLeaveRequest = reviewLeaveRequestAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default async function ModeratorLeaveRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.LEAVE_REQUESTS_REVIEW);

  const enabled = await isFeatureEnabled("leave_requests");
  if (!enabled) notFound();

  const t = await getTranslations("leaveRequests");

  const showAll = filter === "all";
  const requests = await getModeratorLeaveRequests(
    session.user.id,
    showAll ? undefined : "PENDING"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/moderator/leave-requests` : `/${locale}/moderator/leave-requests?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showPending") : t("showAll")}
          </Button>
        </a>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noRequests")}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("sessionDate")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
              <TableHead>{t("submittedAt")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const studentName = req.student.user.nameAr || req.student.user.name;
              return (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{studentName}</TableCell>
                  <TableCell>{req.session.group.name}</TableCell>
                  <TableCell>
                    {new Date(req.session.date).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                  <TableCell>
                    {new Date(req.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[req.status] || ""}>
                      {t(req.status.toLowerCase() as "pending" | "approved" | "rejected")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {req.status === "PENDING" && (
                      <div className="flex gap-1">
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="APPROVED" />
                          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                            {t("approve")}
                          </Button>
                        </form>
                        <form action={reviewLeaveRequest}>
                          <input type="hidden" name="leaveRequestId" value={req.id} />
                          <input type="hidden" name="action" value="REJECTED" />
                          <Button type="submit" size="sm" variant="destructive">
                            {t("reject")}
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/leave-requests/page.tsx"
git commit -m "feat(phase6): add moderator leave requests page with approve/reject actions"
```

---

## Task 12: Add admin announcements page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/announcements/page.tsx`

- [ ] **Step 1: Create the admin announcements page**

Create `app/[locale]/(dashboard)/admin/announcements/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listAnnouncements } from "@/server/services/announcement";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/server/actions/announcement";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createAnnouncement = createAnnouncementAction as unknown as (formData: FormData) => void;
const deleteAnnouncementFn = deleteAnnouncementAction as unknown as (formData: FormData) => void;

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-gray-100 text-gray-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
};

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE);

  const enabled = await isFeatureEnabled("announcements");
  if (!enabled) notFound();

  const t = await getTranslations("announcements");

  const [announcements, roles, groups] = await Promise.all([
    listAnnouncements(),
    db.role.findMany({ select: { name: true, nameAr: true }, orderBy: { name: "asc" } }),
    db.group.findMany({ select: { id: true, name: true }, where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncement} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("announcementTitle")}</Label>
                <Input name="title" required />
              </div>
              <div className="space-y-2">
                <Label>{t("priority")}</Label>
                <select
                  name="priority"
                  defaultValue="normal"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="normal">{t("priorityNormal")}</option>
                  <option value="high">{t("priorityHigh")}</option>
                  <option value="urgent">{t("priorityUrgent")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("body")}</Label>
              <textarea
                name="body"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("targetType")}</Label>
                <select
                  name="targetType"
                  defaultValue="ALL"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ALL">{t("targetAll")}</option>
                  <option value="ROLE">{t("targetRole")}</option>
                  <option value="GROUP">{t("targetGroup")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("targetId")}</Label>
                <select
                  name="targetId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("targetAll")}</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.nameAr} ({r.name})
                    </option>
                  ))}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("expiryDate")}</Label>
                <Input name="expiryDate" type="date" />
              </div>
            </div>

            <div>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {announcements.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("announcementTitle")}</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("targetType")}</TableHead>
              <TableHead>{t("publishDate")}</TableHead>
              <TableHead>{t("expiryDate")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((ann) => {
              const isExpired = ann.expiryDate && new Date(ann.expiryDate) < now;
              return (
                <TableRow key={ann.id}>
                  <TableCell className="font-medium">{ann.title}</TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[ann.priority] || ""}>
                      {t(`priority${ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}` as "priorityNormal" | "priorityHigh" | "priorityUrgent")}
                    </Badge>
                  </TableCell>
                  <TableCell>{ann.targetType || "ALL"}</TableCell>
                  <TableCell>
                    {new Date(ann.publishDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    {ann.expiryDate
                      ? new Date(ann.expiryDate).toLocaleDateString(locale)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={isExpired ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}>
                      {isExpired ? t("expired") : t("active")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form action={deleteAnnouncementFn}>
                      <input type="hidden" name="announcementId" value={ann.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        {t("delete")}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noAnnouncements")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/announcements/page.tsx"
git commit -m "feat(phase6): add admin announcements page with create form and listing"
```

---

## Task 13: Add notifications page (all roles)

**Files:**
- Create: `app/[locale]/(dashboard)/student/notifications/page.tsx`
- Create: `app/[locale]/(dashboard)/moderator/notifications/page.tsx`
- Create: `app/[locale]/(dashboard)/admin/notifications/page.tsx`
- Create: `app/[locale]/(dashboard)/support/notifications/page.tsx`

- [ ] **Step 1: Create a shared notifications page component approach**

Since all four roles use the same notifications page, we create each page file. Each is small and calls the same service.

Create `app/[locale]/(dashboard)/student/notifications/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotifications } from "@/server/services/notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const markRead = markNotificationReadAction as unknown as (formData: FormData) => void;
const markAllRead = markAllNotificationsReadAction as unknown as () => void;

export default async function StudentNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const notifications = await getNotifications(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm">{t("markAllRead")}</Button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noNotifications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale)}{" "}
                    {new Date(n.createdAt).toLocaleTimeString(locale)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Badge className="bg-blue-100 text-blue-800">
                        {locale === "ar" ? "جديد" : "New"}
                      </Badge>
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create moderator notifications page**

Create `app/[locale]/(dashboard)/moderator/notifications/page.tsx` with the same content as above but rename the function to `ModeratorNotificationsPage`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotifications } from "@/server/services/notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const markRead = markNotificationReadAction as unknown as (formData: FormData) => void;
const markAllRead = markAllNotificationsReadAction as unknown as () => void;

export default async function ModeratorNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const notifications = await getNotifications(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm">{t("markAllRead")}</Button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noNotifications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale)}{" "}
                    {new Date(n.createdAt).toLocaleTimeString(locale)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Badge className="bg-blue-100 text-blue-800">
                        {locale === "ar" ? "جديد" : "New"}
                      </Badge>
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create admin notifications page**

Create `app/[locale]/(dashboard)/admin/notifications/page.tsx` with the same content, function named `AdminNotificationsPage`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotifications } from "@/server/services/notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const markRead = markNotificationReadAction as unknown as (formData: FormData) => void;
const markAllRead = markAllNotificationsReadAction as unknown as () => void;

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const notifications = await getNotifications(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm">{t("markAllRead")}</Button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noNotifications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale)}{" "}
                    {new Date(n.createdAt).toLocaleTimeString(locale)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Badge className="bg-blue-100 text-blue-800">
                        {locale === "ar" ? "جديد" : "New"}
                      </Badge>
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create support notifications page**

Create `app/[locale]/(dashboard)/support/notifications/page.tsx` with the same content, function named `SupportNotificationsPage`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getNotifications } from "@/server/services/notification";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const markRead = markNotificationReadAction as unknown as (formData: FormData) => void;
const markAllRead = markAllNotificationsReadAction as unknown as () => void;

export default async function SupportNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("notifications");
  const notifications = await getNotifications(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm">{t("markAllRead")}</Button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noNotifications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-accent/30" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString(locale)}{" "}
                    {new Date(n.createdAt).toLocaleTimeString(locale)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Badge className="bg-blue-100 text-blue-800">
                        {locale === "ar" ? "جديد" : "New"}
                      </Badge>
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(dashboard)/student/notifications/page.tsx" "app/[locale]/(dashboard)/moderator/notifications/page.tsx" "app/[locale]/(dashboard)/admin/notifications/page.tsx" "app/[locale]/(dashboard)/support/notifications/page.tsx"
git commit -m "feat(phase6): add notifications page for all roles"
```

---

## Task 14: Add announcement banners to dashboard pages

**Files:**
- Modify: `app/[locale]/(dashboard)/admin/dashboard/page.tsx`
- Modify: `app/[locale]/(dashboard)/moderator/dashboard/page.tsx`
- Modify: `app/[locale]/(dashboard)/student/dashboard/page.tsx`
- Modify: `app/[locale]/(dashboard)/support/dashboard/page.tsx`

- [ ] **Step 1: Add announcements to admin dashboard**

In `app/[locale]/(dashboard)/admin/dashboard/page.tsx`:

Add import:
```typescript
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
```

After `await requireApprovedUser()` (line 18), capture the session:
```typescript
  const session = await requireApprovedUser();
```

(Note: the current file calls `await requireApprovedUser()` without saving the result. Change it to `const session = await requireApprovedUser();`)

Add to the `Promise.all` array:
```typescript
  const [pendingCount, activeStudents, activeModerators, enrollmentSetting, announcements] =
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
      getActiveAnnouncementsForUser(session.user.id),
    ]);
```

In the return JSX, add the announcement banner right after `<h1>` and before the cards grid:

```tsx
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
```

- [ ] **Step 2: Add announcements to moderator dashboard**

In `app/[locale]/(dashboard)/moderator/dashboard/page.tsx`:

Add import:
```typescript
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
```

After `const groups = await getModeratorGroups(session.user.id);`, add:
```typescript
  const announcements = await getActiveAnnouncementsForUser(session.user.id);
```

In the return JSX, add the same announcement banner block right after `<h1>` and before the groups check:

```tsx
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
```

- [ ] **Step 3: Add announcements to student dashboard**

In `app/[locale]/(dashboard)/student/dashboard/page.tsx`:

Add import:
```typescript
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";
```

The student dashboard uses `auth()` directly. After the application check (around line 39), add:
```typescript
  const announcements = await getActiveAnnouncementsForUser(session.user.id);
```

In the return JSX (the main return, after `<h1>`), add the same announcement banner block before the group assignment check.

- [ ] **Step 4: Add announcements to support dashboard**

In `app/[locale]/(dashboard)/support/dashboard/page.tsx`:

Replace the entire file with:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getActiveAnnouncementsForUser } from "@/server/services/announcement";

export default async function SupportDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const announcements = await getActiveAnnouncementsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {locale === "ar" ? "لوحة تحكم الدعم" : "Support Dashboard"}
      </h1>

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

      <p className="text-muted-foreground">
        {locale === "ar" ? "قريباً" : "Coming soon"}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/dashboard/page.tsx" "app/[locale]/(dashboard)/moderator/dashboard/page.tsx" "app/[locale]/(dashboard)/student/dashboard/page.tsx" "app/[locale]/(dashboard)/support/dashboard/page.tsx"
git commit -m "feat(phase6): add announcement banners to all dashboard pages"
```

---

## Task 15: Verify the full build compiles

**Files:** None (verification only)

- [ ] **Step 1: Run Prisma generate**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
```

Expected: Success

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No new errors (only pre-existing test mock errors in `server/permissions/__tests__/check.test.ts`)

- [ ] **Step 3: Run Next.js build check**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -50
```

Expected: Build succeeds. All new pages compile. Verify these routes appear:
- `/[locale]/student/leave-requests`
- `/[locale]/moderator/leave-requests`
- `/[locale]/admin/announcements`
- `/[locale]/student/notifications`
- `/[locale]/moderator/notifications`
- `/[locale]/admin/notifications`
- `/[locale]/support/notifications`

- [ ] **Step 4: Commit any fixes if needed**

If there are TypeScript or build errors from the above steps, fix them and commit:

```bash
git add -A
git commit -m "fix(phase6): resolve build errors"
```

---

## Deferred to Phase 6.1

The following items from the spec are intentionally deferred:

- **Email notification delivery** — the `email_notifications` flag exists but email infrastructure is out of scope
- **Notification preferences** — user-level opt-in/opt-out per notification type
- **Announcement rich text editor** — body is plain textarea; a markdown or WYSIWYG editor could be added later
- **Leave request calendar view** — visual calendar showing approved leaves for a group
- **Push notifications** — browser push or mobile notifications
