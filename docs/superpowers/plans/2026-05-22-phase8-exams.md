# Phase 8: Exams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete exam system where admin creates templates with mixed question types, moderators administer per-group instances, students take exams, and moderators grade submissions.

**Architecture:** Template → Instance → Submission three-layer model. ExamTemplate holds questions; ExamInstance ties a template to a group with dates; ExamSubmission + ExamAnswer track per-student responses and grades. Auto-grading for MC/TF, manual grading for short-answer and recitation.

**Tech Stack:** Next.js 16 App Router (async server components), Prisma 7.8, Zod, next-intl, shadcn/ui, server actions with FormData

---

### Task 1: Prisma Schema — Add Exam Enums and Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema**

Add the following after the `TicketStatus` enum block in `prisma/schema.prisma`:

```prisma
enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
  RECITATION
}

enum ExamInstanceStatus {
  DRAFT
  PUBLISHED
  IN_PROGRESS
  COMPLETED
}

enum ExamSubmissionStatus {
  NOT_STARTED
  IN_PROGRESS
  SUBMITTED
  GRADED
}

model ExamTemplate {
  id           String   @id @default(cuid())
  title        String
  description  String?
  passingScore Int
  totalPoints  Int      @default(0)
  createdById  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdBy User           @relation("examTemplateCreator", fields: [createdById], references: [id])
  questions ExamQuestion[]
  instances ExamInstance[]

  @@index([createdById])
}

model ExamQuestion {
  id              String       @id @default(cuid())
  templateId      String
  type            QuestionType
  text            String
  points          Int
  order           Int
  options         Json?
  correctAnswer   String?
  fromSurahNumber Int?
  fromAyah        Int?
  toSurahNumber   Int?
  toAyah          Int?
  createdAt       DateTime     @default(now())

  template  ExamTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  fromSurah QuranSurah?  @relation("examQuestionFromSurah", fields: [fromSurahNumber], references: [number])
  toSurah   QuranSurah?  @relation("examQuestionToSurah", fields: [toSurahNumber], references: [number])
  answers   ExamAnswer[]

  @@unique([templateId, order])
  @@index([templateId])
}

model ExamInstance {
  id             String             @id @default(cuid())
  templateId     String
  groupId        String
  sessionId      String?
  status         ExamInstanceStatus @default(DRAFT)
  startDate      DateTime
  endDate        DateTime
  customizations Json?
  createdById    String
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  template    ExamTemplate   @relation(fields: [templateId], references: [id])
  group       Group          @relation(fields: [groupId], references: [id])
  session     WeeklySession? @relation(fields: [sessionId], references: [id])
  createdBy   User           @relation("examInstanceCreator", fields: [createdById], references: [id])
  submissions ExamSubmission[]

  @@index([templateId])
  @@index([groupId])
  @@index([status])
}

model ExamSubmission {
  id          String               @id @default(cuid())
  instanceId  String
  studentId   String
  status      ExamSubmissionStatus @default(NOT_STARTED)
  startedAt   DateTime?
  submittedAt DateTime?
  gradedAt    DateTime?
  totalScore  Float?
  passed      Boolean?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  instance ExamInstance  @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  student  StudentProfile @relation(fields: [studentId], references: [id])
  answers  ExamAnswer[]

  @@unique([instanceId, studentId])
  @@index([instanceId])
  @@index([studentId])
}

model ExamAnswer {
  id               String   @id @default(cuid())
  submissionId     String
  questionId       String
  answer           String?
  isCorrect        Boolean?
  score            Float?
  moderatorNotes   String?
  recitationResult String?
  tajweedNotes     String?
  fluencyNotes     String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  submission ExamSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  question   ExamQuestion   @relation(fields: [questionId], references: [id])

  @@unique([submissionId, questionId])
  @@index([submissionId])
  @@index([questionId])
}
```

- [ ] **Step 2: Add reverse relations to existing models**

Add to the `User` model (after the existing `ticketReplies` line):

```prisma
  createdExamTemplates ExamTemplate[] @relation("examTemplateCreator")
  createdExamInstances ExamInstance[] @relation("examInstanceCreator")
```

Add to the `Group` model (after the existing relations):

```prisma
  examInstances ExamInstance[]
```

Add to the `WeeklySession` model (after the `leaveRequests` line):

```prisma
  examInstances ExamInstance[]
```

Add to the `StudentProfile` model (after the existing relations):

```prisma
  examSubmissions ExamSubmission[]
```

Add to the `QuranSurah` model (after the `reviewNextToSurahs` line):

```prisma
  examQuestionsFrom ExamQuestion[] @relation("examQuestionFromSurah")
  examQuestionsTo   ExamQuestion[] @relation("examQuestionToSurah")
```

- [ ] **Step 3: Validate and generate**

Run:
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma validate
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
```

Expected: Both succeed with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add ExamTemplate, ExamQuestion, ExamInstance, ExamSubmission, ExamAnswer models"
```

---

### Task 2: Permissions — Add Exam Permission Constants

**Files:**
- Modify: `lib/constants/permissions.ts`

- [ ] **Step 1: Add missing permission constants**

The file already has `EXAMS_CREATE` and `EXAMS_GRADE`. Add the two missing ones after `EXAMS_GRADE: "exams.grade",`:

```typescript
  EXAMS_VIEW_ALL: "exams.view_all",
  EXAMS_VIEW_ASSIGNED: "exams.view_assigned",
```

- [ ] **Step 2: Add view_assigned to moderator role**

In the `ROLE_PERMISSIONS` object, in the `moderator` array, add after `PERMISSIONS.EXAMS_GRADE,`:

```typescript
    PERMISSIONS.EXAMS_VIEW_ASSIGNED,
```

Note: `EXAMS_VIEW_ALL` is admin-only and admin already gets all permissions via the admin role pattern — do NOT add it to moderator.

- [ ] **Step 3: Commit**

```bash
git add lib/constants/permissions.ts
git commit -m "feat: add exam view permissions constants"
```

---

### Task 3: i18n — Add Exams Namespace

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add exams namespace to en.json**

Add an `"exams"` key at the top level of `messages/en.json`:

```json
"exams": {
  "title": "Exams",
  "createExam": "Create Exam",
  "examTitle": "Exam Title",
  "description": "Description",
  "passingScore": "Passing Score (%)",
  "totalPoints": "Total Points",
  "questionCount": "Questions",
  "createdAt": "Created",
  "viewDetails": "View Details",
  "noExams": "No exams yet.",
  "addQuestion": "Add Question",
  "questionType": "Question Type",
  "multipleChoice": "Multiple Choice",
  "trueFalse": "True / False",
  "shortAnswer": "Short Answer",
  "recitation": "Recitation",
  "questionText": "Question Text",
  "points": "Points",
  "options": "Options",
  "option": "Option",
  "correctAnswer": "Correct Answer",
  "addOption": "Add Option",
  "fromSurah": "From Surah",
  "fromAyah": "From Ayah",
  "toSurah": "To Surah",
  "toAyah": "To Ayah",
  "deleteQuestion": "Delete",
  "assignToGroups": "Assign to Groups",
  "selectGroups": "Select Groups",
  "startDate": "Start Date",
  "endDate": "End Date",
  "session": "Session (optional)",
  "assign": "Assign",
  "results": "Results",
  "groupName": "Group",
  "status": "Status",
  "dateRange": "Date Range",
  "submissions": "Submissions",
  "averageScore": "Avg Score",
  "passRate": "Pass Rate",
  "draft": "Draft",
  "published": "Published",
  "inProgress": "In Progress",
  "completed": "Completed",
  "notStarted": "Not Started",
  "submitted": "Submitted",
  "graded": "Graded",
  "publish": "Publish",
  "start": "Start",
  "complete": "Complete",
  "customize": "Customize",
  "customizeRecitation": "Customize Recitation Ranges",
  "studentName": "Student",
  "submissionStatus": "Status",
  "score": "Score",
  "grade": "Grade",
  "passed": "Passed",
  "failed": "Failed",
  "gradingProgress": "Grading Progress",
  "submitGrades": "Submit Grades",
  "moderatorNotes": "Notes",
  "recitationResult": "Recitation Result",
  "tajweedNotes": "Tajweed Notes",
  "fluencyNotes": "Fluency Notes",
  "saveProgress": "Save Progress",
  "submitExam": "Submit Exam",
  "awaitingGrading": "Your exam has been submitted and is awaiting grading.",
  "examResults": "Exam Results",
  "correct": "Correct",
  "incorrect": "Incorrect",
  "prepareRecitation": "Prepare to recite",
  "backToList": "Back to Exams",
  "backToInstance": "Back to Exam",
  "noInstances": "No exam instances yet.",
  "noSubmissions": "No submissions yet.",
  "filter": "Filter",
  "showActive": "Active",
  "showAll": "All",
  "selectSession": "Select Session",
  "updateTemplate": "Update",
  "save": "Save"
}
```

- [ ] **Step 2: Add exams namespace to ar.json**

Add an `"exams"` key at the top level of `messages/ar.json`:

```json
"exams": {
  "title": "الاختبارات",
  "createExam": "إنشاء اختبار",
  "examTitle": "عنوان الاختبار",
  "description": "الوصف",
  "passingScore": "درجة النجاح (%)",
  "totalPoints": "مجموع الدرجات",
  "questionCount": "الأسئلة",
  "createdAt": "تاريخ الإنشاء",
  "viewDetails": "عرض التفاصيل",
  "noExams": "لا توجد اختبارات بعد.",
  "addQuestion": "إضافة سؤال",
  "questionType": "نوع السؤال",
  "multipleChoice": "اختيار من متعدد",
  "trueFalse": "صح / خطأ",
  "shortAnswer": "إجابة قصيرة",
  "recitation": "تلاوة",
  "questionText": "نص السؤال",
  "points": "الدرجات",
  "options": "الخيارات",
  "option": "خيار",
  "correctAnswer": "الإجابة الصحيحة",
  "addOption": "إضافة خيار",
  "fromSurah": "من السورة",
  "fromAyah": "من الآية",
  "toSurah": "إلى السورة",
  "toAyah": "إلى الآية",
  "deleteQuestion": "حذف",
  "assignToGroups": "تعيين للمجموعات",
  "selectGroups": "اختيار المجموعات",
  "startDate": "تاريخ البدء",
  "endDate": "تاريخ الانتهاء",
  "session": "الحلقة (اختياري)",
  "assign": "تعيين",
  "results": "النتائج",
  "groupName": "المجموعة",
  "status": "الحالة",
  "dateRange": "الفترة",
  "submissions": "التقديمات",
  "averageScore": "المعدل",
  "passRate": "نسبة النجاح",
  "draft": "مسودة",
  "published": "منشور",
  "inProgress": "جارٍ",
  "completed": "مكتمل",
  "notStarted": "لم يبدأ",
  "submitted": "تم التقديم",
  "graded": "تم التقييم",
  "publish": "نشر",
  "start": "بدء",
  "complete": "إكمال",
  "customize": "تخصيص",
  "customizeRecitation": "تخصيص نطاقات التلاوة",
  "studentName": "الطالب",
  "submissionStatus": "الحالة",
  "score": "الدرجة",
  "grade": "تقييم",
  "passed": "ناجح",
  "failed": "راسب",
  "gradingProgress": "تقدم التقييم",
  "submitGrades": "تقديم التقييم",
  "moderatorNotes": "ملاحظات",
  "recitationResult": "نتيجة التلاوة",
  "tajweedNotes": "ملاحظات التجويد",
  "fluencyNotes": "ملاحظات الطلاقة",
  "saveProgress": "حفظ التقدم",
  "submitExam": "تقديم الاختبار",
  "awaitingGrading": "تم تقديم اختبارك وهو بانتظار التقييم.",
  "examResults": "نتائج الاختبار",
  "correct": "صحيح",
  "incorrect": "خطأ",
  "prepareRecitation": "استعد لتلاوة",
  "backToList": "العودة للاختبارات",
  "backToInstance": "العودة للاختبار",
  "noInstances": "لا توجد اختبارات معيّنة بعد.",
  "noSubmissions": "لا توجد تقديمات بعد.",
  "filter": "تصفية",
  "showActive": "النشطة",
  "showAll": "الكل",
  "selectSession": "اختيار الحلقة",
  "updateTemplate": "تحديث",
  "save": "حفظ"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): add exams namespace for both locales"
```

---

### Task 4: Zod Validation Schemas

**Files:**
- Create: `lib/validations/exam.ts`

- [ ] **Step 1: Create validation schemas**

```typescript
import { z } from "zod";

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.coerce.number().int().min(1).max(100),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.coerce.number().int().min(1).max(100),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const addQuestionSchema = z.object({
  templateId: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "RECITATION"]),
  text: z.string().min(1).max(2000),
  points: z.coerce.number().int().min(1).max(100),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  fromSurahNumber: z.coerce.number().int().optional(),
  fromAyah: z.coerce.number().int().optional(),
  toSurahNumber: z.coerce.number().int().optional(),
  toAyah: z.coerce.number().int().optional(),
});

export type AddQuestionInput = z.infer<typeof addQuestionSchema>;

export const deleteQuestionSchema = z.object({
  questionId: z.string().min(1),
  templateId: z.string().min(1),
});

export type DeleteQuestionInput = z.infer<typeof deleteQuestionSchema>;

export const assignToGroupsSchema = z.object({
  templateId: z.string().min(1),
  groupIds: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  sessionId: z.string().optional(),
});

export type AssignToGroupsInput = z.infer<typeof assignToGroupsSchema>;

export const changeInstanceStatusSchema = z.object({
  instanceId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED"]),
});

export type ChangeInstanceStatusInput = z.infer<typeof changeInstanceStatusSchema>;

export const customizeInstanceSchema = z.object({
  instanceId: z.string().min(1),
  customizations: z.string().min(1),
});

export type CustomizeInstanceInput = z.infer<typeof customizeInstanceSchema>;

export const saveAnswersSchema = z.object({
  instanceId: z.string().min(1),
  answers: z.string().min(1),
  submit: z.string().optional(),
});

export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  grades: z.string().min(1),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
```

Note: `options`, `answers`, `grades`, and `customizations` are JSON strings parsed from FormData. The service layer will `JSON.parse` them.

- [ ] **Step 2: Commit**

```bash
git add lib/validations/exam.ts
git commit -m "feat: add Zod validation schemas for exams"
```

---

### Task 5: Exam Service

**Files:**
- Create: `server/services/exam.ts`

- [ ] **Step 1: Create exam service with all functions**

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification, createBulkNotifications } from "./notification";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  AddQuestionInput,
  AssignToGroupsInput,
  ChangeInstanceStatusInput,
  GradeSubmissionInput,
} from "@/lib/validations/exam";

// ── Template CRUD ──

export async function createTemplate(input: CreateTemplateInput, actorId: string) {
  const template = await db.examTemplate.create({
    data: {
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
      totalPoints: 0,
      createdById: actorId,
    },
  });

  await createAuditLog({
    actorId,
    action: "exam_template.create",
    entityType: "ExamTemplate",
    entityId: template.id,
    metadata: { title: input.title },
  });

  return template;
}

export async function updateTemplate(input: UpdateTemplateInput, actorId: string) {
  const template = await db.examTemplate.update({
    where: { id: input.templateId },
    data: {
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
    },
  });

  await createAuditLog({
    actorId,
    action: "exam_template.update",
    entityType: "ExamTemplate",
    entityId: template.id,
    metadata: { title: input.title },
  });

  return template;
}

export async function getTemplate(templateId: string) {
  return db.examTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
          toSurah: { select: { number: true, nameAr: true, nameEn: true } },
        },
      },
      _count: { select: { instances: true } },
    },
  });
}

export async function listTemplates() {
  return db.examTemplate.findMany({
    include: {
      _count: { select: { questions: true, instances: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Questions ──

export async function addQuestion(input: AddQuestionInput, actorId: string) {
  const maxOrder = await db.examQuestion.findFirst({
    where: { templateId: input.templateId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  let parsedOptions: { label: string; isCorrect: boolean }[] | undefined;
  if (input.type === "TRUE_FALSE") {
    parsedOptions = [
      { label: "True", isCorrect: true },
      { label: "False", isCorrect: false },
    ];
  } else if (input.type === "MULTIPLE_CHOICE" && input.options) {
    parsedOptions = JSON.parse(input.options);
  }

  const question = await db.examQuestion.create({
    data: {
      templateId: input.templateId,
      type: input.type,
      text: input.text,
      points: input.points,
      order: nextOrder,
      options: parsedOptions || undefined,
      correctAnswer: input.type === "SHORT_ANSWER" ? input.correctAnswer : undefined,
      fromSurahNumber: input.type === "RECITATION" ? input.fromSurahNumber : undefined,
      fromAyah: input.type === "RECITATION" ? input.fromAyah : undefined,
      toSurahNumber: input.type === "RECITATION" ? input.toSurahNumber : undefined,
      toAyah: input.type === "RECITATION" ? input.toAyah : undefined,
    },
  });

  await recalculateTotalPoints(input.templateId);

  await createAuditLog({
    actorId,
    action: "exam_question.add",
    entityType: "ExamTemplate",
    entityId: input.templateId,
    metadata: { questionId: question.id, type: input.type },
  });

  return question;
}

export async function deleteQuestion(questionId: string, templateId: string, actorId: string) {
  await db.examQuestion.delete({ where: { id: questionId } });
  await recalculateTotalPoints(templateId);

  await createAuditLog({
    actorId,
    action: "exam_question.delete",
    entityType: "ExamTemplate",
    entityId: templateId,
    metadata: { questionId },
  });
}

async function recalculateTotalPoints(templateId: string) {
  const result = await db.examQuestion.aggregate({
    where: { templateId },
    _sum: { points: true },
  });
  await db.examTemplate.update({
    where: { id: templateId },
    data: { totalPoints: result._sum.points ?? 0 },
  });
}

// ── Instances ──

export async function assignToGroups(input: AssignToGroupsInput, actorId: string) {
  const groupIds: string[] = JSON.parse(input.groupIds);
  const instances = [];

  for (const groupId of groupIds) {
    const instance = await db.examInstance.create({
      data: {
        templateId: input.templateId,
        groupId,
        sessionId: input.sessionId || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "DRAFT",
        createdById: actorId,
      },
    });
    instances.push(instance);
  }

  await createAuditLog({
    actorId,
    action: "exam_instance.assign",
    entityType: "ExamTemplate",
    entityId: input.templateId,
    metadata: { groupIds, count: groupIds.length },
  });

  return instances;
}

const VALID_INSTANCE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["IN_PROGRESS", "DRAFT"],
  IN_PROGRESS: ["COMPLETED", "DRAFT"],
  COMPLETED: ["DRAFT"],
};

export async function changeInstanceStatus(input: ChangeInstanceStatusInput, actorId: string) {
  const current = await db.examInstance.findUniqueOrThrow({
    where: { id: input.instanceId },
    include: {
      template: { select: { title: true } },
      group: {
        include: {
          students: { include: { student: { select: { userId: true } } } },
        },
      },
    },
  });

  if (input.status !== "DRAFT") {
    const allowed = VALID_INSTANCE_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(input.status)) {
      throw new Error(`Invalid transition from ${current.status} to ${input.status}`);
    }
  }

  const instance = await db.examInstance.update({
    where: { id: input.instanceId },
    data: { status: input.status },
  });

  if (input.status === "PUBLISHED") {
    const studentUserIds = current.group.students.map((gs) => gs.student.userId);
    if (studentUserIds.length > 0) {
      await createBulkNotifications(
        studentUserIds,
        "EXAM_PUBLISHED",
        `New exam available: ${current.template.title}`
      );
    }
  }

  await createAuditLog({
    actorId,
    action: `exam_instance.${input.status.toLowerCase()}`,
    entityType: "ExamInstance",
    entityId: input.instanceId,
    metadata: { status: input.status },
  });

  return instance;
}

export async function customizeInstance(instanceId: string, customizations: string, actorId: string) {
  const parsed = JSON.parse(customizations);
  const instance = await db.examInstance.update({
    where: { id: instanceId },
    data: { customizations: parsed },
  });

  await createAuditLog({
    actorId,
    action: "exam_instance.customize",
    entityType: "ExamInstance",
    entityId: instanceId,
    metadata: {},
  });

  return instance;
}

export async function getModeratorInstances(userId: string, filter?: "active" | "all") {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true } } },
  });
  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.examInstance.findMany({
    where: {
      groupId: { in: groupIds },
      ...(filter === "active" || !filter
        ? { status: { in: ["PUBLISHED", "IN_PROGRESS"] } }
        : {}),
    },
    include: {
      template: { select: { title: true, totalPoints: true, passingScore: true } },
      group: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getInstanceDetail(instanceId: string) {
  return db.examInstance.findUniqueOrThrow({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
              toSurah: { select: { number: true, nameAr: true, nameEn: true } },
            },
          },
        },
      },
      group: {
        include: {
          students: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, nameAr: true } } },
              },
            },
          },
          moderator: { select: { userId: true } },
        },
      },
      submissions: {
        include: {
          student: {
            include: { user: { select: { id: true, name: true, nameAr: true } } },
          },
        },
      },
    },
  });
}

export async function getAllInstances(filter?: "active" | "all") {
  return db.examInstance.findMany({
    where:
      filter === "active" || !filter
        ? { status: { not: "COMPLETED" } }
        : {},
    include: {
      template: { select: { title: true, totalPoints: true, passingScore: true } },
      group: { select: { name: true } },
      _count: { select: { submissions: true } },
      submissions: {
        select: { totalScore: true, passed: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ── Submissions ──

export async function getOrCreateSubmission(instanceId: string, studentProfileId: string) {
  let submission = await db.examSubmission.findUnique({
    where: { instanceId_studentId: { instanceId, studentId: studentProfileId } },
    include: {
      answers: { include: { question: true } },
      instance: {
        include: {
          template: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: {
                  fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!submission) {
    submission = await db.examSubmission.create({
      data: { instanceId, studentId: studentProfileId },
      include: {
        answers: { include: { question: true } },
        instance: {
          include: {
            template: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                  include: {
                    fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                    toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  return submission;
}

export async function saveAnswers(
  instanceId: string,
  studentProfileId: string,
  answersJson: string,
  shouldSubmit: boolean,
  actorId: string
) {
  const answers: { questionId: string; answer: string | null }[] = JSON.parse(answersJson);

  const instance = await db.examInstance.findUniqueOrThrow({
    where: { id: instanceId },
    include: {
      template: {
        include: { questions: { select: { id: true, type: true, options: true, points: true } } },
      },
    },
  });

  const now = new Date();
  if (now < instance.startDate || now > instance.endDate) {
    throw new Error("Exam is not within the submission window");
  }
  if (instance.status !== "PUBLISHED" && instance.status !== "IN_PROGRESS") {
    throw new Error("Exam is not accepting submissions");
  }

  let submission = await db.examSubmission.findUnique({
    where: { instanceId_studentId: { instanceId, studentId: studentProfileId } },
  });

  if (!submission) {
    submission = await db.examSubmission.create({
      data: {
        instanceId,
        studentId: studentProfileId,
        status: "IN_PROGRESS",
        startedAt: now,
      },
    });
  } else if (submission.status === "NOT_STARTED") {
    submission = await db.examSubmission.update({
      where: { id: submission.id },
      data: { status: "IN_PROGRESS", startedAt: now },
    });
  }

  if (submission.status === "SUBMITTED" || submission.status === "GRADED") {
    throw new Error("Exam already submitted");
  }

  const questionMap = new Map(
    instance.template.questions.map((q) => [q.id, q])
  );

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    let isCorrect: boolean | null = null;
    let autoScore: number | null = null;

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      const opts = question.options as { label: string; isCorrect: boolean }[];
      if (opts && ans.answer !== null) {
        const idx = parseInt(ans.answer, 10);
        isCorrect = opts[idx]?.isCorrect ?? false;
        autoScore = isCorrect ? question.points : 0;
      }
    }

    await db.examAnswer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId: ans.questionId,
        },
      },
      update: {
        answer: ans.answer,
        isCorrect,
        score: autoScore,
      },
      create: {
        submissionId: submission.id,
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
        score: autoScore,
      },
    });
  }

  if (shouldSubmit) {
    await db.examSubmission.update({
      where: { id: submission.id },
      data: { status: "SUBMITTED", submittedAt: now },
    });

    const moderatorUserId = await db.group.findUnique({
      where: { id: instance.groupId },
      select: { moderator: { select: { userId: true } } },
    });

    if (moderatorUserId?.moderator?.userId) {
      const student = await db.user.findUnique({
        where: { id: actorId },
        select: { name: true, nameAr: true },
      });
      await createNotification({
        recipientId: moderatorUserId.moderator.userId,
        type: "EXAM_SUBMITTED",
        title: `${student?.nameAr || student?.name} submitted exam: ${instance.template.title}`,
      });
    }
  }

  await createAuditLog({
    actorId,
    action: shouldSubmit ? "exam_submission.submit" : "exam_submission.save",
    entityType: "ExamSubmission",
    entityId: submission.id,
    metadata: { instanceId },
  });

  return submission;
}

export async function getSubmissionForGrading(submissionId: string) {
  return db.examSubmission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      student: {
        include: { user: { select: { id: true, name: true, nameAr: true } } },
      },
      instance: {
        include: {
          template: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: {
                  fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                },
              },
            },
          },
        },
      },
      answers: {
        include: { question: true },
      },
    },
  });
}

export async function gradeSubmission(input: GradeSubmissionInput, actorId: string) {
  const grades: {
    questionId: string;
    score: number;
    moderatorNotes?: string;
    recitationResult?: string;
    tajweedNotes?: string;
    fluencyNotes?: string;
  }[] = JSON.parse(input.grades);

  const submission = await db.examSubmission.findUniqueOrThrow({
    where: { id: input.submissionId },
    include: {
      instance: {
        include: {
          template: { select: { totalPoints: true, passingScore: true, title: true } },
        },
      },
      student: { select: { userId: true } },
    },
  });

  if (submission.status !== "SUBMITTED") {
    throw new Error("Submission is not in SUBMITTED status");
  }

  for (const grade of grades) {
    await db.examAnswer.update({
      where: {
        submissionId_questionId: {
          submissionId: input.submissionId,
          questionId: grade.questionId,
        },
      },
      data: {
        score: grade.score,
        moderatorNotes: grade.moderatorNotes || null,
        recitationResult: grade.recitationResult || null,
        tajweedNotes: grade.tajweedNotes || null,
        fluencyNotes: grade.fluencyNotes || null,
      },
    });
  }

  const allAnswers = await db.examAnswer.findMany({
    where: { submissionId: input.submissionId },
    select: { score: true },
  });

  const totalEarned = allAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalPoints = submission.instance.template.totalPoints;
  const percentage = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;
  const passed = percentage >= submission.instance.template.passingScore;

  await db.examSubmission.update({
    where: { id: input.submissionId },
    data: {
      status: "GRADED",
      gradedAt: new Date(),
      totalScore: Math.round(percentage * 100) / 100,
      passed,
    },
  });

  await createNotification({
    recipientId: submission.student.userId,
    type: "EXAM_GRADED",
    title: `Your exam has been graded: ${submission.instance.template.title}`,
  });

  await createAuditLog({
    actorId,
    action: "exam_submission.grade",
    entityType: "ExamSubmission",
    entityId: input.submissionId,
    metadata: { totalScore: percentage, passed },
  });
}

// ── Student queries ──

export async function getStudentInstances(studentProfileId: string) {
  const groups = await db.groupStudent.findMany({
    where: { studentId: studentProfileId },
    select: { groupId: true },
  });
  const groupIds = groups.map((g) => g.groupId);

  return db.examInstance.findMany({
    where: {
      groupId: { in: groupIds },
      status: { in: ["PUBLISHED", "IN_PROGRESS", "COMPLETED"] },
    },
    include: {
      template: { select: { title: true } },
      group: { select: { name: true } },
      submissions: {
        where: { studentId: studentProfileId },
        select: { status: true, totalScore: true, passed: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/exam.ts
git commit -m "feat: add exam service with CRUD, instances, submissions, and grading"
```

---

### Task 6: Server Actions

**Files:**
- Create: `server/actions/exam.ts`

- [ ] **Step 1: Create server actions**

```typescript
"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission, hasPermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createTemplate,
  updateTemplate,
  addQuestion,
  deleteQuestion,
  assignToGroups,
  changeInstanceStatus,
  customizeInstance,
  saveAnswers,
  gradeSubmission,
} from "@/server/services/exam";
import {
  createTemplateSchema,
  updateTemplateSchema,
  addQuestionSchema,
  deleteQuestionSchema,
  assignToGroupsSchema,
  changeInstanceStatusSchema,
  customizeInstanceSchema,
  saveAnswersSchema,
  gradeSubmissionSchema,
} from "@/lib/validations/exam";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

function revalidateExamPaths() {
  revalidatePath("/ar/admin/exams");
  revalidatePath("/en/admin/exams");
  revalidatePath("/ar/moderator/exams");
  revalidatePath("/en/moderator/exams");
  revalidatePath("/ar/student/exams");
  revalidatePath("/en/student/exams");
}

export async function createTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function addQuestionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = addQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await addQuestion(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function deleteQuestionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = deleteQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await deleteQuestion(parsed.data.questionId, parsed.data.templateId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function assignToGroupsAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = {
    ...Object.fromEntries(formData.entries()),
    groupIds: JSON.stringify(formData.getAll("groupIds")),
  };
  const parsed = assignToGroupsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await assignToGroups(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function changeInstanceStatusAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = changeInstanceStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: { group: { select: { moderatorId: true, moderator: { select: { userId: true } } } } },
  });
  if (!instance) return { error: "instanceNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = instance.group.moderator?.userId === session.user.id;

  if (parsed.data.status === "DRAFT" && !isAdmin) {
    return { error: "notAuthorized" };
  }
  if (!isModerator && !isAdmin) {
    return { error: "notAuthorized" };
  }

  try {
    await changeInstanceStatus(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function customizeInstanceAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = customizeInstanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: { group: { select: { moderator: { select: { userId: true } } } } },
  });
  if (!instance) return { error: "instanceNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = instance.group.moderator?.userId === session.user.id;
  if (!isModerator && !isAdmin) return { error: "notAuthorized" };

  if (instance.status !== "DRAFT" && instance.status !== "PUBLISHED") {
    return { error: "cannotCustomize" };
  }

  try {
    await customizeInstance(parsed.data.instanceId, parsed.data.customizations, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function saveAnswersAction(formData: FormData) {
  const session = await requireApprovedUser();

  const answerEntries = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      const questionId = key.replace("q_", "");
      answerEntries.push({ questionId, answer: (value as string) || null });
    }
  }
  const raw = {
    instanceId: formData.get("instanceId") as string,
    answers: JSON.stringify(answerEntries),
    submit: (formData.get("submit") as string) || undefined,
  };
  const parsed = saveAnswersSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) return { error: "noStudentProfile" };

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: {
      group: {
        include: { students: { where: { studentId: studentProfile.id }, select: { id: true } } },
      },
    },
  });
  if (!instance) return { error: "instanceNotFound" };
  if (instance.group.students.length === 0) return { error: "notInGroup" };

  const shouldSubmit = parsed.data.submit === "true";

  try {
    await saveAnswers(
      parsed.data.instanceId,
      studentProfile.id,
      parsed.data.answers,
      shouldSubmit,
      session.user.id
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function gradeSubmissionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_GRADE);
  const session = await requireApprovedUser();

  const grades = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) {
      const questionId = key.replace("score_", "");
      grades.push({
        questionId,
        score: parseFloat(value as string) || 0,
        moderatorNotes: (formData.get(`notes_${questionId}`) as string) || undefined,
        recitationResult: (formData.get(`recitationResult_${questionId}`) as string) || undefined,
        tajweedNotes: (formData.get(`tajweedNotes_${questionId}`) as string) || undefined,
        fluencyNotes: (formData.get(`fluencyNotes_${questionId}`) as string) || undefined,
      });
    }
  }
  const raw = {
    submissionId: formData.get("submissionId") as string,
    grades: JSON.stringify(grades),
  };
  const parsed = gradeSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const submission = await db.examSubmission.findUnique({
    where: { id: parsed.data.submissionId },
    include: {
      instance: {
        include: { group: { select: { moderator: { select: { userId: true } } } } },
      },
    },
  });
  if (!submission) return { error: "submissionNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = submission.instance.group.moderator?.userId === session.user.id;
  if (!isModerator && !isAdmin) return { error: "notAuthorized" };

  try {
    await gradeSubmission(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/actions/exam.ts
git commit -m "feat: add exam server actions with auth, validation, and revalidation"
```

---

### Task 7: Sidebar Navigation

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add exam nav items**

Add `ClipboardCheck` to the lucide-react import (it's not yet imported — `ClipboardList` is used for enrollment, use `ClipboardCheck` for exams):

```typescript
import {
  // ... existing imports ...
  ClipboardCheck,
} from "lucide-react";
```

Add to `adminNav` array after the `tickets` entry:

```typescript
  { labelKey: "exams", href: "/admin/exams", icon: ClipboardCheck },
```

Add to `moderatorNav` array after the `leaveRequests` entry:

```typescript
  { labelKey: "exams", href: "/moderator/exams", icon: ClipboardCheck },
```

Add to `studentNav` array after the `leaveRequests` entry:

```typescript
  { labelKey: "exams", href: "/student/exams", icon: ClipboardCheck },
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add exam nav items to sidebar for admin, moderator, and student"
```

---

### Task 8: Admin Exam Template List Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/exams/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listTemplates } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { createTemplateAction } from "@/server/actions/exam";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const createTemplate = createTemplateAction as unknown as (formData: FormData) => void;

export default async function AdminExamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_CREATE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("createExam")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTemplate} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("examTitle")}</Label>
              <Input name="title" required />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Input name="description" />
            </div>
            <div className="space-y-2">
              <Label>{t("passingScore")}</Label>
              <Input name="passingScore" type="number" defaultValue="70" min="1" max="100" required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {templates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("questionCount")}</TableHead>
              <TableHead>{t("totalPoints")}</TableHead>
              <TableHead>{t("passingScore")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tmpl) => (
              <TableRow key={tmpl.id}>
                <TableCell className="font-medium">{tmpl.title}</TableCell>
                <TableCell>{tmpl._count.questions}</TableCell>
                <TableCell>{tmpl.totalPoints}</TableCell>
                <TableCell>{tmpl.passingScore}%</TableCell>
                <TableCell>{new Date(tmpl.createdAt).toLocaleDateString(locale)}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/admin/exams/${tmpl.id}`}>
                    <Button variant="outline" size="sm">{t("viewDetails")}</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noExams")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/exams/page.tsx"
git commit -m "feat: add admin exam template list page with create form"
```

---

### Task 9: Admin Exam Template Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/exams/[examId]/page.tsx`

- [ ] **Step 1: Create the page**

This is the most complex page — it has: editable template header, question list with delete, add question form (type-dependent fields), and assign-to-groups section.

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTemplate } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import {
  updateTemplateAction,
  addQuestionAction,
  deleteQuestionAction,
  assignToGroupsAction,
} from "@/server/actions/exam";
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

const updateTemplateFn = updateTemplateAction as unknown as (formData: FormData) => void;
const addQuestionFn = addQuestionAction as unknown as (formData: FormData) => void;
const deleteQuestionFn = deleteQuestionAction as unknown as (formData: FormData) => void;
const assignToGroupsFn = assignToGroupsAction as unknown as (formData: FormData) => void;

const TYPE_BADGES: Record<string, string> = {
  MULTIPLE_CHOICE: "bg-blue-100 text-blue-800",
  TRUE_FALSE: "bg-purple-100 text-purple-800",
  SHORT_ANSWER: "bg-amber-100 text-amber-800",
  RECITATION: "bg-green-100 text-green-800",
};

export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; examId: string }>;
}) {
  const { locale, examId } = await params;
  setRequestLocale(locale);
  await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_CREATE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let template;
  try {
    template = await getTemplate(examId);
  } catch {
    notFound();
  }

  const [groups, surahs] = await Promise.all([
    db.group.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.quranSurah.findMany({ select: { number: true, nameAr: true, nameEn: true, ayahCount: true }, orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/admin/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      {/* Template Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t("updateTemplate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTemplateFn} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="space-y-2">
              <Label>{t("examTitle")}</Label>
              <Input name="title" defaultValue={template.title} required />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Input name="description" defaultValue={template.description || ""} />
            </div>
            <div className="space-y-2">
              <Label>{t("passingScore")}</Label>
              <Input name="passingScore" type="number" defaultValue={template.passingScore} min="1" max="100" required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("questionCount")}: {template.questions.length} ({t("totalPoints")}: {template.totalPoints})</CardTitle>
        </CardHeader>
        <CardContent>
          {template.questions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("questionType")}</TableHead>
                  <TableHead>{t("questionText")}</TableHead>
                  <TableHead>{t("points")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.order}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_BADGES[q.type] || ""}>
                        {t(q.type === "MULTIPLE_CHOICE" ? "multipleChoice" : q.type === "TRUE_FALSE" ? "trueFalse" : q.type === "SHORT_ANSWER" ? "shortAnswer" : "recitation")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{q.text}</TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell>
                      <form action={deleteQuestionFn}>
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="templateId" value={template.id} />
                        <Button type="submit" variant="destructive" size="sm">{t("deleteQuestion")}</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noExams")}</p>
          )}
        </CardContent>
      </Card>

      {/* Add Question Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("addQuestion")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addQuestionFn} className="grid gap-4">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("questionType")}</Label>
                <select
                  name="type"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MULTIPLE_CHOICE">{t("multipleChoice")}</option>
                  <option value="TRUE_FALSE">{t("trueFalse")}</option>
                  <option value="SHORT_ANSWER">{t("shortAnswer")}</option>
                  <option value="RECITATION">{t("recitation")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("questionText")}</Label>
                <Input name="text" required />
              </div>
              <div className="space-y-2">
                <Label>{t("points")}</Label>
                <Input name="points" type="number" defaultValue="10" min="1" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("options")} (JSON — for MC: [{`{"label":"A","isCorrect":true},{"label":"B","isCorrect":false}`}])</Label>
              <Input name="options" placeholder='[{"label":"...","isCorrect":true}]' />
            </div>

            <div className="space-y-2">
              <Label>{t("correctAnswer")} (for Short Answer)</Label>
              <Input name="correctAnswer" />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>{t("fromSurah")}</Label>
                <select name="fromSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("fromAyah")}</Label>
                <Input name="fromAyah" type="number" min="1" />
              </div>
              <div className="space-y-2">
                <Label>{t("toSurah")}</Label>
                <select name="toSurahNumber" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {locale === "ar" ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("toAyah")}</Label>
                <Input name="toAyah" type="number" min="1" />
              </div>
            </div>

            <div>
              <Button type="submit">{t("addQuestion")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Assign to Groups */}
      <Card>
        <CardHeader>
          <CardTitle>{t("assignToGroups")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignToGroupsFn} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="templateId" value={template.id} />
            <div className="space-y-2">
              <Label>{t("selectGroups")}</Label>
              <select
                name="groupIds"
                multiple
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple. The selected values are sent as JSON array.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("startDate")}</Label>
                <Input name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>{t("endDate")}</Label>
                <Input name="endDate" type="date" required />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("assign")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/exams/[examId]/page.tsx"
git commit -m "feat: add admin exam template detail page with question editor and group assignment"
```

---

### Task 10: Admin Exam Results Page

**Files:**
- Create: `app/[locale]/(dashboard)/admin/exams/results/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAllInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";
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
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default async function AdminExamResultsPage({
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
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ALL);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const showAll = filter === "all";
  const instances = await getAllInstances(showAll ? "all" : "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("results")}</h1>
        <a href={showAll ? `/${locale}/admin/exams/results` : `/${locale}/admin/exams/results?filter=all`}>
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissions")}</TableHead>
              <TableHead>{t("averageScore")}</TableHead>
              <TableHead>{t("passRate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const statusKey = inst.status === "IN_PROGRESS" ? "inProgress" : inst.status.toLowerCase();
              const graded = inst.submissions.filter((s) => s.status === "GRADED");
              const avgScore = graded.length > 0
                ? Math.round(graded.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / graded.length)
                : null;
              const passCount = graded.filter((s) => s.passed).length;
              const passRate = graded.length > 0 ? Math.round((passCount / graded.length) * 100) : null;

              return (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.template.title}</TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[inst.status] || ""}>
                      {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{graded.length}/{inst._count.submissions}</TableCell>
                  <TableCell>{avgScore !== null ? `${avgScore}%` : "—"}</TableCell>
                  <TableCell>{passRate !== null ? `${passRate}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noInstances")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/admin/exams/results/page.tsx"
git commit -m "feat: add admin exam results overview page"
```

---

### Task 11: Moderator Exam Instance List Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/exams/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getModeratorInstances } from "@/server/services/exam";
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
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default async function ModeratorExamsPage({
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
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");
  const showAll = filter === "all";
  const instances = await getModeratorInstances(session.user.id, showAll ? "all" : "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a href={showAll ? `/${locale}/moderator/exams` : `/${locale}/moderator/exams?filter=all`}>
          <Button variant="outline" size="sm">
            {showAll ? t("showActive") : t("showAll")}
          </Button>
        </a>
      </div>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissions")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const statusKey = inst.status === "IN_PROGRESS" ? "inProgress" : inst.status.toLowerCase();
              return (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.template.title}</TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[inst.status] || ""}>
                      {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>{inst._count.submissions}</TableCell>
                  <TableCell>
                    <Link href={`/${locale}/moderator/exams/${inst.id}`}>
                      <Button variant="outline" size="sm">{t("viewDetails")}</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noInstances")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/exams/page.tsx"
git commit -m "feat: add moderator exam instance list page"
```

---

### Task 12: Moderator Exam Instance Detail Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/exams/[instanceId]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getInstanceDetail } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { changeInstanceStatusAction, customizeInstanceAction } from "@/server/actions/exam";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const changeStatusFn = changeInstanceStatusAction as unknown as (formData: FormData) => void;
const customizeFn = customizeInstanceAction as unknown as (formData: FormData) => void;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const SUBMISSION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  GRADED: "bg-green-100 text-green-800",
};

export default async function ModeratorExamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string }>;
}) {
  const { locale, instanceId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_VIEW_ASSIGNED);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let instance;
  try {
    instance = await getInstanceDetail(instanceId);
  } catch {
    notFound();
  }

  if (instance.group.moderator?.userId !== session.user.id) {
    notFound();
  }

  const statusKey = instance.status === "IN_PROGRESS" ? "inProgress" : instance.status.toLowerCase();
  const recitationQuestions = instance.template.questions.filter((q) => q.type === "RECITATION");

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/moderator/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{instance.template.title}</h1>
        <Badge className={STATUS_COLORS[instance.status] || ""}>
          {t(statusKey as "draft" | "published" | "inProgress" | "completed")}
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t("groupName")}: {instance.group.name}</p>
        <p>{t("dateRange")}: {new Date(instance.startDate).toLocaleDateString(locale)} — {new Date(instance.endDate).toLocaleDateString(locale)}</p>
        <p>{t("passingScore")}: {instance.template.passingScore}%</p>
      </div>

      {/* Status Actions */}
      <div className="flex gap-2">
        {instance.status === "DRAFT" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="PUBLISHED" />
            <Button type="submit" size="sm">{t("publish")}</Button>
          </form>
        )}
        {instance.status === "PUBLISHED" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="IN_PROGRESS" />
            <Button type="submit" size="sm">{t("start")}</Button>
          </form>
        )}
        {instance.status === "IN_PROGRESS" && (
          <form action={changeStatusFn}>
            <input type="hidden" name="instanceId" value={instance.id} />
            <input type="hidden" name="status" value="COMPLETED" />
            <Button type="submit" size="sm" variant="destructive">{t("complete")}</Button>
          </form>
        )}
      </div>

      {/* Recitation Customization */}
      {recitationQuestions.length > 0 && (instance.status === "DRAFT" || instance.status === "PUBLISHED") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("customizeRecitation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={customizeFn} className="space-y-4">
              <input type="hidden" name="instanceId" value={instance.id} />
              <textarea
                name="customizations"
                defaultValue={instance.customizations ? JSON.stringify(instance.customizations, null, 2) : "{}"}
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <Button type="submit" size="sm">{t("save")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Student Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("submissions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentName")}</TableHead>
                <TableHead>{t("submissionStatus")}</TableHead>
                <TableHead>{t("score")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instance.group.students.map((gs) => {
                const sub = instance.submissions.find(
                  (s) => s.student.user.id === gs.student.user.id
                );
                const subStatus = sub?.status ?? "NOT_STARTED";
                const subStatusKey = subStatus === "IN_PROGRESS" ? "inProgress" : subStatus === "NOT_STARTED" ? "notStarted" : subStatus.toLowerCase();

                return (
                  <TableRow key={gs.student.user.id}>
                    <TableCell className="font-medium">
                      {gs.student.user.nameAr || gs.student.user.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={SUBMISSION_COLORS[subStatus] || ""}>
                        {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub?.totalScore !== null && sub?.totalScore !== undefined ? (
                        <>
                          {Math.round(sub.totalScore)}%{" "}
                          <Badge className={sub.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {sub.passed ? t("passed") : t("failed")}
                          </Badge>
                        </>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {sub && sub.status === "SUBMITTED" && (
                        <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                          <Button variant="outline" size="sm">{t("grade")}</Button>
                        </Link>
                      )}
                      {sub && sub.status === "GRADED" && (
                        <Link href={`/${locale}/moderator/exams/${instance.id}/grade/${sub.id}`}>
                          <Button variant="ghost" size="sm">{t("viewDetails")}</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/exams/[instanceId]/page.tsx"
git commit -m "feat: add moderator exam instance detail page with status actions and submissions"
```

---

### Task 13: Moderator Grading Page

**Files:**
- Create: `app/[locale]/(dashboard)/moderator/exams/[instanceId]/grade/[submissionId]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSubmissionForGrading } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { gradeSubmissionAction } from "@/server/actions/exam";
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

const gradeSubmissionFn = gradeSubmissionAction as unknown as (formData: FormData) => void;

const TYPE_BADGES: Record<string, string> = {
  MULTIPLE_CHOICE: "bg-blue-100 text-blue-800",
  TRUE_FALSE: "bg-purple-100 text-purple-800",
  SHORT_ANSWER: "bg-amber-100 text-amber-800",
  RECITATION: "bg-green-100 text-green-800",
};

export default async function ModeratorGradingPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string; submissionId: string }>;
}) {
  const { locale, instanceId, submissionId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();
  await requirePermission(PERMISSIONS.EXAMS_GRADE);

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  let submission;
  try {
    submission = await getSubmissionForGrading(submissionId);
  } catch {
    notFound();
  }

  const questions = submission.instance.template.questions;
  const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));
  const isGraded = submission.status === "GRADED";

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/moderator/exams/${instanceId}`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToInstance")}
      </Link>

      <h1 className="text-2xl font-bold">
        {t("grade")}: {submission.student.user.nameAr || submission.student.user.name}
      </h1>

      <div className="text-sm text-muted-foreground">
        <p>{t("examTitle")}: {submission.instance.template.title}</p>
        {submission.submittedAt && (
          <p>{t("submitted")}: {new Date(submission.submittedAt).toLocaleString(locale)}</p>
        )}
        {isGraded && submission.totalScore !== null && (
          <p>
            {t("score")}: {Math.round(submission.totalScore)}%{" "}
            <Badge className={submission.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {submission.passed ? t("passed") : t("failed")}
            </Badge>
          </p>
        )}
      </div>

      <form action={gradeSubmissionFn}>
        <input type="hidden" name="submissionId" value={submission.id} />

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const typeKey = q.type === "MULTIPLE_CHOICE" ? "multipleChoice" : q.type === "TRUE_FALSE" ? "trueFalse" : q.type === "SHORT_ANSWER" ? "shortAnswer" : "recitation";

            return (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Q{idx + 1}. {q.text}</CardTitle>
                    <Badge className={TYPE_BADGES[q.type] || ""}>{t(typeKey)}</Badge>
                    <span className="text-sm text-muted-foreground">({q.points} {t("points")})</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Show student's answer */}
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && (
                    <div>
                      <p className="text-sm">
                        {answer?.answer !== null && answer?.answer !== undefined
                          ? (q.options as { label: string; isCorrect: boolean }[])?.[parseInt(answer.answer, 10)]?.label ?? "—"
                          : "—"}
                      </p>
                      {answer?.isCorrect !== null && answer?.isCorrect !== undefined && (
                        <Badge className={answer.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {answer.isCorrect ? t("correct") : t("incorrect")}
                        </Badge>
                      )}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <div>
                      <p className="text-sm">{answer?.answer || "—"}</p>
                      {q.correctAnswer && (
                        <p className="text-xs text-muted-foreground">{t("correctAnswer")}: {q.correctAnswer}</p>
                      )}
                    </div>
                  )}

                  {q.type === "RECITATION" && (
                    <div className="text-sm text-muted-foreground">
                      {q.fromSurah && q.toSurah && (
                        <p>
                          {locale === "ar" ? q.fromSurah.nameAr : q.fromSurah.nameEn} ({q.fromAyah}) → {locale === "ar" ? q.toSurah.nameAr : q.toSurah.nameEn} ({q.toAyah})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Grading fields */}
                  {!isGraded ? (
                    <div className="grid gap-3 sm:grid-cols-2 border-t pt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("score")} (0-{q.points})</Label>
                        <Input
                          name={`score_${q.id}`}
                          type="number"
                          min="0"
                          max={q.points}
                          defaultValue={answer?.score ?? ""}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("moderatorNotes")}</Label>
                        <Input
                          name={`notes_${q.id}`}
                          defaultValue={answer?.moderatorNotes ?? ""}
                          className="h-8"
                        />
                      </div>
                      {q.type === "RECITATION" && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("recitationResult")}</Label>
                            <select
                              name={`recitationResult_${q.id}`}
                              defaultValue={answer?.recitationResult ?? ""}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="">—</option>
                              <option value="EXCELLENT">Excellent</option>
                              <option value="GOOD">Good</option>
                              <option value="NEEDS_REVIEW">Needs Review</option>
                              <option value="INCOMPLETE">Incomplete</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("tajweedNotes")}</Label>
                            <Input name={`tajweedNotes_${q.id}`} defaultValue={answer?.tajweedNotes ?? ""} className="h-8" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("fluencyNotes")}</Label>
                            <Input name={`fluencyNotes_${q.id}`} defaultValue={answer?.fluencyNotes ?? ""} className="h-8" />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border-t pt-3 text-sm">
                      <p>{t("score")}: {answer?.score ?? 0}/{q.points}</p>
                      {answer?.moderatorNotes && <p>{t("moderatorNotes")}: {answer.moderatorNotes}</p>}
                      {answer?.recitationResult && <p>{t("recitationResult")}: {answer.recitationResult}</p>}
                      {answer?.tajweedNotes && <p>{t("tajweedNotes")}: {answer.tajweedNotes}</p>}
                      {answer?.fluencyNotes && <p>{t("fluencyNotes")}: {answer.fluencyNotes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isGraded && (
          <div className="mt-6">
            <Button type="submit" size="lg">{t("submitGrades")}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/moderator/exams/[instanceId]/grade/[submissionId]/page.tsx"
git commit -m "feat: add moderator grading page with per-question scoring"
```

---

### Task 14: Student Exam List Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/exams/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getStudentInstances } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { db } from "@/server/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  PUBLISHED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const SUBMISSION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  GRADED: "bg-green-100 text-green-800",
};

export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

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
            {t("noExams")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const instances = await getStudentInstances(studentProfile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {instances.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("examTitle")}</TableHead>
              <TableHead>{t("groupName")}</TableHead>
              <TableHead>{t("dateRange")}</TableHead>
              <TableHead>{t("submissionStatus")}</TableHead>
              <TableHead>{t("score")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((inst) => {
              const sub = inst.submissions[0];
              const subStatus = sub?.status ?? "NOT_STARTED";
              const subStatusKey = subStatus === "IN_PROGRESS" ? "inProgress" : subStatus === "NOT_STARTED" ? "notStarted" : subStatus.toLowerCase();

              return (
                <TableRow key={inst.id}>
                  <TableCell>
                    <Link href={`/${locale}/student/exams/${inst.id}`} className="font-medium hover:underline">
                      {inst.template.title}
                    </Link>
                  </TableCell>
                  <TableCell>{inst.group.name}</TableCell>
                  <TableCell>
                    {new Date(inst.startDate).toLocaleDateString(locale)} — {new Date(inst.endDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Badge className={SUBMISSION_COLORS[subStatus] || ""}>
                      {t(subStatusKey as "notStarted" | "inProgress" | "submitted" | "graded")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub?.totalScore !== null && sub?.totalScore !== undefined ? (
                      <>
                        {Math.round(sub.totalScore)}%{" "}
                        <Badge className={sub.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {sub.passed ? t("passed") : t("failed")}
                        </Badge>
                      </>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noExams")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/exams/page.tsx"
git commit -m "feat: add student exam list page"
```

---

### Task 15: Student Exam Take/Results Page

**Files:**
- Create: `app/[locale]/(dashboard)/student/exams/[instanceId]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireApprovedUser } from "@/server/auth/session";
import { getOrCreateSubmission } from "@/server/services/exam";
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { saveAnswersAction } from "@/server/actions/exam";
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

const saveAnswersFn = saveAnswersAction as unknown as (formData: FormData) => void;

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ locale: string; instanceId: string }>;
}) {
  const { locale, instanceId } = await params;
  setRequestLocale(locale);
  const session = await requireApprovedUser();

  const enabled = await isFeatureEnabled("exams");
  if (!enabled) notFound();

  const t = await getTranslations("exams");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) notFound();

  const instance = await db.examInstance.findUnique({
    where: { id: instanceId },
    include: {
      group: { include: { students: { where: { studentId: studentProfile.id } } } },
    },
  });
  if (!instance || instance.group.students.length === 0) notFound();
  if (!["PUBLISHED", "IN_PROGRESS", "COMPLETED"].includes(instance.status)) notFound();

  const submission = await getOrCreateSubmission(instanceId, studentProfile.id);
  const questions = submission.instance.template.questions;
  const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));

  const now = new Date();
  const withinWindow = now >= instance.startDate && now <= instance.endDate;
  const canEdit = (submission.status === "NOT_STARTED" || submission.status === "IN_PROGRESS") && withinWindow && instance.status !== "COMPLETED";
  const isGraded = submission.status === "GRADED";
  const isSubmitted = submission.status === "SUBMITTED";

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/student/exams`} className="text-sm text-muted-foreground hover:underline">
        ← {t("backToList")}
      </Link>

      <h1 className="text-2xl font-bold">{submission.instance.template.title}</h1>

      {submission.instance.template.description && (
        <p className="text-muted-foreground">{submission.instance.template.description}</p>
      )}

      {isGraded && submission.totalScore !== null && (
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{t("score")}: {Math.round(submission.totalScore)}%</span>
          <Badge className={submission.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {submission.passed ? t("passed") : t("failed")}
          </Badge>
        </div>
      )}

      {isSubmitted && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t("awaitingGrading")}
          </CardContent>
        </Card>
      )}

      <form action={canEdit ? saveAnswersFn : undefined}>
        {canEdit && <input type="hidden" name="instanceId" value={instanceId} />}

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const opts = q.options as { label: string; isCorrect: boolean }[] | null;

            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Q{idx + 1}. {q.text}
                    {isGraded && answer?.score !== null && answer?.score !== undefined && (
                      <span className="ms-2 text-sm font-normal text-muted-foreground">
                        ({answer.score}/{q.points})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && opts && (
                    <div className="space-y-2">
                      {opts.map((opt, optIdx) => (
                        <label key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={String(optIdx)}
                            defaultChecked={answer?.answer === String(optIdx)}
                            disabled={!canEdit}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{opt.label}</span>
                          {isGraded && opt.isCorrect && (
                            <Badge className="bg-green-100 text-green-800 text-xs">{t("correct")}</Badge>
                          )}
                          {isGraded && answer?.answer === String(optIdx) && !opt.isCorrect && (
                            <Badge className="bg-red-100 text-red-800 text-xs">{t("incorrect")}</Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <textarea
                      name={`q_${q.id}`}
                      defaultValue={answer?.answer ?? ""}
                      disabled={!canEdit}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}

                  {q.type === "RECITATION" && (
                    <div className="rounded-lg bg-muted p-4 text-sm">
                      <p className="font-medium">{t("prepareRecitation")}:</p>
                      {q.fromSurah && q.toSurah && (
                        <p className="mt-1">
                          {locale === "ar" ? q.fromSurah.nameAr : q.fromSurah.nameEn} ({q.fromAyah}) → {locale === "ar" ? q.toSurah.nameAr : q.toSurah.nameEn} ({q.toAyah})
                        </p>
                      )}
                    </div>
                  )}

                  {isGraded && answer?.moderatorNotes && (
                    <p className="mt-2 text-sm text-muted-foreground">{t("moderatorNotes")}: {answer.moderatorNotes}</p>
                  )}
                  {isGraded && answer?.recitationResult && (
                    <p className="text-sm text-muted-foreground">{t("recitationResult")}: {answer.recitationResult}</p>
                  )}
                  {isGraded && answer?.tajweedNotes && (
                    <p className="text-sm text-muted-foreground">{t("tajweedNotes")}: {answer.tajweedNotes}</p>
                  )}
                  {isGraded && answer?.fluencyNotes && (
                    <p className="text-sm text-muted-foreground">{t("fluencyNotes")}: {answer.fluencyNotes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {canEdit && (
          <div className="mt-6 flex gap-3">
            <Button type="submit" variant="outline">{t("saveProgress")}</Button>
            <Button type="submit" name="submit" value="true">{t("submitExam")}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(dashboard)/student/exams/[instanceId]/page.tsx"
git commit -m "feat: add student exam take/results page"
```

---

### Task 16: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Generate Prisma client**

Run:
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
```

Expected: Success

- [ ] **Step 2: TypeScript check**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -v "check.test.ts"
```

Expected: No errors (the 12 pre-existing errors in `check.test.ts` are filtered out)

- [ ] **Step 3: Build**

Run:
```bash
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx next build
```

Expected: All exam routes appear in the build output:
- `/[locale]/admin/exams`
- `/[locale]/admin/exams/[examId]`
- `/[locale]/admin/exams/results`
- `/[locale]/moderator/exams`
- `/[locale]/moderator/exams/[instanceId]`
- `/[locale]/moderator/exams/[instanceId]/grade/[submissionId]`
- `/[locale]/student/exams`
- `/[locale]/student/exams/[instanceId]`

- [ ] **Step 4: Fix any errors and commit**

```bash
git add -A
git commit -m "fix: resolve build errors for exam pages"
```
