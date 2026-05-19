# Yusr Academy — Phase 3 Design Spec: Assignments & Listening Requirements

**Scope**: Assignment creation, student listening confirmation, eligibility tracking  
**Depends on**: Phase 1+2 (auth, RBAC, enrollment, org hierarchy, moderator/student dashboards)  
**Vertical slice**: Moderator creates Quran memorization assignment for group → students see assignment → students confirm listening repetitions → moderator sees completion status → eligibility calculated

---

## 1. Assignment Types

Four types for this phase:

| Type | Enum | Quran range? | Description |
|------|------|-------------|-------------|
| Quran Memorization | `QURAN_MEMORIZATION` | Yes | Memorize specific ayah range |
| Quran Revision | `QURAN_REVISION` | Yes | Review previously memorized range |
| Tajweed | `TAJWEED` | No | Learn a tajweed rule/lesson |
| Homework | `HOMEWORK` | No | General text-based homework |

Additional types (poem/matn, exam prep) deferred to later phases.

---

## 2. Database Schema

### 2.1 Assignment (base table)

```prisma
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

model Assignment {
  id                 String               @id @default(cuid())
  title              String
  description        String?
  type               AssignmentType
  targetType         AssignmentTargetType
  targetId           String
  createdById        String
  createdBy          User                 @relation("assignmentCreator", fields: [createdById], references: [id])
  dueDate            DateTime?
  requiredRepetitions Int                  @default(1)
  active             Boolean              @default(true)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

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

### 2.2 Type-specific tables

```prisma
model QuranAssignment {
  id               String     @id @default(cuid())
  assignmentId     String     @unique
  assignment       Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  fromSurahNumber  Int
  fromAyahNumber   Int
  toSurahNumber    Int
  toAyahNumber     Int
  juzNumber        Int?

  fromSurah        QuranSurah @relation("quranAssignmentFrom", fields: [fromSurahNumber], references: [number])
  toSurah          QuranSurah @relation("quranAssignmentTo", fields: [toSurahNumber], references: [number])
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
  id               String     @id @default(cuid())
  assignmentId     String     @unique
  assignment       Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  instructions     String
}
```

### 2.3 Materials (audio/video links)

```prisma
enum MaterialType {
  AUDIO_URL
  VIDEO_URL
  IFRAME_EMBED
}

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
```

External URLs only for MVP. Supported patterns:
- Direct audio/video URLs (rendered as `<audio>` or `<video>`)
- YouTube, SoundCloud links (rendered as `<iframe>`)
- quran.ksu.edu.sa links (rendered as `<iframe>` — has built-in Quran player with reader selection)

No file upload infrastructure in this phase.

### 2.4 Student tracking

```prisma
enum StudentAssignmentStatus {
  ASSIGNED
  IN_PROGRESS
  COMPLETED
}

model StudentAssignment {
  id           String                   @id @default(cuid())
  assignmentId String
  assignment   Assignment               @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId    String
  student      StudentProfile           @relation(fields: [studentId], references: [id])
  status       StudentAssignmentStatus  @default(ASSIGNED)
  assignedAt   DateTime                 @default(now())
  completedAt  DateTime?

  confirmations ListeningConfirmation[]

  @@unique([assignmentId, studentId])
  @@index([studentId])
  @@index([status])
}

model ListeningConfirmation {
  id                   String            @id @default(cuid())
  studentAssignmentId  String
  studentAssignment    StudentAssignment @relation(fields: [studentAssignmentId], references: [id], onDelete: Cascade)
  confirmedAt          DateTime          @default(now())

  @@index([studentAssignmentId])
}
```

**Listening flow:**
1. Assignment has `requiredRepetitions: 5`
2. Student clicks "I have listened" → creates a `ListeningConfirmation` row
3. UI shows "3/5 completed"
4. When confirmations count >= requiredRepetitions → StudentAssignment status changes to `COMPLETED`, `completedAt` is set
5. Status transitions: ASSIGNED → IN_PROGRESS (first confirmation) → COMPLETED (all done)

**StudentAssignment auto-creation:** When an assignment is created targeting a group, a `StudentAssignment` row is created for every student currently in that group (via `GroupStudent`). For class-level assignments, all students in all groups of that class. For level-level, all students in all groups of all classes of that level.

Students who join the group after assignment creation do NOT automatically get the assignment. The moderator can re-assign or create a new assignment.

---

## 3. Pages

### 3.1 Moderator: Assignment List

**Route:** `/[locale]/moderator/assignments`

Displays all assignments created by this moderator, grouped by status (active/past due). Each row shows: title, type badge, target group name, due date, completion stats (e.g., "3/5 students done").

**Create assignment form** at the top of the page (same pattern as admin levels/classes/groups pages):
- Type dropdown (4 types)
- Title (text)
- Description (textarea, optional)
- Target group dropdown (only moderator's own groups)
- Due date (date input)
- Required repetitions (number, default 1)
- Type-specific fields appear based on type selection:
  - Quran: from surah/ayah → to surah/ayah dropdowns (populated from QuranSurah seed data)
  - Tajweed: topic title, topic description, material URL
  - Homework: instructions textarea
- Material URLs section: add 1+ URLs with type selector (audio/video/iframe) and optional title

### 3.2 Moderator: Assignment Detail

**Route:** `/[locale]/moderator/assignments/[id]`

Shows full assignment info + student progress table:
- Student name, confirmations count vs required, status badge, last confirmation date
- Moderator can see at a glance who is ready and who isn't

### 3.3 Student: Assignment List

**Route:** `/[locale]/student/assignments`

Cards or table showing all assignments for the student:
- Title, type badge, due date, progress (3/5), status badge
- Click to open detail page

### 3.4 Student: Assignment Detail

**Route:** `/[locale]/student/assignments/[id]`

- Assignment description
- Quran range display (if Quran type): "سورة البقرة: الآيات 1-5"
- Materials section: audio player / video player / iframe embed for each material
- Listening confirmation section:
  - Progress: "3/5 مرات"
  - Button: "لقد استمعت" (I have listened) — disabled when complete
  - Amanah/trust disclaimer: "تأكيد الاستماع أمانة" (Listening confirmation is a trust)
  - List of confirmation timestamps

### 3.5 Admin: Assignment List

**Route:** `/[locale]/admin/assignments`

Same as moderator but shows ALL assignments across the system. Can create assignments targeting any group/class/level. Uses the same form but with full group/class/level dropdowns.

### 3.6 Student Dashboard Enhancement

Add an eligibility summary card to the existing student dashboard:
- "الواجبات المكتملة: 3/4" (Assignments complete: 3/4)
- Warning color if not all complete

### 3.7 Sidebar Additions

**Student nav:** Add `{ labelKey: "assignments", href: "/student/assignments", icon: BookOpen }`  
**Moderator nav:** Add `{ labelKey: "assignments", href: "/moderator/assignments", icon: BookOpen }`  
**Admin nav:** Add `{ labelKey: "assignments", href: "/admin/assignments", icon: BookOpen }` (after "groups")

---

## 4. Service Layer

### File: `server/services/assignment.ts`

```
createAssignment(input, actorId)
  → create Assignment + type-specific record
  → create AssignmentMaterial rows
  → create StudentAssignment rows for all students in target
  → audit log

getModeratorAssignments(userId)
  → find moderator's groups → all assignments targeting those groups

getStudentAssignments(userId)
  → find student's groups → all StudentAssignment rows with assignment details

getAssignmentDetail(assignmentId)
  → assignment + type-specific data + materials + studentAssignments with confirmations

confirmListening(studentAssignmentId, userId)
  → verify studentAssignment belongs to this user
  → create ListeningConfirmation
  → if confirmations >= requiredRepetitions → update status to COMPLETED
  → if first confirmation → update status to IN_PROGRESS

getStudentEligibility(userId)
  → get all active StudentAssignments for this user
  → return { total, completed, eligible: completed === total }

deleteAssignment(assignmentId, actorId)
  → cascade deletes type-specific, materials, studentAssignments, confirmations
  → audit log
```

---

## 5. Server Actions

### File: `server/actions/assignment.ts`

```
createAssignmentAction(formData)
  → requirePermission(ASSIGNMENTS_CREATE)
  → moderator: verify target group belongs to them
  → validate with Zod schema
  → call createAssignment service
  → revalidate paths

confirmListeningAction(formData)
  → requireAuth (no permission check — students confirm own)
  → validate studentAssignmentId
  → verify belongs to current user
  → call confirmListening service
  → revalidate path

deleteAssignmentAction(formData)
  → requirePermission(ASSIGNMENTS_UPDATE)
  → moderator: verify assignment was created by them or targets their group
  → call deleteAssignment service
  → revalidate paths
```

---

## 6. Validation Schemas

### File: `lib/validations/assignment.ts`

```
createAssignmentBaseSchema
  → title: string (min 2)
  → description: string optional
  → type: enum AssignmentType
  → targetType: enum AssignmentTargetType
  → targetId: string (cuid)
  → dueDate: date optional
  → requiredRepetitions: number (min 1, max 100, default 1)

createQuranAssignmentSchema (extends base)
  → fromSurahNumber: number (1-114)
  → fromAyahNumber: number (min 1)
  → toSurahNumber: number (1-114)
  → toAyahNumber: number (min 1)

createTajweedAssignmentSchema (extends base)
  → topicTitle: string (min 2)
  → topicDescription: string optional
  → materialUrl: string url optional

createHomeworkAssignmentSchema (extends base)
  → instructions: string (min 2)

materialSchema
  → type: enum MaterialType
  → url: string url
  → title: string optional

confirmListeningSchema
  → studentAssignmentId: string (cuid)
```

---

## 7. i18n Keys

Add to both `messages/ar.json` and `messages/en.json`:

```
assignments.title
assignments.create
assignments.type
assignments.typeQuranMemorization
assignments.typeQuranRevision
assignments.typeTajweed
assignments.typeHomework
assignments.targetGroup
assignments.targetClass
assignments.targetLevel
assignments.dueDate
assignments.requiredRepetitions
assignments.fromSurah
assignments.fromAyah
assignments.toSurah
assignments.toAyah
assignments.topicTitle
assignments.instructions
assignments.materials
assignments.addMaterial
assignments.materialUrl
assignments.materialType
assignments.audioUrl
assignments.videoUrl
assignments.iframeEmbed
assignments.progress
assignments.completed
assignments.confirmListening
assignments.confirmDisclaimer (أمانة disclaimer)
assignments.noAssignments
assignments.studentProgress
assignments.eligible
assignments.notEligible
assignments.completionStats
```

---

## 8. Permissions

Existing permissions are sufficient:
- `ASSIGNMENTS_CREATE` — admin + moderator (already seeded)
- `ASSIGNMENTS_UPDATE` — admin + moderator (already seeded, reuse for delete)

No new permissions needed. Students don't need a permission to confirm listening — the action verifies ownership directly.

---

## 9. Eligibility Calculation

A student is **eligible** for a weekly session when ALL of their active assignments (where `dueDate <= now` or `dueDate IS NULL`) have `StudentAssignment.status = COMPLETED`.

```
eligible = activeAssignments.every(sa => sa.status === "COMPLETED")
```

This is read from the `StudentAssignment` table — no separate eligibility table. The student dashboard shows the count and a green/yellow badge.

Phase 4 (weekly sessions) will use this eligibility check as a gate before allowing a student to join a session.

---

## 10. Material Embedding

For material URLs, render based on `MaterialType`:

- `AUDIO_URL` → `<audio src={url} controls />` with download link
- `VIDEO_URL` → `<video src={url} controls />` or YouTube/Vimeo embed detection
- `IFRAME_EMBED` → `<iframe src={url} />` with sandbox attributes

Special handling for known domains:
- `quran.ksu.edu.sa` → iframe with appropriate dimensions
- `youtube.com` / `youtu.be` → convert to embed URL
- `soundcloud.com` → iframe embed

Unknown URLs default to a clickable link with an external-link icon.

---

## 11. Scope Boundaries

**In scope:**
- Assignment CRUD (4 types, polymorphic model)
- Material URLs (external only, no upload)
- Per-repetition listening confirmation (honor system)
- Eligibility calculation
- Moderator assignment progress view
- Student assignment list and detail
- Admin assignment management

**Out of scope (deferred):**
- File upload / storage abstraction (Phase 4+)
- Audio playback tracking (feature flag exists, disabled)
- Weekly session join gate (Phase 4)
- Grading (Phase 4)
- Exam assignments (Phase 6)
- AI recitation review (Phase 7)
- Poem/matn assignment type (later)
- Retroactive assignment for new group members
