# Phase 3: Assignments & Listening Requirements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add assignment CRUD (4 types), per-repetition listening confirmation, eligibility tracking, and assignment pages for moderator/student/admin roles.

**Architecture:** Polymorphic data model — base `Assignment` table plus type-specific tables (`QuranAssignment`, `TajweedAssignment`, `HomeworkAssignment`). `StudentAssignment` tracks per-student status with `ListeningConfirmation` rows for repetition counting. `AssignmentMaterial` stores external URLs rendered as audio/video/iframe.

**Tech Stack:** Prisma 7.8, Next.js 16 App Router, next-intl, Zod, server actions, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-05-19-phase3-assignments-design.md`

---

### Task 1: Prisma Schema — Assignment Models

**Files:**
- Modify: `prisma/schema.prisma` (append after the `ModeratorProfile` model, before the Quran Reference section)

- [ ] **Step 1: Add enums and Assignment model**

Add these enums and the base `Assignment` model after line 214 (`ModeratorProfile` closing brace) and before line 216 (`// Quran Reference`):

```prisma
// ============================================================
// Assignments
// ============================================================

enum AssignmentType {
  QURAN_MEMORIZATION
  QURAN_REVISION
  TAJWEED
  HOMEWORK
}

enum AssignmentTargetType {
  GROUP
  CLASS
  LEVEL
}

enum MaterialType {
  AUDIO_URL
  VIDEO_URL
  IFRAME_EMBED
}

enum StudentAssignmentStatus {
  ASSIGNED
  IN_PROGRESS
  COMPLETED
}

model Assignment {
  id                  String               @id @default(cuid())
  title               String
  description         String?
  type                AssignmentType
  targetType          AssignmentTargetType
  targetId            String
  createdById         String
  createdBy           User                 @relation("assignmentCreator", fields: [createdById], references: [id])
  dueDate             DateTime?
  requiredRepetitions Int                  @default(1)
  active              Boolean              @default(true)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  quranAssignment    QuranAssignment?
  tajweedAssignment  TajweedAssignment?
  homeworkAssignment HomeworkAssignment?
  materials          AssignmentMaterial[]
  studentAssignments StudentAssignment[]

  @@index([targetType, targetId])
  @@index([createdById])
  @@index([type])
  @@index([dueDate])
}
```

- [ ] **Step 2: Add type-specific models**

```prisma
model QuranAssignment {
  id              String     @id @default(cuid())
  assignmentId    String     @unique
  assignment      Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  fromSurahNumber Int
  fromAyahNumber  Int
  toSurahNumber   Int
  toAyahNumber    Int
  juzNumber       Int?

  fromSurah QuranSurah @relation("quranAssignmentFrom", fields: [fromSurahNumber], references: [number])
  toSurah   QuranSurah @relation("quranAssignmentTo", fields: [toSurahNumber], references: [number])
}

model TajweedAssignment {
  id               String     @id @default(cuid())
  assignmentId     String     @unique
  assignment       Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  topicTitle       String
  topicDescription String?
  materialUrl      String?
}

model HomeworkAssignment {
  id           String     @id @default(cuid())
  assignmentId String     @unique
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  instructions String
}
```

- [ ] **Step 3: Add AssignmentMaterial, StudentAssignment, and ListeningConfirmation models**

```prisma
model AssignmentMaterial {
  id           String       @id @default(cuid())
  assignmentId String
  assignment   Assignment   @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  type         MaterialType
  url          String
  title        String?
  sortOrder    Int          @default(0)

  @@index([assignmentId])
}

model StudentAssignment {
  id           String                  @id @default(cuid())
  assignmentId String
  assignment   Assignment              @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId    String
  student      StudentProfile          @relation(fields: [studentId], references: [id])
  status       StudentAssignmentStatus @default(ASSIGNED)
  assignedAt   DateTime                @default(now())
  completedAt  DateTime?

  confirmations ListeningConfirmation[]

  @@unique([assignmentId, studentId])
  @@index([studentId])
  @@index([status])
}

model ListeningConfirmation {
  id                  String            @id @default(cuid())
  studentAssignmentId String
  studentAssignment   StudentAssignment @relation(fields: [studentAssignmentId], references: [id], onDelete: Cascade)
  confirmedAt         DateTime          @default(now())

  @@index([studentAssignmentId])
}
```

- [ ] **Step 4: Add reverse relations to User, StudentProfile, and QuranSurah**

In the `User` model (around line 14), add after the `auditLogs` relation:

```prisma
  createdAssignments    Assignment[]       @relation("assignmentCreator")
```

In the `StudentProfile` model (around line 99), add after `groupStudents`:

```prisma
  studentAssignments StudentAssignment[]
```

In the `QuranSurah` model (around line 220), add after `ayahs`:

```prisma
  quranAssignmentsFrom QuranAssignment[] @relation("quranAssignmentFrom")
  quranAssignmentsTo   QuranAssignment[] @relation("quranAssignmentTo")
```

- [ ] **Step 5: Generate Prisma client and apply migration**

Run:
```bash
npx prisma generate
npx prisma db push
```

Expected: No errors. 7 new models visible in the database.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Assignment models for Phase 3

Add Assignment, QuranAssignment, TajweedAssignment, HomeworkAssignment,
AssignmentMaterial, StudentAssignment, and ListeningConfirmation models
with enums for assignment types, target types, material types, and
student assignment status."
```

---

### Task 2: Validation Schemas

**Files:**
- Create: `lib/validations/assignment.ts`

- [ ] **Step 1: Create the assignment validation schemas**

```typescript
import { z } from "zod";

export const materialSchema = z.object({
  type: z.enum(["AUDIO_URL", "VIDEO_URL", "IFRAME_EMBED"]),
  url: z.string().url(),
  title: z.string().optional(),
});

const baseSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["QURAN_MEMORIZATION", "QURAN_REVISION", "TAJWEED", "HOMEWORK"]),
  targetType: z.enum(["GROUP", "CLASS", "LEVEL"]),
  targetId: z.string().min(1),
  dueDate: z.string().optional(),
  requiredRepetitions: z.coerce.number().int().min(1).max(100).default(1),
  materials: z.array(materialSchema).optional(),
});

export const createQuranAssignmentSchema = baseSchema.extend({
  type: z.literal("QURAN_MEMORIZATION").or(z.literal("QURAN_REVISION")),
  fromSurahNumber: z.coerce.number().int().min(1).max(114),
  fromAyahNumber: z.coerce.number().int().min(1),
  toSurahNumber: z.coerce.number().int().min(1).max(114),
  toAyahNumber: z.coerce.number().int().min(1),
});

export const createTajweedAssignmentSchema = baseSchema.extend({
  type: z.literal("TAJWEED"),
  topicTitle: z.string().min(2),
  topicDescription: z.string().optional(),
  materialUrl: z.string().url().optional().or(z.literal("")),
});

export const createHomeworkAssignmentSchema = baseSchema.extend({
  type: z.literal("HOMEWORK"),
  instructions: z.string().min(2),
});

export const createAssignmentSchema = z.discriminatedUnion("type", [
  createQuranAssignmentSchema.extend({ type: z.literal("QURAN_MEMORIZATION") }),
  createQuranAssignmentSchema.extend({ type: z.literal("QURAN_REVISION") }),
  createTajweedAssignmentSchema,
  createHomeworkAssignmentSchema,
]);

export const confirmListeningSchema = z.object({
  studentAssignmentId: z.string().min(1),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type ConfirmListeningInput = z.infer<typeof confirmListeningSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to assignment validation.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/assignment.ts
git commit -m "feat(validation): add Zod schemas for assignment creation and listening confirmation"
```

---

### Task 3: Assignment Service Layer

**Files:**
- Create: `server/services/assignment.ts`

- [ ] **Step 1: Create the assignment service with createAssignment**

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateAssignmentInput, MaterialInput } from "@/lib/validations/assignment";

export async function createAssignment(
  input: CreateAssignmentInput,
  materials: MaterialInput[],
  actorId: string
) {
  const assignment = await db.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        targetType: input.targetType,
        targetId: input.targetId,
        createdById: actorId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        requiredRepetitions: input.requiredRepetitions,
      },
    });

    if (input.type === "QURAN_MEMORIZATION" || input.type === "QURAN_REVISION") {
      await tx.quranAssignment.create({
        data: {
          assignmentId: assignment.id,
          fromSurahNumber: input.fromSurahNumber,
          fromAyahNumber: input.fromAyahNumber,
          toSurahNumber: input.toSurahNumber,
          toAyahNumber: input.toAyahNumber,
        },
      });
    } else if (input.type === "TAJWEED") {
      await tx.tajweedAssignment.create({
        data: {
          assignmentId: assignment.id,
          topicTitle: input.topicTitle,
          topicDescription: input.topicDescription || null,
          materialUrl: input.materialUrl || null,
        },
      });
    } else if (input.type === "HOMEWORK") {
      await tx.homeworkAssignment.create({
        data: {
          assignmentId: assignment.id,
          instructions: input.instructions,
        },
      });
    }

    if (materials.length > 0) {
      await tx.assignmentMaterial.createMany({
        data: materials.map((m, i) => ({
          assignmentId: assignment.id,
          type: m.type,
          url: m.url,
          title: m.title || null,
          sortOrder: i,
        })),
      });
    }

    const studentIds = await resolveTargetStudents(tx, input.targetType, input.targetId);

    if (studentIds.length > 0) {
      await tx.studentAssignment.createMany({
        data: studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        })),
      });
    }

    return assignment;
  });

  await createAuditLog({
    actorId,
    action: "assignment.created",
    entityType: "Assignment",
    entityId: assignment.id,
    metadata: { type: input.type, targetType: input.targetType, targetId: input.targetId },
  });

  return assignment;
}

async function resolveTargetStudents(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  targetType: string,
  targetId: string
): Promise<string[]> {
  if (targetType === "GROUP") {
    const gs = await tx.groupStudent.findMany({
      where: { groupId: targetId },
      select: { studentId: true },
    });
    return gs.map((g) => g.studentId);
  }

  if (targetType === "CLASS") {
    const groups = await tx.group.findMany({
      where: { classId: targetId },
      select: { id: true },
    });
    const gs = await tx.groupStudent.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { studentId: true },
    });
    return [...new Set(gs.map((g) => g.studentId))];
  }

  if (targetType === "LEVEL") {
    const classes = await tx.class.findMany({
      where: { levelId: targetId },
      select: { id: true },
    });
    const groups = await tx.group.findMany({
      where: { classId: { in: classes.map((c) => c.id) } },
      select: { id: true },
    });
    const gs = await tx.groupStudent.findMany({
      where: { groupId: { in: groups.map((g) => g.id) } },
      select: { studentId: true },
    });
    return [...new Set(gs.map((g) => g.studentId))];
  }

  return [];
}
```

- [ ] **Step 2: Add query functions**

Append to the same file:

```typescript
export async function getModeratorAssignments(userId: string) {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true, name: true } } },
  });
  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.assignment.findMany({
    where: {
      targetType: "GROUP",
      targetId: { in: groupIds },
    },
    include: {
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true } },
          toSurah: { select: { nameAr: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      _count: { select: { studentAssignments: true } },
      studentAssignments: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminAssignments() {
  return db.assignment.findMany({
    include: {
      createdBy: { select: { name: true } },
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true } },
          toSurah: { select: { nameAr: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      _count: { select: { studentAssignments: true } },
      studentAssignments: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentAssignments(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  return db.studentAssignment.findMany({
    where: { studentId: profile.id },
    include: {
      assignment: {
        include: {
          quranAssignment: {
            include: {
              fromSurah: { select: { nameAr: true } },
              toSurah: { select: { nameAr: true } },
            },
          },
          tajweedAssignment: true,
          homeworkAssignment: true,
        },
      },
      _count: { select: { confirmations: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function getAssignmentDetail(assignmentId: string) {
  return db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      quranAssignment: {
        include: {
          fromSurah: { select: { nameAr: true, nameEn: true } },
          toSurah: { select: { nameAr: true, nameEn: true } },
        },
      },
      tajweedAssignment: true,
      homeworkAssignment: true,
      materials: { orderBy: { sortOrder: "asc" } },
      studentAssignments: {
        include: {
          student: {
            include: {
              user: { select: { name: true, nameAr: true } },
            },
          },
          _count: { select: { confirmations: true } },
        },
      },
    },
  });
}

export async function getStudentAssignmentDetail(studentAssignmentId: string) {
  return db.studentAssignment.findUnique({
    where: { id: studentAssignmentId },
    include: {
      assignment: {
        include: {
          quranAssignment: {
            include: {
              fromSurah: { select: { nameAr: true, nameEn: true } },
              toSurah: { select: { nameAr: true, nameEn: true } },
            },
          },
          tajweedAssignment: true,
          homeworkAssignment: true,
          materials: { orderBy: { sortOrder: "asc" } },
        },
      },
      confirmations: { orderBy: { confirmedAt: "desc" } },
    },
  });
}

export async function confirmListening(studentAssignmentId: string, userId: string) {
  const sa = await db.studentAssignment.findUnique({
    where: { id: studentAssignmentId },
    include: {
      student: { select: { userId: true } },
      assignment: { select: { requiredRepetitions: true } },
      _count: { select: { confirmations: true } },
    },
  });

  if (!sa) throw new Error("StudentAssignment not found");
  if (sa.student.userId !== userId) throw new Error("Not authorized");
  if (sa.status === "COMPLETED") throw new Error("Already completed");

  const newCount = sa._count.confirmations + 1;
  const isComplete = newCount >= sa.assignment.requiredRepetitions;

  await db.$transaction(async (tx) => {
    await tx.listeningConfirmation.create({
      data: { studentAssignmentId },
    });

    await tx.studentAssignment.update({
      where: { id: studentAssignmentId },
      data: {
        status: isComplete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isComplete ? new Date() : undefined,
      },
    });
  });

  return { newCount, required: sa.assignment.requiredRepetitions, isComplete };
}

export async function getStudentEligibility(userId: string) {
  const profile = await db.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { total: 0, completed: 0, eligible: true };

  const assignments = await db.studentAssignment.findMany({
    where: {
      studentId: profile.id,
      assignment: { active: true },
    },
    select: { status: true },
  });

  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "COMPLETED").length;

  return { total, completed, eligible: total === 0 || completed === total };
}

export async function deleteAssignment(assignmentId: string, actorId: string) {
  await db.assignment.delete({ where: { id: assignmentId } });

  await createAuditLog({
    actorId,
    action: "assignment.deleted",
    entityType: "Assignment",
    entityId: assignmentId,
  });
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/services/assignment.ts
git commit -m "feat(service): add assignment service with CRUD, listening confirmation, and eligibility"
```

---

### Task 4: Server Actions

**Files:**
- Create: `server/actions/assignment.ts`

- [ ] **Step 1: Create assignment server actions**

```typescript
"use server";

import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { auth } from "@/server/auth/config";
import {
  createAssignment,
  confirmListening,
  deleteAssignment,
  getModeratorAssignments,
} from "@/server/services/assignment";
import {
  createAssignmentSchema,
  confirmListeningSchema,
  materialSchema,
} from "@/lib/validations/assignment";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createAssignmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSIGNMENTS_CREATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());

  const materialsRaw: z.infer<typeof materialSchema>[] = [];
  let i = 0;
  while (raw[`materials.${i}.url`]) {
    materialsRaw.push({
      type: raw[`materials.${i}.type`] as "AUDIO_URL" | "VIDEO_URL" | "IFRAME_EMBED",
      url: raw[`materials.${i}.url`] as string,
      title: (raw[`materials.${i}.title`] as string) || undefined,
    });
    i++;
  }

  const input = {
    title: raw.title as string,
    description: (raw.description as string) || undefined,
    type: raw.type as string,
    targetType: raw.targetType as string,
    targetId: raw.targetId as string,
    dueDate: (raw.dueDate as string) || undefined,
    requiredRepetitions: raw.requiredRepetitions ? Number(raw.requiredRepetitions) : 1,
    ...(raw.type === "QURAN_MEMORIZATION" || raw.type === "QURAN_REVISION"
      ? {
          fromSurahNumber: Number(raw.fromSurahNumber),
          fromAyahNumber: Number(raw.fromAyahNumber),
          toSurahNumber: Number(raw.toSurahNumber),
          toAyahNumber: Number(raw.toAyahNumber),
        }
      : {}),
    ...(raw.type === "TAJWEED"
      ? {
          topicTitle: raw.topicTitle as string,
          topicDescription: (raw.topicDescription as string) || undefined,
          materialUrl: (raw.materialUrl as string) || undefined,
        }
      : {}),
    ...(raw.type === "HOMEWORK"
      ? { instructions: raw.instructions as string }
      : {}),
  };

  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const role = session.user.role;
  if (role === "moderator") {
    const assignments = await getModeratorAssignments(session.user.id);
    const db = await import("@/server/db/client").then((m) => m.db);
    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];
    if (parsed.data.targetType === "GROUP" && !groupIds.includes(parsed.data.targetId)) {
      return { error: "notAuthorized" };
    }
  }

  await createAssignment(parsed.data, materialsRaw, session.user.id);

  revalidatePath("/ar/moderator/assignments");
  revalidatePath("/en/moderator/assignments");
  revalidatePath("/ar/admin/assignments");
  revalidatePath("/en/admin/assignments");
  revalidatePath("/ar/student/assignments");
  revalidatePath("/en/student/assignments");
  return { success: true };
}

export async function confirmListeningAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = Object.fromEntries(formData.entries());
  const parsed = confirmListeningSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  try {
    const result = await confirmListening(parsed.data.studentAssignmentId, session.user.id);
    revalidatePath("/ar/student/assignments");
    revalidatePath("/en/student/assignments");
    return { success: true, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }
}

export async function deleteAssignmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSIGNMENTS_UPDATE);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const assignmentId = formData.get("assignmentId") as string;
  if (!assignmentId) return { error: "validationError" };

  const role = session.user.role;
  if (role === "moderator") {
    const db = await import("@/server/db/client").then((m) => m.db);
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      select: { createdById: true, targetId: true },
    });
    if (!assignment) return { error: "notFound" };

    const profile = await db.moderatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { groups: { select: { id: true } } },
    });
    const groupIds = profile?.groups.map((g) => g.id) ?? [];

    if (assignment.createdById !== session.user.id && !groupIds.includes(assignment.targetId)) {
      return { error: "notAuthorized" };
    }
  }

  await deleteAssignment(assignmentId, session.user.id);

  revalidatePath("/ar/moderator/assignments");
  revalidatePath("/en/moderator/assignments");
  revalidatePath("/ar/admin/assignments");
  revalidatePath("/en/admin/assignments");
  return { success: true };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/actions/assignment.ts
git commit -m "feat(actions): add server actions for assignment CRUD and listening confirmation"
```

---

### Task 5: i18n Translations

**Files:**
- Modify: `messages/ar.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add Arabic assignment translations**

Add a new `"assignments"` section at the top level of `messages/ar.json` (after the `"moderator"` section, before `"student"`):

```json
"assignments": {
  "title": "الواجبات",
  "create": "إنشاء واجب",
  "type": "نوع الواجب",
  "typeQuranMemorization": "حفظ قرآن",
  "typeQuranRevision": "مراجعة قرآن",
  "typeTajweed": "تجويد",
  "typeHomework": "واجب منزلي",
  "targetGroup": "المجموعة المستهدفة",
  "targetClass": "الفصل المستهدف",
  "targetLevel": "المستوى المستهدف",
  "target": "الهدف",
  "dueDate": "تاريخ الاستحقاق",
  "requiredRepetitions": "عدد مرات الاستماع المطلوبة",
  "fromSurah": "من سورة",
  "fromAyah": "من آية",
  "toSurah": "إلى سورة",
  "toAyah": "إلى آية",
  "topicTitle": "عنوان الدرس",
  "topicDescription": "وصف الدرس",
  "instructions": "التعليمات",
  "materials": "المواد التعليمية",
  "addMaterial": "إضافة مادة",
  "materialUrl": "رابط المادة",
  "materialType": "نوع المادة",
  "audioUrl": "رابط صوتي",
  "videoUrl": "رابط فيديو",
  "iframeEmbed": "تضمين صفحة",
  "progress": "التقدم",
  "completed": "مكتمل",
  "inProgress": "قيد التنفيذ",
  "assigned": "مُسند",
  "confirmListening": "لقد استمعت",
  "confirmDisclaimer": "تأكيد الاستماع أمانة",
  "noAssignments": "لا توجد واجبات",
  "studentProgress": "تقدم الطلاب",
  "eligible": "مؤهل",
  "notEligible": "غير مؤهل",
  "completionStats": "الواجبات المكتملة",
  "createdBy": "أنشأه",
  "deleteAssignment": "حذف الواجب",
  "assignmentDetail": "تفاصيل الواجب",
  "quranRange": "النطاق القرآني",
  "repetitions": "مرات",
  "lastConfirmation": "آخر تأكيد",
  "materialTitle": "عنوان المادة"
}
```

- [ ] **Step 2: Add English assignment translations**

Add a new `"assignments"` section at the top level of `messages/en.json` (same position):

```json
"assignments": {
  "title": "Assignments",
  "create": "Create Assignment",
  "type": "Assignment Type",
  "typeQuranMemorization": "Quran Memorization",
  "typeQuranRevision": "Quran Revision",
  "typeTajweed": "Tajweed",
  "typeHomework": "Homework",
  "targetGroup": "Target Group",
  "targetClass": "Target Class",
  "targetLevel": "Target Level",
  "target": "Target",
  "dueDate": "Due Date",
  "requiredRepetitions": "Required Listening Repetitions",
  "fromSurah": "From Surah",
  "fromAyah": "From Ayah",
  "toSurah": "To Surah",
  "toAyah": "To Ayah",
  "topicTitle": "Topic Title",
  "topicDescription": "Topic Description",
  "instructions": "Instructions",
  "materials": "Materials",
  "addMaterial": "Add Material",
  "materialUrl": "Material URL",
  "materialType": "Material Type",
  "audioUrl": "Audio URL",
  "videoUrl": "Video URL",
  "iframeEmbed": "Iframe Embed",
  "progress": "Progress",
  "completed": "Completed",
  "inProgress": "In Progress",
  "assigned": "Assigned",
  "confirmListening": "I have listened",
  "confirmDisclaimer": "Listening confirmation is a trust",
  "noAssignments": "No assignments",
  "studentProgress": "Student Progress",
  "eligible": "Eligible",
  "notEligible": "Not Eligible",
  "completionStats": "Assignments Completed",
  "createdBy": "Created by",
  "deleteAssignment": "Delete Assignment",
  "assignmentDetail": "Assignment Detail",
  "quranRange": "Quran Range",
  "repetitions": "repetitions",
  "lastConfirmation": "Last Confirmation",
  "materialTitle": "Material Title"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/ar.json messages/en.json
git commit -m "feat(i18n): add assignment translations for Arabic and English"
```

---

### Task 6: Sidebar Navigation Updates

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add assignment nav items to all three roles**

In `components/layout/sidebar.tsx`, add `BookOpen` to the existing imports (it's already imported but unused in moderator/student nav). Add the assignment nav item to each role's nav array:

After the last item in `adminNav` (auditLogs, line 37), add:

```typescript
  { labelKey: "assignments", href: "/admin/assignments", icon: BookOpen },
```

After the last item in `moderatorNav` (students, line 43), add:

```typescript
  { labelKey: "assignments", href: "/moderator/assignments", icon: BookOpen },
```

After the last item in `studentNav` (profile, line 48), add:

```typescript
  { labelKey: "assignments", href: "/student/assignments", icon: BookOpen },
```

Note: `BookOpen` is already imported. The `nav.assignments` key already exists in both locale files ("الواجبات" / "Assignments").

- [ ] **Step 2: Verify no build errors**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(nav): add assignment links to admin, moderator, and student sidebars"
```

---

### Task 7: Moderator Assignment List Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/assignments/page.tsx`

- [ ] **Step 1: Create the moderator assignments page**

This page follows the same pattern as admin groups page: a create form card at the top, then a table of existing assignments. Moderator can only target their own groups.

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getModeratorAssignments } from "@/server/services/assignment";
import { getModeratorGroups } from "@/server/services/organization";
import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { createAssignmentAction } from "@/server/actions/assignment";
import { db } from "@/server/db/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const createAssignment = createAssignmentAction as unknown as (formData: FormData) => void;

export default async function ModeratorAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const t = await getTranslations("assignments");
  const [assignments, groups, surahs] = await Promise.all([
    getModeratorAssignments(session.user.id),
    getModeratorGroups(session.user.id),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
  ]);

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      QURAN_MEMORIZATION: t("typeQuranMemorization"),
      QURAN_REVISION: t("typeQuranRevision"),
      TAJWEED: t("typeTajweed"),
      HOMEWORK: t("typeHomework"),
    };
    return map[type] ?? type;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAssignment} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t("type")}</Label>
              <select
                id="type"
                name="type"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                <option value="QURAN_MEMORIZATION">{t("typeQuranMemorization")}</option>
                <option value="QURAN_REVISION">{t("typeQuranRevision")}</option>
                <option value="TAJWEED">{t("typeTajweed")}</option>
                <option value="HOMEWORK">{t("typeHomework")}</option>
              </select>
            </div>
            <input type="hidden" name="targetType" value="GROUP" />
            <div className="space-y-2">
              <Label htmlFor="targetId">{t("targetGroup")}</Label>
              <select
                id="targetId"
                name="targetId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">--</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t("dueDate")}</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredRepetitions">{t("requiredRepetitions")}</Label>
              <Input id="requiredRepetitions" name="requiredRepetitions" type="number" min={1} max={100} defaultValue={1} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">{t("topicDescription")}</Label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Quran fields — shown for all types; server validates per type */}
            <div className="space-y-2">
              <Label htmlFor="fromSurahNumber">{t("fromSurah")}</Label>
              <select id="fromSurahNumber" name="fromSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>{s.number}. {s.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromAyahNumber">{t("fromAyah")}</Label>
              <Input id="fromAyahNumber" name="fromAyahNumber" type="number" min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toSurahNumber">{t("toSurah")}</Label>
              <select id="toSurahNumber" name="toSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>{s.number}. {s.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toAyahNumber">{t("toAyah")}</Label>
              <Input id="toAyahNumber" name="toAyahNumber" type="number" min={1} />
            </div>

            {/* Tajweed fields */}
            <div className="space-y-2">
              <Label htmlFor="topicTitle">{t("topicTitle")}</Label>
              <Input id="topicTitle" name="topicTitle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialUrl">{t("materialUrl")}</Label>
              <Input id="materialUrl" name="materialUrl" type="url" />
            </div>

            {/* Homework fields */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="instructions">{t("instructions")}</Label>
              <textarea
                id="instructions"
                name="instructions"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Material URL */}
            <div className="space-y-2">
              <Label>{t("materials")}</Label>
              <div className="flex gap-2">
                <select name="materials.0.type" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="AUDIO_URL">{t("audioUrl")}</option>
                  <option value="VIDEO_URL">{t("videoUrl")}</option>
                  <option value="IFRAME_EMBED">{t("iframeEmbed")}</option>
                </select>
                <Input name="materials.0.url" placeholder={t("materialUrl")} type="url" />
                <Input name="materials.0.title" placeholder={t("materialTitle")} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit">{t("create")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">{t("noAssignments")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("title")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>{t("progress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/${locale}/moderator/assignments/${a.id}`}
                    className="text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableCell>
                <TableCell>{typeBadge(a.type)}</TableCell>
                <TableCell>
                  {a.dueDate
                    ? new Date(a.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")
                    : "—"}
                </TableCell>
                <TableCell>
                  {a.studentAssignments.length}/{a._count.studentAssignments}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/assignments/page.tsx
git commit -m "feat(moderator): add assignment list page with create form"
```

---

### Task 8: Moderator Assignment Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/assignments/[id]/page.tsx`

- [ ] **Step 1: Create the moderator assignment detail page**

Shows assignment info + student progress table.

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAssignmentDetail } from "@/server/services/assignment";
import { notFound } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { deleteAssignmentAction } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";

const deleteAssignment = deleteAssignmentAction as unknown as (formData: FormData) => void;

export default async function ModeratorAssignmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("assignments");
  const assignment = await getAssignmentDetail(id);
  if (!assignment) notFound();

  const typeLabel: Record<string, string> = {
    QURAN_MEMORIZATION: t("typeQuranMemorization"),
    QURAN_REVISION: t("typeQuranRevision"),
    TAJWEED: t("typeTajweed"),
    HOMEWORK: t("typeHomework"),
  };

  const statusLabel: Record<string, string> = {
    ASSIGNED: t("assigned"),
    IN_PROGRESS: t("inProgress"),
    COMPLETED: t("completed"),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{assignment.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("assignmentDetail")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>{t("type")}:</strong> {typeLabel[assignment.type] ?? assignment.type}</p>
          {assignment.description && <p>{assignment.description}</p>}
          {assignment.dueDate && (
            <p><strong>{t("dueDate")}:</strong> {new Date(assignment.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</p>
          )}
          <p><strong>{t("requiredRepetitions")}:</strong> {assignment.requiredRepetitions}</p>

          {assignment.quranAssignment && (
            <p>
              <strong>{t("quranRange")}:</strong>{" "}
              {assignment.quranAssignment.fromSurah.nameAr} ({assignment.quranAssignment.fromAyahNumber})
              {" → "}
              {assignment.quranAssignment.toSurah.nameAr} ({assignment.quranAssignment.toAyahNumber})
            </p>
          )}

          {assignment.tajweedAssignment && (
            <>
              <p><strong>{t("topicTitle")}:</strong> {assignment.tajweedAssignment.topicTitle}</p>
              {assignment.tajweedAssignment.topicDescription && <p>{assignment.tajweedAssignment.topicDescription}</p>}
            </>
          )}

          {assignment.homeworkAssignment && (
            <p><strong>{t("instructions")}:</strong> {assignment.homeworkAssignment.instructions}</p>
          )}

          <form action={deleteAssignment} className="pt-4">
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <Button type="submit" variant="destructive" size="sm">
              {t("deleteAssignment")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentProgress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "ar" ? "الطالب" : "Student"}</TableHead>
                <TableHead>{t("progress")}</TableHead>
                <TableHead>{locale === "ar" ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignment.studentAssignments.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell>{sa.student.user.nameAr ?? sa.student.user.name}</TableCell>
                  <TableCell>
                    {sa._count.confirmations}/{assignment.requiredRepetitions}
                  </TableCell>
                  <TableCell>{statusLabel[sa.status] ?? sa.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/moderator/assignments/\[id\]/page.tsx
git commit -m "feat(moderator): add assignment detail page with student progress"
```

---

### Task 9: Student Assignment List Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/assignments/page.tsx`

- [ ] **Step 1: Create student assignments list page**

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { getStudentAssignments } from "@/server/services/assignment";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function StudentAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("assignments");
  const assignments = await getStudentAssignments(session.user.id);

  const typeLabel: Record<string, string> = {
    QURAN_MEMORIZATION: t("typeQuranMemorization"),
    QURAN_REVISION: t("typeQuranRevision"),
    TAJWEED: t("typeTajweed"),
    HOMEWORK: t("typeHomework"),
  };

  const statusLabel: Record<string, string> = {
    ASSIGNED: t("assigned"),
    IN_PROGRESS: t("inProgress"),
    COMPLETED: t("completed"),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">{t("noAssignments")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((sa) => (
            <Link key={sa.id} href={`/${locale}/student/assignments/${sa.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sa.assignment.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{typeLabel[sa.assignment.type]}</p>
                  <p>
                    {t("progress")}: {sa._count.confirmations}/{sa.assignment.requiredRepetitions}
                  </p>
                  <p className={sa.status === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>
                    {statusLabel[sa.status]}
                  </p>
                  {sa.assignment.dueDate && (
                    <p className="text-muted-foreground">
                      {t("dueDate")}: {new Date(sa.assignment.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/assignments/page.tsx
git commit -m "feat(student): add assignment list page with progress cards"
```

---

### Task 10: Student Assignment Detail Page + Listening Confirmation

**Files:**
- Create: `app/[locale]/(dashboard)/student/assignments/[id]/page.tsx`
- Create: `app/[locale]/(dashboard)/student/assignments/[id]/confirm-button.tsx`

- [ ] **Step 1: Create the confirm listening client component**

```typescript
"use client";

import { useActionState } from "react";
import { confirmListeningAction } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";

type Props = {
  studentAssignmentId: string;
  labels: {
    confirm: string;
    disclaimer: string;
  };
  isComplete: boolean;
};

function formAction(_prev: { success?: boolean; error?: string } | null, formData: FormData) {
  return confirmListeningAction(formData);
}

export function ConfirmListeningButton({ studentAssignmentId, labels, isComplete }: Props) {
  const [state, action, pending] = useActionState(formAction, null);

  return (
    <form action={action}>
      <input type="hidden" name="studentAssignmentId" value={studentAssignmentId} />
      <p className="mb-2 text-sm text-muted-foreground">{labels.disclaimer}</p>
      <Button type="submit" disabled={pending || isComplete}>
        {labels.confirm}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Create the student assignment detail page**

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { getStudentAssignmentDetail } from "@/server/services/assignment";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ConfirmListeningButton } from "./confirm-button";
import { MaterialEmbed } from "@/components/assignments/material-embed";

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("assignments");
  const sa = await getStudentAssignmentDetail(id);
  if (!sa) notFound();

  const a = sa.assignment;
  const confirmCount = sa.confirmations.length;
  const isComplete = sa.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{a.title}</h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {a.description && <p>{a.description}</p>}

          {a.quranAssignment && (
            <p>
              <strong>{t("quranRange")}:</strong>{" "}
              {a.quranAssignment.fromSurah.nameAr} ({a.quranAssignment.fromAyahNumber})
              {" → "}
              {a.quranAssignment.toSurah.nameAr} ({a.quranAssignment.toAyahNumber})
            </p>
          )}

          {a.tajweedAssignment && (
            <>
              <p><strong>{t("topicTitle")}:</strong> {a.tajweedAssignment.topicTitle}</p>
              {a.tajweedAssignment.topicDescription && <p>{a.tajweedAssignment.topicDescription}</p>}
            </>
          )}

          {a.homeworkAssignment && (
            <p><strong>{t("instructions")}:</strong> {a.homeworkAssignment.instructions}</p>
          )}

          {a.dueDate && (
            <p className="text-muted-foreground">
              {t("dueDate")}: {new Date(a.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
            </p>
          )}
        </CardContent>
      </Card>

      {a.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("materials")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {a.materials.map((m) => (
              <MaterialEmbed key={m.id} material={m} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("progress")}: {confirmCount}/{a.requiredRepetitions} {t("repetitions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConfirmListeningButton
            studentAssignmentId={sa.id}
            labels={{
              confirm: t("confirmListening"),
              disclaimer: t("confirmDisclaimer"),
            }}
            isComplete={isComplete}
          />

          {sa.confirmations.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {sa.confirmations.map((c, i) => (
                <p key={c.id}>
                  #{sa.confirmations.length - i} — {new Date(c.confirmedAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: May error on missing `MaterialEmbed` — that's expected, created in Task 11.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/assignments/
git commit -m "feat(student): add assignment detail page with listening confirmation"
```

---

### Task 11: Material Embed Component

**Files:**
- Create: `components/assignments/material-embed.tsx`

- [ ] **Step 1: Create the MaterialEmbed component**

```typescript
type MaterialProps = {
  material: {
    id: string;
    type: string;
    url: string;
    title: string | null;
  };
};

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  return null;
}

export function MaterialEmbed({ material }: MaterialProps) {
  const { type, url, title } = material;

  if (type === "AUDIO_URL") {
    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <audio src={url} controls className="w-full" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          ↗
        </a>
      </div>
    );
  }

  if (type === "VIDEO_URL") {
    const youtubeEmbed = getYouTubeEmbedUrl(url);
    if (youtubeEmbed) {
      return (
        <div className="space-y-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          <iframe
            src={youtubeEmbed}
            className="aspect-video w-full rounded-md"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <video src={url} controls className="w-full rounded-md" />
      </div>
    );
  }

  if (type === "IFRAME_EMBED") {
    const isQuranKsu = url.includes("quran.ksu.edu.sa");
    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <iframe
          src={url}
          className={`w-full rounded-md ${isQuranKsu ? "h-[600px]" : "h-[400px]"}`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div>
      {title && <span className="text-sm font-medium">{title}: </span>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {url}
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/assignments/material-embed.tsx
git commit -m "feat(component): add MaterialEmbed for audio, video, YouTube, and iframe rendering"
```

---

### Task 12: Admin Assignments Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/assignments/page.tsx`

- [ ] **Step 1: Create the admin assignments page**

Same as moderator but shows ALL assignments and allows targeting any group/class/level.

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAdminAssignments } from "@/server/services/assignment";
import { getAllGroups, getAllClasses, getAllLevels } from "@/server/services/organization";
import { createAssignmentAction } from "@/server/actions/assignment";
import { db } from "@/server/db/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const createAssignment = createAssignmentAction as unknown as (formData: FormData) => void;

export default async function AdminAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("assignments");
  const [assignments, groups, classes, levels, surahs] = await Promise.all([
    getAdminAssignments(),
    getAllGroups(),
    getAllClasses(),
    getAllLevels(),
    db.quranSurah.findMany({ orderBy: { number: "asc" } }),
  ]);

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      QURAN_MEMORIZATION: t("typeQuranMemorization"),
      QURAN_REVISION: t("typeQuranRevision"),
      TAJWEED: t("typeTajweed"),
      HOMEWORK: t("typeHomework"),
    };
    return map[type] ?? type;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAssignment} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t("type")}</Label>
              <select id="type" name="type" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                <option value="QURAN_MEMORIZATION">{t("typeQuranMemorization")}</option>
                <option value="QURAN_REVISION">{t("typeQuranRevision")}</option>
                <option value="TAJWEED">{t("typeTajweed")}</option>
                <option value="HOMEWORK">{t("typeHomework")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetType">{t("target")}</Label>
              <select id="targetType" name="targetType" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="GROUP">{t("targetGroup")}</option>
                <option value="CLASS">{t("targetClass")}</option>
                <option value="LEVEL">{t("targetLevel")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetId">{t("target")}</Label>
              <select id="targetId" name="targetId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <optgroup label={t("targetGroup")}>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t("targetClass")}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t("targetLevel")}>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.nameAr}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t("dueDate")}</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredRepetitions">{t("requiredRepetitions")}</Label>
              <Input id="requiredRepetitions" name="requiredRepetitions" type="number" min={1} max={100} defaultValue={1} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">{t("topicDescription")}</Label>
              <textarea id="description" name="description" rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>

            {/* Quran fields */}
            <div className="space-y-2">
              <Label htmlFor="fromSurahNumber">{t("fromSurah")}</Label>
              <select id="fromSurahNumber" name="fromSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>{s.number}. {s.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromAyahNumber">{t("fromAyah")}</Label>
              <Input id="fromAyahNumber" name="fromAyahNumber" type="number" min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toSurahNumber">{t("toSurah")}</Label>
              <select id="toSurahNumber" name="toSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>{s.number}. {s.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toAyahNumber">{t("toAyah")}</Label>
              <Input id="toAyahNumber" name="toAyahNumber" type="number" min={1} />
            </div>

            {/* Tajweed fields */}
            <div className="space-y-2">
              <Label htmlFor="topicTitle">{t("topicTitle")}</Label>
              <Input id="topicTitle" name="topicTitle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialUrl">{t("materialUrl")}</Label>
              <Input id="materialUrl" name="materialUrl" type="url" />
            </div>

            {/* Homework fields */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="instructions">{t("instructions")}</Label>
              <textarea id="instructions" name="instructions" rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>

            {/* Material URL */}
            <div className="space-y-2">
              <Label>{t("materials")}</Label>
              <div className="flex gap-2">
                <select name="materials.0.type" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="AUDIO_URL">{t("audioUrl")}</option>
                  <option value="VIDEO_URL">{t("videoUrl")}</option>
                  <option value="IFRAME_EMBED">{t("iframeEmbed")}</option>
                </select>
                <Input name="materials.0.url" placeholder={t("materialUrl")} type="url" />
                <Input name="materials.0.title" placeholder={t("materialTitle")} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit">{t("create")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">{t("noAssignments")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("title")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("createdBy")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>{t("progress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/${locale}/admin/assignments/${a.id}`}
                    className="text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableCell>
                <TableCell>{typeBadge(a.type)}</TableCell>
                <TableCell>{a.createdBy.name}</TableCell>
                <TableCell>
                  {a.dueDate
                    ? new Date(a.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")
                    : "—"}
                </TableCell>
                <TableCell>
                  {a.studentAssignments.length}/{a._count.studentAssignments}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the admin assignment detail page**

Create `app/[locale]/(dashboard)/admin/assignments/[id]/page.tsx` — identical to the moderator detail page (Task 8) but at the admin route. Copy the moderator detail page content exactly, changing only the route path awareness:

```typescript
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getAssignmentDetail } from "@/server/services/assignment";
import { notFound } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { deleteAssignmentAction } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";

const deleteAssignment = deleteAssignmentAction as unknown as (formData: FormData) => void;

export default async function AdminAssignmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();

  const t = await getTranslations("assignments");
  const assignment = await getAssignmentDetail(id);
  if (!assignment) notFound();

  const typeLabel: Record<string, string> = {
    QURAN_MEMORIZATION: t("typeQuranMemorization"),
    QURAN_REVISION: t("typeQuranRevision"),
    TAJWEED: t("typeTajweed"),
    HOMEWORK: t("typeHomework"),
  };

  const statusLabel: Record<string, string> = {
    ASSIGNED: t("assigned"),
    IN_PROGRESS: t("inProgress"),
    COMPLETED: t("completed"),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{assignment.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("assignmentDetail")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>{t("type")}:</strong> {typeLabel[assignment.type] ?? assignment.type}</p>
          {assignment.description && <p>{assignment.description}</p>}
          {assignment.dueDate && (
            <p><strong>{t("dueDate")}:</strong> {new Date(assignment.dueDate).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</p>
          )}
          <p><strong>{t("requiredRepetitions")}:</strong> {assignment.requiredRepetitions}</p>

          {assignment.quranAssignment && (
            <p>
              <strong>{t("quranRange")}:</strong>{" "}
              {assignment.quranAssignment.fromSurah.nameAr} ({assignment.quranAssignment.fromAyahNumber})
              {" → "}
              {assignment.quranAssignment.toSurah.nameAr} ({assignment.quranAssignment.toAyahNumber})
            </p>
          )}

          {assignment.tajweedAssignment && (
            <>
              <p><strong>{t("topicTitle")}:</strong> {assignment.tajweedAssignment.topicTitle}</p>
              {assignment.tajweedAssignment.topicDescription && <p>{assignment.tajweedAssignment.topicDescription}</p>}
            </>
          )}

          {assignment.homeworkAssignment && (
            <p><strong>{t("instructions")}:</strong> {assignment.homeworkAssignment.instructions}</p>
          )}

          <form action={deleteAssignment} className="pt-4">
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <Button type="submit" variant="destructive" size="sm">
              {t("deleteAssignment")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("studentProgress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "ar" ? "الطالب" : "Student"}</TableHead>
                <TableHead>{t("progress")}</TableHead>
                <TableHead>{locale === "ar" ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignment.studentAssignments.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell>{sa.student.user.nameAr ?? sa.student.user.name}</TableCell>
                  <TableCell>
                    {sa._count.confirmations}/{assignment.requiredRepetitions}
                  </TableCell>
                  <TableCell>{statusLabel[sa.status] ?? sa.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/admin/assignments/
git commit -m "feat(admin): add assignment list and detail pages"
```

---

### Task 13: Student Dashboard Eligibility Card

**Files:**
- Modify: `app/[locale]/(dashboard)/student/dashboard/page.tsx`

- [ ] **Step 1: Add eligibility card to student dashboard**

Import the eligibility service at the top:

```typescript
import { getStudentEligibility } from "@/server/services/assignment";
```

After the existing `const groupAssignment = studentProfile?.groupStudents[0];` line, add:

```typescript
  const eligibility = await getStudentEligibility(session.user.id);
```

Inside the card grid (after the moderator card, before the closing `</div>` of the grid), add a new eligibility card:

```tsx
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(dashboard\)/student/dashboard/page.tsx
git commit -m "feat(student): add eligibility card to student dashboard"
```

---

### Task 14: Build Verification & Manual Smoke Test

**Files:** None created — verification only.

- [ ] **Step 1: Run full production build**

Run: `pnpm build`
Expected: All routes compile without errors. New routes should appear:
- `/[locale]/moderator/assignments`
- `/[locale]/moderator/assignments/[id]`
- `/[locale]/student/assignments`
- `/[locale]/student/assignments/[id]`
- `/[locale]/admin/assignments`
- `/[locale]/admin/assignments/[id]`

- [ ] **Step 2: Start dev server**

Run: `pnpm dev`

- [ ] **Step 3: Smoke test moderator flow**

1. Log in as `moderator@yusr.academy` / `demo123456`
2. Click "الواجبات" in sidebar → assignment list page loads
3. Create a Quran Memorization assignment targeting "مجموعة النور":
   - Title: "حفظ سورة الفاتحة"
   - Type: QURAN_MEMORIZATION
   - From Surah: 1, Ayah: 1 → To Surah: 1, Ayah: 7
   - Required repetitions: 3
4. Assignment appears in table
5. Click assignment → detail page shows student "يوسف" with 0/3 progress

- [ ] **Step 4: Smoke test student flow**

1. Log in as `student@yusr.academy` / `demo123456`
2. Dashboard shows eligibility card (0/1 or similar)
3. Click "الواجبات" in sidebar → assignment card visible
4. Click assignment → detail page with confirmation button
5. Click "لقد استمعت" 3 times → progress updates to 3/3, status → Completed
6. Return to dashboard → eligibility card shows green

- [ ] **Step 5: Smoke test admin flow**

1. Log in as `admin@yusr.academy` / `admin123456`
2. Click "الواجبات" in sidebar → all assignments visible
3. Can create assignment targeting any group/class/level

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address Phase 3 smoke test issues"
```
