# Phase 7: Support Tickets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a support ticket system where students create tickets, admin assigns them to support staff, and support staff resolves them via a reply thread.

**Architecture:** Three new Prisma models (TicketStatus enum, SupportTicket, TicketReply). One service file handles all ticket logic. One actions file wraps mutations as server actions. Six pages across three roles (student list+detail, support list+detail, admin list+detail). Notifications use the existing `createNotification`/`createBulkNotifications` functions.

**Tech Stack:** Next.js App Router (async server components), Prisma 7.8, Zod, next-intl, shadcn/ui, lucide-react

**Important build notes:**
- No database in worktree — use `DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"` for `npx prisma generate` and `next build`
- Prisma uses `db push` not migrations
- Server action type cast pattern: `const fn = actionFn as unknown as (formData: FormData) => void;`
- `params` and `searchParams` are `Promise<>` types in Next.js App Router pages — always `await` them
- Tailwind v4 with CSS-based config — NOT tailwind.config.ts

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `lib/validations/support-ticket.ts` | Zod schemas: createTicket, addReply, assignTicket, changeStatus |
| `server/services/support-ticket.ts` | All ticket CRUD, reply logic, assignment, status transitions, notifications |
| `server/actions/support-ticket.ts` | Server actions wrapping service calls with auth + validation |
| `app/[locale]/(dashboard)/student/tickets/page.tsx` | Student ticket list + create form |
| `app/[locale]/(dashboard)/student/tickets/[ticketId]/page.tsx` | Student ticket detail + reply thread |
| `app/[locale]/(dashboard)/support/tickets/[ticketId]/page.tsx` | Support ticket detail + reply thread + actions |
| `app/[locale]/(dashboard)/admin/tickets/page.tsx` | Admin ticket list + assignment |
| `app/[locale]/(dashboard)/admin/tickets/[ticketId]/page.tsx` | Admin ticket detail + close/re-open |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add TicketStatus enum, SupportTicket model, TicketReply model, reverse relations on User and StudentProfile |
| `app/[locale]/(dashboard)/support/tickets/page.tsx` | Replace "Coming soon" stub with real assigned-tickets list |
| `components/layout/sidebar.tsx` | Add student "support" nav item, admin "tickets" nav item |
| `messages/en.json` | Add `supportTickets` i18n namespace (~30 keys) |
| `messages/ar.json` | Add `supportTickets` i18n namespace (~30 keys) |

---

### Task 1: Prisma Schema — Add TicketStatus, SupportTicket, and TicketReply

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add TicketStatus enum after the existing LeaveRequestStatus enum**

Find the `LeaveRequestStatus` enum (around line 275-279) and add below it:

```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

- [ ] **Step 2: Add SupportTicket model after the Announcement model (end of file, before closing)**

```prisma
// ============================================================
// Support Tickets
// ============================================================

model SupportTicket {
  id           String       @id @default(cuid())
  subject      String
  body         String
  status       TicketStatus @default(OPEN)
  escalated    Boolean      @default(false)
  studentId    String
  student      StudentProfile @relation(fields: [studentId], references: [id])
  assignedToId String?
  assignedTo   User?        @relation("ticketAssignee", fields: [assignedToId], references: [id])
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  replies TicketReply[]

  @@index([studentId])
  @@index([assignedToId])
  @@index([status])
}

model TicketReply {
  id        String        @id @default(cuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  String
  author    User          @relation("ticketReplyAuthor", fields: [authorId], references: [id])
  body      String
  createdAt DateTime      @default(now())

  @@index([ticketId])
}
```

- [ ] **Step 3: Add reverse relations to existing models**

On the `User` model, add these two fields after `createdAnnouncements`:

```prisma
  assignedTickets       SupportTicket[]    @relation("ticketAssignee")
  ticketReplies         TicketReply[]      @relation("ticketReplyAuthor")
```

On the `StudentProfile` model, add this field after `leaveRequests`:

```prisma
  supportTickets     SupportTicket[]
```

- [ ] **Step 4: Validate schema**

Run:
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma validate
```
Expected: "The schema at prisma/schema.prisma is valid"

- [ ] **Step 5: Generate Prisma client**

Run:
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
```
Expected: "Generated Prisma Client"

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add SupportTicket and TicketReply models with TicketStatus enum"
```

---

### Task 2: i18n — Add supportTickets namespace to both locales

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add `supportTickets` namespace to `messages/en.json`**

Add the following key after the `"notifications"` namespace (or at the end before the closing `}`):

```json
"supportTickets": {
  "title": "Support Tickets",
  "createTicket": "Create Ticket",
  "subject": "Subject",
  "subjectPlaceholder": "Brief summary of your issue...",
  "body": "Description",
  "bodyPlaceholder": "Describe your issue in detail...",
  "reply": "Reply",
  "replyPlaceholder": "Type your reply...",
  "submit": "Submit",
  "send": "Send Reply",
  "status": "Status",
  "createdAt": "Created",
  "updatedAt": "Last Updated",
  "studentName": "Student",
  "assignedTo": "Assigned To",
  "unassigned": "Unassigned",
  "escalated": "Escalated",
  "noTickets": "No support tickets",
  "backToList": "Back to tickets",
  "open": "Open",
  "inProgress": "In Progress",
  "resolved": "Resolved",
  "closed": "Closed",
  "start": "Start",
  "resolve": "Resolve",
  "escalate": "Escalate to Admin",
  "close": "Close Ticket",
  "reopen": "Re-open",
  "assign": "Assign",
  "selectStaff": "Select support staff...",
  "showAll": "Show All",
  "showActive": "Show Active Only",
  "threadTitle": "Conversation",
  "you": "You",
  "readOnly": "This ticket is closed and read-only."
}
```

- [ ] **Step 2: Add `supportTickets` namespace to `messages/ar.json`**

```json
"supportTickets": {
  "title": "تذاكر الدعم",
  "createTicket": "إنشاء تذكرة",
  "subject": "الموضوع",
  "subjectPlaceholder": "ملخص قصير لمشكلتك...",
  "body": "الوصف",
  "bodyPlaceholder": "صف مشكلتك بالتفصيل...",
  "reply": "رد",
  "replyPlaceholder": "اكتب ردك...",
  "submit": "إرسال",
  "send": "إرسال الرد",
  "status": "الحالة",
  "createdAt": "تاريخ الإنشاء",
  "updatedAt": "آخر تحديث",
  "studentName": "الطالب",
  "assignedTo": "مسند إلى",
  "unassigned": "غير مسند",
  "escalated": "مصعّد",
  "noTickets": "لا توجد تذاكر دعم",
  "backToList": "العودة للتذاكر",
  "open": "مفتوح",
  "inProgress": "قيد المعالجة",
  "resolved": "تم الحل",
  "closed": "مغلق",
  "start": "بدء",
  "resolve": "حل",
  "escalate": "تصعيد للإدارة",
  "close": "إغلاق التذكرة",
  "reopen": "إعادة فتح",
  "assign": "تعيين",
  "selectStaff": "اختر موظف الدعم...",
  "showAll": "عرض الكل",
  "showActive": "عرض النشطة فقط",
  "threadTitle": "المحادثة",
  "you": "أنت",
  "readOnly": "هذه التذكرة مغلقة وللقراءة فقط."
}
```

- [ ] **Step 3: Add nav keys if missing**

Check `messages/en.json` → `nav` object. The key `"tickets": "Support Tickets"` already exists. Also add `"support": "Support"` for the student sidebar item if not present.

In `messages/en.json` `nav` section, add:
```json
"support": "Support"
```

In `messages/ar.json` `nav` section, add:
```json
"support": "الدعم"
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): add supportTickets namespace for both locales"
```

---

### Task 3: Zod Validation Schemas

**Files:**
- Create: `lib/validations/support-ticket.ts`

- [ ] **Step 1: Create the validation file with all schemas**

```typescript
import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export type AddReplyInput = z.infer<typeof addReplySchema>;

export const assignTicketSchema = z.object({
  ticketId: z.string().min(1),
  assignedToId: z.string().min(1),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const changeTicketStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export type ChangeTicketStatusInput = z.infer<typeof changeTicketStatusSchema>;

export const escalateTicketSchema = z.object({
  ticketId: z.string().min(1),
});

export type EscalateTicketInput = z.infer<typeof escalateTicketSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validations/support-ticket.ts
git commit -m "feat: add Zod validation schemas for support tickets"
```

---

### Task 4: Support Ticket Service

**Files:**
- Create: `server/services/support-ticket.ts`

- [ ] **Step 1: Create the service file with all functions**

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification, createBulkNotifications } from "./notification";
import type {
  CreateTicketInput,
  AddReplyInput,
  AssignTicketInput,
  ChangeTicketStatusInput,
} from "@/lib/validations/support-ticket";

async function getAdminUserIds(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { accountStatus: "ACTIVE", role: { name: "admin" } },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

export async function createTicket(
  input: CreateTicketInput,
  studentProfileId: string,
  actorId: string
) {
  const ticket = await db.supportTicket.create({
    data: {
      subject: input.subject,
      body: input.body,
      studentId: studentProfileId,
    },
  });

  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await createBulkNotifications(
      adminIds,
      "TICKET_CREATED",
      `New support ticket: ${input.subject}`
    );
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.create",
    entityType: "SupportTicket",
    entityId: ticket.id,
    metadata: { subject: input.subject },
  });

  return ticket;
}

export async function addReply(
  input: AddReplyInput,
  actorId: string
) {
  const ticket = await db.supportTicket.findUniqueOrThrow({
    where: { id: input.ticketId },
    include: {
      student: { include: { user: { select: { id: true } } } },
    },
  });

  const reply = await db.ticketReply.create({
    data: {
      ticketId: input.ticketId,
      authorId: actorId,
      body: input.body,
    },
  });

  const isStudentReplying = ticket.student.user.id === actorId;

  if (isStudentReplying && ticket.assignedToId) {
    await createNotification({
      recipientId: ticket.assignedToId,
      type: "TICKET_REPLY",
      title: `New reply on ticket: ${ticket.subject}`,
    });
  } else if (!isStudentReplying) {
    await createNotification({
      recipientId: ticket.student.user.id,
      type: "TICKET_REPLY",
      title: `New reply on your ticket: ${ticket.subject}`,
    });
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.reply",
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: {},
  });

  return reply;
}

export async function assignTicket(
  input: AssignTicketInput,
  actorId: string
) {
  const ticket = await db.supportTicket.update({
    where: { id: input.ticketId },
    data: { assignedToId: input.assignedToId },
  });

  await createNotification({
    recipientId: input.assignedToId,
    type: "TICKET_ASSIGNED",
    title: `Ticket assigned to you: ${ticket.subject}`,
  });

  await createAuditLog({
    actorId,
    action: "support_ticket.assign",
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: { assignedToId: input.assignedToId },
  });

  return ticket;
}

export async function changeTicketStatus(
  input: ChangeTicketStatusInput,
  actorId: string
) {
  const ticket = await db.supportTicket.update({
    where: { id: input.ticketId },
    data: { status: input.status },
    include: {
      student: { include: { user: { select: { id: true } } } },
    },
  });

  if (input.status === "RESOLVED") {
    await createNotification({
      recipientId: ticket.student.user.id,
      type: "TICKET_RESOLVED",
      title: `Your ticket has been resolved: ${ticket.subject}`,
    });
  }

  await createAuditLog({
    actorId,
    action: `support_ticket.${input.status.toLowerCase()}`,
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: { status: input.status },
  });

  return ticket;
}

export async function escalateTicket(ticketId: string, actorId: string) {
  const ticket = await db.supportTicket.update({
    where: { id: ticketId },
    data: { escalated: true },
  });

  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await createBulkNotifications(
      adminIds,
      "TICKET_ESCALATED",
      `Ticket escalated: ${ticket.subject}`
    );
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.escalate",
    entityType: "SupportTicket",
    entityId: ticketId,
    metadata: {},
  });

  return ticket;
}

export async function getStudentTickets(studentProfileId: string) {
  return db.supportTicket.findMany({
    where: { studentId: studentProfileId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicketWithReplies(ticketId: string) {
  return db.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      student: {
        include: { user: { select: { id: true, name: true, nameAr: true } } },
      },
      assignedTo: { select: { id: true, name: true, nameAr: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, nameAr: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getAssignedTickets(
  userId: string,
  statusFilter?: "active" | "all"
) {
  return db.supportTicket.findMany({
    where: {
      assignedToId: userId,
      ...(statusFilter === "active" || !statusFilter
        ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
        : {}),
    },
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAllTickets(statusFilter?: "active" | "all") {
  return db.supportTicket.findMany({
    where:
      statusFilter === "active" || !statusFilter
        ? { status: { not: "CLOSED" } }
        : {},
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      assignedTo: { select: { name: true, nameAr: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/support-ticket.ts
git commit -m "feat: add support ticket service with CRUD, replies, assignment, and notifications"
```

---

### Task 5: Server Actions

**Files:**
- Create: `server/actions/support-ticket.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createTicket,
  addReply,
  assignTicket,
  changeTicketStatus,
  escalateTicket,
} from "@/server/services/support-ticket";
import {
  createTicketSchema,
  addReplySchema,
  assignTicketSchema,
  changeTicketStatusSchema,
  escalateTicketSchema,
} from "@/lib/validations/support-ticket";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

function revalidateTicketPaths() {
  revalidatePath("/ar/student/tickets");
  revalidatePath("/en/student/tickets");
  revalidatePath("/ar/support/tickets");
  revalidatePath("/en/support/tickets");
  revalidatePath("/ar/admin/tickets");
  revalidatePath("/en/admin/tickets");
}

export async function createTicketAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTicketSchema.safeParse(raw);
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
    await createTicket(parsed.data, studentProfile.id, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function addReplyAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = addReplySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await addReply(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function assignTicketAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = assignTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await assignTicket(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function changeTicketStatusAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = changeTicketStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await changeTicketStatus(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function escalateTicketAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_ESCALATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = escalateTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await escalateTicket(parsed.data.ticketId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/actions/support-ticket.ts
git commit -m "feat: add support ticket server actions with auth, validation, and revalidation"
```

---

### Task 6: Sidebar Navigation Updates

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add the `Headset` icon import**

In the icon imports from `lucide-react`, add `Headset` to the import list:

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
} from "lucide-react";
```

- [ ] **Step 2: Add admin "tickets" nav item**

In the `adminNav` array, add after the `announcements` entry:

```typescript
  { labelKey: "tickets", href: "/admin/tickets", icon: FileText },
```

- [ ] **Step 3: Add student "support" nav item**

In the `studentNav` array, add after the `leaveRequests` entry:

```typescript
  { labelKey: "support", href: "/student/tickets", icon: Headset },
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add student support and admin tickets nav items to sidebar"
```

---

### Task 7: Student Ticket List Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/tickets/page.tsx`

- [ ] **Step 1: Create the student tickets list page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createTicketAction } from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
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

const createTicket = createTicketAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function StudentTicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

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
            {t("noTickets")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tickets = await getStudentTickets(studentProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createTicket")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("subject")}</Label>
              <Input name="subject" required placeholder={t("subjectPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("body")}</Label>
              <textarea
                name="body"
                required
                placeholder={t("bodyPlaceholder")}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Button type="submit">{t("submit")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tickets.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("updatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/${locale}/student/tickets/${ticket.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[ticket.status] || ""}>
                    {t(ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase() as "open" | "resolved" | "closed")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(ticket.createdAt).toLocaleDateString(locale)}
                </TableCell>
                <TableCell>
                  {new Date(ticket.updatedAt).toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/tickets/page.tsx
git commit -m "feat: add student ticket list page with create form"
```

---

### Task 8: Student Ticket Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/tickets/[ticketId]/page.tsx`

- [ ] **Step 1: Create the student ticket detail page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { addReplyAction } from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const addReply = addReplyAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function StudentTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) notFound();

  let ticket;
  try {
    ticket = await getTicketWithReplies(ticketId);
  } catch {
    notFound();
  }

  if (ticket.studentId !== studentProfile.id) notFound();

  const t = await getTranslations("supportTickets");
  const canReply = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/student/tickets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <Badge className={STATUS_COLORS[ticket.status] || ""}>
          {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t("threadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {ticket.student.user.nameAr || ticket.student.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString(locale)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          </div>

          {ticket.replies.map((reply) => {
            const isMe = reply.author.id === session.user.id;
            return (
              <div
                key={reply.id}
                className={`rounded-lg border p-4 ${isMe ? "bg-muted/50" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {isMe ? t("you") : (reply.author.nameAr || reply.author.name)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reply.createdAt).toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canReply ? (
        <Card>
          <CardContent className="pt-6">
            <form action={addReply} className="space-y-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="body"
                required
                placeholder={t("replyPlaceholder")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit">{t("send")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/tickets/\[ticketId\]/page.tsx
git commit -m "feat: add student ticket detail page with reply thread"
```

---

### Task 9: Support Ticket List Page (replace stub)

**Files:**
- Modify: `app/[locale]/(dashboard)/support/tickets/page.tsx`

- [ ] **Step 1: Replace the entire stub with the real page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAssignedTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function SupportTicketsPage({
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
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

  const showAll = filter === "all";
  const tickets = await getAssignedTickets(
    session.user.id,
    showAll ? "all" : "active"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/support/tickets` : `/${locale}/support/tickets?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("escalated")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("updatedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const studentName = ticket.student.user.nameAr || ticket.student.user.name;
              const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/support/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{studentName}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[ticket.status] || ""}>
                      {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.escalated && (
                      <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.updatedAt).toLocaleDateString(locale)}
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
git add app/\[locale\]/\(dashboard\)/support/tickets/page.tsx
git commit -m "feat: replace support tickets stub with real assigned-tickets list page"
```

---

### Task 10: Support Ticket Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/support/tickets/[ticketId]/page.tsx`

- [ ] **Step 1: Create the support ticket detail page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  addReplyAction,
  changeTicketStatusAction,
  escalateTicketAction,
} from "@/server/actions/support-ticket";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const addReply = addReplyAction as unknown as (formData: FormData) => void;
const changeStatus = changeTicketStatusAction as unknown as (formData: FormData) => void;
const escalate = escalateTicketAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  let ticket;
  try {
    ticket = await getTicketWithReplies(ticketId);
  } catch {
    notFound();
  }

  if (ticket.assignedToId !== session.user.id) notFound();

  const t = await getTranslations("supportTickets");
  const canReply = ticket.status !== "CLOSED";
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/support/tickets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <Badge className={STATUS_COLORS[ticket.status] || ""}>
          {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
        </Badge>
        {ticket.escalated && (
          <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {t("studentName")}: {ticket.student.user.nameAr || ticket.student.user.name}
        {" · "}
        {t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}
      </p>

      <div className="flex gap-2">
        {ticket.status === "OPEN" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="IN_PROGRESS" />
            <Button type="submit" size="sm">{t("start")}</Button>
          </form>
        )}
        {ticket.status === "IN_PROGRESS" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="RESOLVED" />
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
              {t("resolve")}
            </Button>
          </form>
        )}
        {!ticket.escalated && ticket.status !== "CLOSED" && (
          <form action={escalate}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Button type="submit" size="sm" variant="destructive">
              {t("escalate")}
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("threadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {ticket.student.user.nameAr || ticket.student.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString(locale)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          </div>

          {ticket.replies.map((reply) => {
            const isMe = reply.author.id === session.user.id;
            return (
              <div
                key={reply.id}
                className={`rounded-lg border p-4 ${isMe ? "bg-muted/50" : ""}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {isMe ? t("you") : (reply.author.nameAr || reply.author.name)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reply.createdAt).toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canReply ? (
        <Card>
          <CardContent className="pt-6">
            <form action={addReply} className="space-y-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="body"
                required
                placeholder={t("replyPlaceholder")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit">{t("send")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/support/tickets/\[ticketId\]/page.tsx
git commit -m "feat: add support ticket detail page with reply thread and status actions"
```

---

### Task 11: Admin Ticket List Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/tickets/page.tsx`

- [ ] **Step 1: Create the admin tickets list page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAllTickets } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { assignTicketAction } from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const assignTicket = assignTicketAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function AdminTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  const t = await getTranslations("supportTickets");

  const showAll = filter === "all";
  const [tickets, supportUsers] = await Promise.all([
    getAllTickets(showAll ? "all" : "active"),
    db.user.findMany({
      where: { accountStatus: "ACTIVE", role: { name: "support" } },
      select: { id: true, name: true, nameAr: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href={showAll ? `/${locale}/admin/tickets` : `/${locale}/admin/tickets?filter=all`}
        >
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noTickets")}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("studentName")}</TableHead>
              <TableHead>{t("assignedTo")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("escalated")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("assign")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const studentName = ticket.student.user.nameAr || ticket.student.user.name;
              const assigneeName = ticket.assignedTo
                ? (ticket.assignedTo.nameAr || ticket.assignedTo.name)
                : t("unassigned");
              const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();
              return (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/admin/tickets/${ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{studentName}</TableCell>
                  <TableCell>{assigneeName}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[ticket.status] || ""}>
                      {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.escalated && (
                      <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <form action={assignTicket} className="flex gap-1">
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <select
                        name="assignedToId"
                        required
                        defaultValue={ticket.assignedTo ? undefined : ""}
                        className="flex h-8 w-32 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="" disabled>{t("selectStaff")}</option>
                        {supportUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nameAr || u.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        {t("assign")}
                      </Button>
                    </form>
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
git add app/\[locale\]/\(dashboard\)/admin/tickets/page.tsx
git commit -m "feat: add admin ticket list page with assignment controls"
```

---

### Task 12: Admin Ticket Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/tickets/[ticketId]/page.tsx`

- [ ] **Step 1: Create the admin ticket detail page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTicketWithReplies } from "@/server/services/support-ticket";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  assignTicketAction,
  changeTicketStatusAction,
} from "@/server/actions/support-ticket";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const assignTicketFn = assignTicketAction as unknown as (formData: FormData) => void;
const changeStatus = changeTicketStatusAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; ticketId: string }>;
}) {
  const { locale, ticketId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);

  const enabled = await isFeatureEnabled("support_tickets");
  if (!enabled) notFound();

  let ticket;
  try {
    ticket = await getTicketWithReplies(ticketId);
  } catch {
    notFound();
  }

  const t = await getTranslations("supportTickets");
  const statusKey = ticket.status === "IN_PROGRESS" ? "inProgress" : ticket.status.toLowerCase();

  const supportUsers = await db.user.findMany({
    where: { accountStatus: "ACTIVE", role: { name: "support" } },
    select: { id: true, name: true, nameAr: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/tickets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <Badge className={STATUS_COLORS[ticket.status] || ""}>
          {t(statusKey as "open" | "inProgress" | "resolved" | "closed")}
        </Badge>
        {ticket.escalated && (
          <Badge className="bg-red-100 text-red-800">{t("escalated")}</Badge>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t("studentName")}: {ticket.student.user.nameAr || ticket.student.user.name}</p>
        <p>{t("assignedTo")}: {ticket.assignedTo ? (ticket.assignedTo.nameAr || ticket.assignedTo.name) : t("unassigned")}</p>
        <p>{t("createdAt")}: {new Date(ticket.createdAt).toLocaleDateString(locale)}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <form action={assignTicketFn} className="flex gap-1">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <select
            name="assignedToId"
            required
            className="flex h-9 w-40 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="" disabled selected>{t("selectStaff")}</option>
            {supportUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr || u.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">{t("assign")}</Button>
        </form>

        {ticket.status !== "CLOSED" && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="CLOSED" />
            <Button type="submit" size="sm" variant="destructive">{t("close")}</Button>
          </form>
        )}

        {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
          <form action={changeStatus}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="status" value="OPEN" />
            <Button type="submit" size="sm" variant="outline">{t("reopen")}</Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("threadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {ticket.student.user.nameAr || ticket.student.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString(locale)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          </div>

          {ticket.replies.map((reply) => (
            <div key={reply.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {reply.author.nameAr || reply.author.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(reply.createdAt).toLocaleString(locale)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/admin/tickets/\[ticketId\]/page.tsx
git commit -m "feat: add admin ticket detail page with assignment, close, and re-open controls"
```

---

### Task 13: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Generate Prisma client**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "server/permissions/__tests__" | head -30
```

Expected: No new errors (existing errors in `server/permissions/__tests__/check.test.ts` are pre-existing and unrelated).

- [ ] **Step 3: Run Next.js build**

```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build 2>&1 | tail -40
```

Expected: Build succeeds. Look for the new routes in the output:
- `/[locale]/student/tickets`
- `/[locale]/student/tickets/[ticketId]`
- `/[locale]/support/tickets`
- `/[locale]/support/tickets/[ticketId]`
- `/[locale]/admin/tickets`
- `/[locale]/admin/tickets/[ticketId]`

- [ ] **Step 4: Fix any build errors if found, then re-run build**

If there are TypeScript errors, fix them in the relevant files and re-run the build.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build errors in support tickets implementation"
```

Only create this commit if fixes were needed.
