# Phase 8: Exams — Design Spec

## Overview

Phase 8 adds a full exam system to Yusr Academy. Exams combine written questions (multiple choice, true/false, short answer) with Quran recitation assessment. Admin creates reusable exam templates; moderators receive per-group instances they can customize; students take exams and receive graded results. Written questions are auto-graded; recitation and short-answer questions are graded by the moderator.

## Existing State

| Component | Status |
|-----------|--------|
| Prisma models | None — must be created |
| Permissions | None — must be created and seeded |
| Feature flag | `exams` exists (disabled) |
| Routes | None |
| Sidebar | No exam nav items |

---

## 1. Data Model

### New Enums

```
QuestionType: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, RECITATION
ExamInstanceStatus: DRAFT, PUBLISHED, IN_PROGRESS, COMPLETED
ExamSubmissionStatus: NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED
```

### New Model: ExamTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| title | String | Exam name |
| description | String? | Optional instructions |
| passingScore | Int | Percentage required to pass (e.g. 70) |
| totalPoints | Int | Sum of all question points |
| createdById | String | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Relations:**
- `createdBy User @relation("examTemplateCreator", fields: [createdById], references: [id])`
- `questions ExamQuestion[]`
- `instances ExamInstance[]`

### New Model: ExamQuestion

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| templateId | String | FK → ExamTemplate |
| type | QuestionType | |
| text | String | Question text or recitation instructions |
| points | Int | Points awarded for correct answer |
| order | Int | Display order |
| options | Json? | For MC/TF: array of `{label: string, isCorrect: boolean}` |
| correctAnswer | String? | For SHORT_ANSWER: expected answer for keyword matching |
| fromSurahNumber | Int? | For RECITATION: start surah |
| fromAyah | Int? | For RECITATION: start ayah |
| toSurahNumber | Int? | For RECITATION: end surah |
| toAyah | Int? | For RECITATION: end ayah |
| createdAt | DateTime | |

**Constraints:** `@@index([templateId])`, `@@unique([templateId, order])`

**Relations:**
- `template ExamTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)`
- `fromSurah QuranSurah? @relation("examQuestionFromSurah", fields: [fromSurahNumber], references: [number])`
- `toSurah QuranSurah? @relation("examQuestionToSurah", fields: [toSurahNumber], references: [number])`
- `answers ExamAnswer[]`

### New Model: ExamInstance

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| templateId | String | FK → ExamTemplate |
| groupId | String | FK → Group |
| sessionId | String? | FK → WeeklySession (optional — ties to a session) |
| status | ExamInstanceStatus | Default: DRAFT |
| startDate | DateTime | When students can begin |
| endDate | DateTime | Submission deadline |
| customizations | Json? | Moderator overrides (e.g. swapped recitation ranges) |
| createdById | String | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:** `@@index([templateId])`, `@@index([groupId])`, `@@index([status])`

**Relations:**
- `template ExamTemplate @relation(fields: [templateId], references: [id])`
- `group Group @relation(fields: [groupId], references: [id])`
- `session WeeklySession? @relation(fields: [sessionId], references: [id])`
- `createdBy User @relation("examInstanceCreator", fields: [createdById], references: [id])`
- `submissions ExamSubmission[]`

### New Model: ExamSubmission

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| instanceId | String | FK → ExamInstance |
| studentId | String | FK → StudentProfile |
| status | ExamSubmissionStatus | Default: NOT_STARTED |
| startedAt | DateTime? | When student first opened the exam |
| submittedAt | DateTime? | When student clicked Submit |
| gradedAt | DateTime? | When moderator submitted grades |
| totalScore | Float? | Percentage: (sum of answer scores / totalPoints) × 100 |
| passed | Boolean? | totalScore >= passingScore |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:** `@@unique([instanceId, studentId])`, `@@index([instanceId])`, `@@index([studentId])`

**Relations:**
- `instance ExamInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)`
- `student StudentProfile @relation(fields: [studentId], references: [id])`
- `answers ExamAnswer[]`

### New Model: ExamAnswer

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| submissionId | String | FK → ExamSubmission |
| questionId | String | FK → ExamQuestion |
| answer | String? | Chosen option index (MC), "true"/"false" (TF), free text (SA), null (RECITATION) |
| isCorrect | Boolean? | Auto-set for MC/TF |
| score | Float? | Points awarded (auto for MC/TF, manual for SA/RECITATION) |
| moderatorNotes | String? | Moderator feedback |
| recitationResult | String? | For RECITATION: reuse RecitationResult values |
| tajweedNotes | String? | For RECITATION |
| fluencyNotes | String? | For RECITATION |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:** `@@unique([submissionId, questionId])`, `@@index([submissionId])`, `@@index([questionId])`

**Relations:**
- `submission ExamSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)`
- `question ExamQuestion @relation(fields: [questionId], references: [id])`

### Reverse Relations on Existing Models

- `User.createdExamTemplates ExamTemplate[] @relation("examTemplateCreator")`
- `User.createdExamInstances ExamInstance[] @relation("examInstanceCreator")`
- `Group.examInstances ExamInstance[]`
- `WeeklySession.examInstances ExamInstance[]`
- `StudentProfile.examSubmissions ExamSubmission[]`
- `QuranSurah.examQuestionsFrom ExamQuestion[] @relation("examQuestionFromSurah")`
- `QuranSurah.examQuestionsTo ExamQuestion[] @relation("examQuestionToSurah")`

---

## 2. Admin Flow

### Page: `/admin/exams` (template list + create form)

- "Create Exam" card at the top: title input, description textarea, passing score input (default 70), submit button
- Below: table of all exam templates showing title, question count, total points, passing score, created date
- Each row links to the template detail page
- Feature-flagged behind `exams`

### Page: `/admin/exams/[examId]` (template detail + question editor + assign)

- Editable header: title, description, passing score (inline form)
- Question list ordered by `order` field — each shows: order number, type badge (MC/TF/SA/RECITATION), text preview, points
- Delete button per question
- "Add Question" form below the list:
  - Select question type
  - Text input (question text or recitation instructions)
  - Points input
  - Type-specific fields:
    - MULTIPLE_CHOICE: 2-4 option text inputs + radio to mark correct answer
    - TRUE_FALSE: no extra fields (options auto-generated as True/False)
    - SHORT_ANSWER: correct answer text input
    - RECITATION: from surah/ayah and to surah/ayah select dropdowns
- "Assign to Groups" section at the bottom:
  - Multi-select for groups
  - Start date and end date inputs
  - Optional: select a weekly session to tie the exam to
  - Assign button → creates one ExamInstance per selected group in DRAFT status

### Page: `/admin/exams/results` (read-only overview)

- Table of all exam instances: template title, group name, status badge, date range, submissions count (submitted/total), average score, pass rate
- Click row → view individual student results (read-only list of submissions with scores)

---

## 3. Moderator Flow

### Page: `/moderator/exams` (assigned exam instances)

- Table of exam instances for the moderator's groups: exam title, group name, status badge, date range, grading progress (e.g. "5/12 graded")
- Default filter: active instances (PUBLISHED/IN_PROGRESS). Toggle to show all
- Click row → instance detail page
- Permission: `exams.view_assigned`
- Feature-flagged behind `exams`

### Page: `/moderator/exams/[instanceId]` (instance detail + student list)

- Header: exam title, group name, date range, status badge
- Customization section (editable while DRAFT or PUBLISHED):
  - For each RECITATION question: override surah/ayah range for this group
  - Stored in `customizations` JSON as `{questionId: {fromSurahNumber, fromAyah, toSurahNumber, toAyah}}`
- Status action buttons:
  - **Publish** — DRAFT → PUBLISHED (students can see the exam)
  - **Start** — PUBLISHED → IN_PROGRESS
  - **Complete** — IN_PROGRESS → COMPLETED (no more submissions)
- Student submissions table: student name, submission status badge, score (if graded), pass/fail badge (if graded)
- "Grade" link per submitted student → grading page
- Access guard: moderator can only view instances for their own groups

### Page: `/moderator/exams/[instanceId]/grade/[submissionId]` (grading view)

- Header: student name, exam title, submission date
- Each question displayed in order:
  - Question text, type badge, points available
  - Student's answer displayed
  - For MC/TF: show correct/incorrect indicator with auto-assigned score. Moderator can override score.
  - For SHORT_ANSWER: show student's answer alongside expected answer. Moderator assigns score (0 to max points).
  - For RECITATION: show surah/ayah range (with any customization applied). Moderator fills in recitation result (dropdown using RecitationResult values), tajweed notes, fluency notes, and score.
  - Moderator notes textarea per question
- "Submit Grades" button: calculates total score as percentage, sets `passed` based on passing score threshold, marks submission as GRADED, sends notification to student
- Permission: `exams.grade`
- Access guard: moderator can only grade submissions for their own groups

---

## 4. Student Flow

### Page: `/student/exams` (exam list)

- Table of exam instances for the student's groups where status is PUBLISHED, IN_PROGRESS, or COMPLETED
- Columns: exam title, group name, date range, student's submission status badge, score (if graded)
- Click row → exam detail/take page
- Feature-flagged behind `exams`

### Page: `/student/exams/[instanceId]` (take exam / view results)

**If submission is NOT_STARTED or IN_PROGRESS (and exam is within date window):**
- Exam title, description, instructions
- Questions rendered as a form in order:
  - MC: radio buttons for each option
  - TF: two radio buttons (True / False)
  - SHORT_ANSWER: textarea
  - RECITATION: read-only card showing surah/ayah range with instruction text (e.g. "Prepare to recite Surah Al-Baqarah, Ayah 1-10")
- "Save Progress" button — saves current answers, keeps status IN_PROGRESS
- "Submit Exam" button — saves answers, changes status to SUBMITTED, no further edits allowed
- First interaction (save or submit) changes NOT_STARTED → IN_PROGRESS and sets `startedAt`

**If submission is SUBMITTED:**
- Read-only view of answers
- "Awaiting grading" message

**If submission is GRADED:**
- Read-only view with per-question scores, correct/incorrect indicators for MC/TF
- Moderator notes displayed per question (if any)
- Total score, pass/fail badge
- For recitation questions: recitation result, tajweed notes, fluency notes

**Access guard:** Student can only see exams for their groups and only their own submission. Can only submit within the exam's date window (startDate ≤ now ≤ endDate).

---

## 5. Status Transitions

### Exam Instance

| From | To | Who |
|------|----|-----|
| DRAFT | PUBLISHED | Moderator or Admin |
| PUBLISHED | IN_PROGRESS | Moderator |
| IN_PROGRESS | COMPLETED | Moderator |
| Any | DRAFT | Admin (reset) |

### Exam Submission

| From | To | How |
|------|----|-----|
| NOT_STARTED | IN_PROGRESS | Student saves first answer |
| IN_PROGRESS | SUBMITTED | Student clicks Submit |
| SUBMITTED | GRADED | Moderator submits grades |

---

## 6. Notifications

| Event | Recipient | Type | Title |
|-------|-----------|------|-------|
| Exam published | Students in the group | `EXAM_PUBLISHED` | "New exam available: [title]" |
| Student submits exam | Group's moderator | `EXAM_SUBMITTED` | "[student name] submitted exam: [title]" |
| Grades released | Student | `EXAM_GRADED` | "Your exam has been graded: [title]" |

---

## 7. Sidebar & Navigation

| Role | Change |
|------|--------|
| Admin | Add "Exams" → `/admin/exams` |
| Moderator | Add "Exams" → `/moderator/exams` |
| Student | Add "Exams" → `/student/exams` |

---

## 8. Permissions & Feature Flags

### Permissions (new — must be seeded)

| Permission | Role | Usage |
|------------|------|-------|
| `exams.create` | Admin | Create exam templates |
| `exams.view_all` | Admin | View all templates, instances, and results |
| `exams.view_assigned` | Moderator | View instances for own groups |
| `exams.grade` | Moderator | Grade student submissions |

Admin has all permissions via `ROLE_PERMISSIONS` pattern.

Students view/take exams for their own groups — no special permission needed beyond authenticated approved user with group membership.

### Feature Flag (pre-existing)

| Flag | State | Gates |
|------|-------|-------|
| `exams` | Disabled (enabled during rollout) | All exam pages and actions |

---

## 9. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `lib/validations/exam.ts` | Zod schemas for template, question, instance, submission, answer, grading |
| `server/services/exam.ts` | Exam CRUD, instance management, submission handling, grading logic, auto-grading |
| `server/actions/exam.ts` | Server actions for all exam mutations |
| `app/[locale]/(dashboard)/admin/exams/page.tsx` | Admin template list + create form |
| `app/[locale]/(dashboard)/admin/exams/[examId]/page.tsx` | Admin template detail + question editor + assign |
| `app/[locale]/(dashboard)/admin/exams/results/page.tsx` | Admin results overview |
| `app/[locale]/(dashboard)/moderator/exams/page.tsx` | Moderator instance list |
| `app/[locale]/(dashboard)/moderator/exams/[instanceId]/page.tsx` | Moderator instance detail + student list |
| `app/[locale]/(dashboard)/moderator/exams/[instanceId]/grade/[submissionId]/page.tsx` | Moderator grading view |
| `app/[locale]/(dashboard)/student/exams/page.tsx` | Student exam list |
| `app/[locale]/(dashboard)/student/exams/[instanceId]/page.tsx` | Student take exam / view results |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 3 enums, 5 models, reverse relations |
| `prisma/seed.ts` | Seed 4 new permissions and assign to roles |
| `lib/constants/permissions.ts` | Add 4 exam permission constants + add to moderator role |
| `components/layout/sidebar.tsx` | Add exam nav for admin, moderator, student |
| `messages/en.json` | Add `exams` i18n namespace (~50 keys) |
| `messages/ar.json` | Add `exams` i18n namespace (~50 keys) |

---

## 10. Deferred to Phase 8.1

- **Exam time limits** — countdown timer per student
- **Question randomization** — shuffle question order per student
- **Question pools** — random selection from a larger question bank
- **Exam analytics** — charts, trends, comparative reports
- **Bulk import** — import questions from CSV
- **Retakes** — allow multiple attempts with best/latest score
- **Audio recording** — record recitation directly in the browser
- **Exam duplication** — clone a template to create variations
