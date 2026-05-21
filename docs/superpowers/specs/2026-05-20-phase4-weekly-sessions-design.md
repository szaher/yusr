# Yusr Academy — Phase 4 Design Spec: Weekly Sessions

**Scope**: Weekly recitation session lifecycle — creation, student eligibility gate, attendance, grading, comments, review ranges, voice note references  
**Depends on**: Phase 3 (assignments, listening confirmations, eligibility calculation)  
**Vertical slice**: Moderator creates session for group → eligible students see session → moderator marks attendance → moderator grades student → student sees grade and comments

---

## 1. Session Lifecycle

| Status | Description |
|--------|-------------|
| `SCHEDULED` | Session created with date/time, not yet open |
| `OPEN` | Moderator opened the session — eligible students can see meeting link |
| `IN_PROGRESS` | Session is actively running |
| `COMPLETED` | Session finished — grades finalized |
| `CANCELLED` | Session was cancelled |

State transitions:
```
SCHEDULED → OPEN → IN_PROGRESS → COMPLETED
SCHEDULED → CANCELLED
OPEN → CANCELLED
```

---

## 2. Database Schema

### 2.1 WeeklySession

```prisma
enum SessionStatus {
  SCHEDULED
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model WeeklySession {
  id           String        @id @default(cuid())
  groupId      String
  group        Group         @relation(fields: [groupId], references: [id])
  moderatorId  String
  moderator    ModeratorProfile @relation("sessionModerator", fields: [moderatorId], references: [id])
  date         DateTime
  startTime    String?
  endTime      String?
  status       SessionStatus @default(SCHEDULED)
  meetingLink  String?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  students     SessionStudent[]

  @@index([groupId])
  @@index([moderatorId])
  @@index([date])
  @@index([status])
}
```

### 2.2 SessionStudent

```prisma
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

model SessionStudent {
  id               String           @id @default(cuid())
  sessionId        String
  session          WeeklySession    @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentId        String
  student          StudentProfile   @relation(fields: [studentId], references: [id])
  attendance       AttendanceStatus @default(PENDING)
  recitationResult RecitationResult @default(NOT_GRADED)
  numericGrade     Float?
  mistakeCount     Int?
  tajweedNotes     String?
  memorizationNotes String?
  fluencyNotes     String?
  comment          String?
  voiceNoteUrl     String?
  gradedAt         DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  reviewRanges     ReviewRange[]

  @@unique([sessionId, studentId])
  @@index([studentId])
  @@index([sessionId])
}
```

### 2.3 ReviewRange

```prisma
model ReviewRange {
  id                String         @id @default(cuid())
  sessionStudentId  String
  sessionStudent    SessionStudent @relation(fields: [sessionStudentId], references: [id], onDelete: Cascade)
  fromSurahNumber   Int
  fromAyahNumber    Int
  toSurahNumber     Int
  toAyahNumber      Int
  note              String?

  fromSurah         QuranSurah     @relation("reviewRangeFrom", fields: [fromSurahNumber], references: [number])
  toSurah           QuranSurah     @relation("reviewRangeTo", fields: [toSurahNumber], references: [number])

  @@index([sessionStudentId])
}
```

### 2.4 Reverse relations to add

- **Group**: add `sessions WeeklySession[]`
- **ModeratorProfile**: add `sessions WeeklySession[] @relation("sessionModerator")`
- **StudentProfile**: add `sessionStudents SessionStudent[]`
- **QuranSurah**: add `reviewRangesFrom ReviewRange[] @relation("reviewRangeFrom")` and `reviewRangesTo ReviewRange[] @relation("reviewRangeTo")`

---

## 3. Pages

### 3.1 Moderator: Sessions List

**Route:** `/[locale]/moderator/sessions`

Displays all sessions for the moderator's groups. Grouped by upcoming / past.

**Create session form** at the top:
- Group dropdown (moderator's groups only)
- Date (date picker)
- Start time (time input)
- End time (time input, optional)
- Meeting link (text input, optional)
- Notes (textarea, optional)

Each session row shows: group name, date, time, status badge, student count, action link.

### 3.2 Moderator: Session Detail

**Route:** `/[locale]/moderator/sessions/[id]`

**Top section:**
- Session info: group, date, time, status, meeting link
- Status action buttons: Open → Start → Complete / Cancel
- Meeting link edit (inline or small form)

**Student table:**
- Student name, eligibility status (from Phase 3 `getStudentEligibility`)
- Attendance dropdown (present/absent/excused/late)
- Recitation result dropdown
- Numeric grade input (optional)
- Mistake count input (optional)
- Comment textarea (optional)
- Voice note URL input (optional — MVP uses external URL, not file upload)
- Save button per row or bulk save

**Grading is row-by-row.** Each student row is an independent save. The moderator works through students one at a time during the session.

### 3.3 Student: Sessions List

**Route:** `/[locale]/student/sessions`

Cards showing upcoming and past sessions:
- Date, time, group name, status badge
- Meeting link (visible only when status is OPEN or IN_PROGRESS and student is eligible)
- Eligibility indicator

### 3.4 Student: Session Detail (Grades View)

**Route:** `/[locale]/student/sessions/[id]`

After session is completed, student sees:
- Attendance status
- Recitation result badge
- Numeric grade (if set)
- Tajweed, memorization, fluency notes
- Moderator comment
- Voice note player (if URL set)
- Review ranges displayed as Quran references

### 3.5 Student: Grades Page

**Route:** `/[locale]/student/grades`

Aggregated view of all graded sessions:
- Table: date, group, result, grade, comment preview
- Click to go to session detail

### 3.6 Admin: Sessions List

**Route:** `/[locale]/admin/sessions`

All sessions across the system. Read-only overview. Can filter by group/moderator/status.

### 3.7 Sidebar Additions

**Moderator nav:** Add `{ labelKey: "sessions", href: "/moderator/sessions", icon: Calendar }`
**Student nav:** Add `{ labelKey: "sessions", href: "/student/sessions", icon: Calendar }` and `{ labelKey: "grades", href: "/student/grades", icon: Award }`
**Admin nav:** Add `{ labelKey: "sessions", href: "/admin/sessions", icon: Calendar }`

---

## 4. Service Layer

### File: `server/services/session.ts`

```
createSession(input, actorId)
  → verify moderator owns the group
  → create WeeklySession
  → create SessionStudent rows for all students in the group
  → audit log

getModeratorSessions(userId)
  → find moderator's groups → all sessions for those groups
  → include student counts

getStudentSessions(userId)
  → find student's groups → sessions for those groups
  → include own SessionStudent record

getAdminSessions()
  → all sessions with group/moderator info

getSessionDetail(sessionId)
  → session + students with eligibility + review ranges

updateSessionStatus(sessionId, status, actorId)
  → validate state transition
  → update session status
  → audit log

updateMeetingLink(sessionId, meetingLink, actorId)
  → update meeting link field

gradeStudent(sessionStudentId, input, actorId)
  → update attendance, recitation result, grades, notes, comment, voice note URL
  → create ReviewRange rows if provided
  → set gradedAt
  → audit log

getStudentGrades(userId)
  → all SessionStudent records for this user where session is COMPLETED
  → include session date, group name, review ranges
```

---

## 5. Server Actions

### File: `server/actions/session.ts`

```
createSessionAction(formData)
  → requirePermission(SESSIONS_CREATE)
  → moderator: verify group belongs to them
  → validate with Zod
  → call createSession

updateSessionStatusAction(formData)
  → requirePermission(SESSIONS_START)
  → validate state transition
  → call updateSessionStatus

updateMeetingLinkAction(formData)
  → requirePermission(SESSIONS_CREATE)
  → call updateMeetingLink

gradeStudentAction(formData)
  → requirePermission(SESSIONS_GRADE)
  → moderator: verify session belongs to their group
  → validate with Zod
  → call gradeStudent
```

---

## 6. Validation Schemas

### File: `lib/validations/session.ts`

```
createSessionSchema
  → groupId: string (cuid)
  → date: date
  → startTime: string (optional, HH:mm pattern)
  → endTime: string (optional, HH:mm pattern)
  → meetingLink: string (url, optional)
  → notes: string (optional)

updateSessionStatusSchema
  → sessionId: string (cuid)
  → status: enum SessionStatus

updateMeetingLinkSchema
  → sessionId: string (cuid)
  → meetingLink: string (url)

gradeStudentSchema
  → sessionStudentId: string (cuid)
  → attendance: enum AttendanceStatus
  → recitationResult: enum RecitationResult
  → numericGrade: number (0-100, optional)
  → mistakeCount: number (min 0, optional)
  → tajweedNotes: string (optional)
  → memorizationNotes: string (optional)
  → fluencyNotes: string (optional)
  → comment: string (optional)
  → voiceNoteUrl: string (url, optional)
  → reviewRanges: array of { fromSurahNumber, fromAyahNumber, toSurahNumber, toAyahNumber, note? } (optional)
```

---

## 7. i18n Keys

Add to both `messages/ar.json` and `messages/en.json`:

```
sessions.title
sessions.createSession
sessions.group
sessions.date
sessions.startTime
sessions.endTime
sessions.meetingLink
sessions.notes
sessions.status
sessions.statusScheduled
sessions.statusOpen
sessions.statusInProgress
sessions.statusCompleted
sessions.statusCancelled
sessions.openSession
sessions.startSession
sessions.completeSession
sessions.cancelSession
sessions.noSessions
sessions.upcoming
sessions.past
sessions.studentProgress
sessions.attendance
sessions.attendancePending
sessions.attendancePresent
sessions.attendanceAbsent
sessions.attendanceExcused
sessions.attendanceLate
sessions.recitationResult
sessions.resultNotGraded
sessions.resultExcellent
sessions.resultGood
sessions.resultNeedsReview
sessions.resultIncomplete
sessions.resultNotRecited
sessions.numericGrade
sessions.mistakeCount
sessions.tajweedNotes
sessions.memorizationNotes
sessions.fluencyNotes
sessions.comment
sessions.voiceNoteUrl
sessions.grade
sessions.gradeStudent
sessions.saveGrade
sessions.reviewRanges
sessions.addReviewRange
sessions.fromSurah
sessions.fromAyah
sessions.toSurah
sessions.toAyah
sessions.eligible
sessions.notEligible
sessions.joinSession
sessions.viewGrades
grades.title
grades.noGrades
grades.sessionDate
grades.result
grades.grade
grades.viewDetail
```

---

## 8. Eligibility Gate

When a session status is OPEN or IN_PROGRESS, a student can only see the meeting link if they are eligible (all active assignments completed — uses `getStudentEligibility` from Phase 3).

The meeting link is hidden (replaced with a "complete your assignments" message) for ineligible students. This is a UI-level gate — the server action for session creation already populates SessionStudent rows for all group members regardless of eligibility.

---

## 9. Voice Notes — MVP Approach

MVP does not include file upload. Voice note is stored as a URL string on `SessionStudent.voiceNoteUrl`. The moderator pastes a link to an externally hosted audio file (Google Drive, Dropbox, etc.).

The student sees the URL rendered as an `<audio>` tag if it ends in a known audio extension (.mp3, .m4a, .wav, .ogg, .webm), or as a clickable link otherwise.

File upload infrastructure is deferred to a later phase.

---

## 10. Scope Boundaries

**In scope:**
- Session CRUD with status lifecycle
- Moderator creates/opens/starts/completes/cancels sessions
- SessionStudent auto-creation for group members
- Attendance marking
- Recitation grading (result enum + optional numeric grade + mistake count)
- Written notes (tajweed, memorization, fluency, general comment)
- Voice note URL (external link, no upload)
- Review ranges (Quran ayah ranges to review again)
- Student session list with eligibility gate
- Student grades page (aggregated view)
- Admin read-only sessions overview
- Sidebar nav additions

**Out of scope (deferred):**
- Real-time notifications when session opens (Phase 5)
- Voice note file upload (later phase)
- Session meeting link auto-generation (future integration)
- AI recitation review (Phase 7)
- Exam assignments (Phase 6)
- Leave requests (Phase 5)
