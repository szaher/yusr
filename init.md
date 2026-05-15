Below is a Claude Code-ready initial spec/prompt. It is direct and implementation-oriented, following the blunt/no-fluff style from the available project instruction file. 

````md
# Claude Code Task: Build Initial System for Yusr Academy Quran Online Learning Platform

You are acting as a Principal Software Engineer, Staff Product Engineer, Arabic-first UX architect, education-platform architect, and AI-assisted learning systems engineer.

Your task is to design and implement the first version of an online Quran learning system for Yusr Academy.

The platform is free for students. It supports online Quran memorization, recitation review, weekly tasmee sessions, moderator grading, student progress tracking, announcements, exams, leave requests, and AI-assisted recitation feedback.

The system must be Arabic-first, right-to-left by default, with optional English UI support.

---

## 1. Product Name

Working name:

**منصة أكاديمية يسر لتعليم القرآن الكريم**

English fallback:

**Yusr Academy Quran Learning Platform**

---

## 2. Primary Goal

Build a web platform where students can:

1. Register when enrollment is open.
2. Be approved and assigned to Quran learning classes.
3. View assigned memorization and tajweed material.
4. Listen to required Quran/tajweed/poem audio repetitions.
5. Confirm completion of required listening repetitions.
6. Join weekly recitation sessions only when prerequisites are complete.
7. Recite to moderators and receive grades, comments, and voice notes.
8. Submit leave requests.
9. Take exams.
10. Track progress, grades, absences, and assignments.
11. Receive announcements and notifications.

Moderators must be able to manage weekly recitation sessions, review student readiness, grade students, leave comments, approve absence requests, create exams, and manage assigned students.

Admins must be able to manage users, roles, permissions, enrollment, groups/classes, moderators, system settings, notifications, bans, expulsions, and feature flags.

---

## 3. Core User Roles

Implement role-based access control.

### 3.1 Student

Arabic label: `طالب / طالبة`

Capabilities:

- Register when enrollment is open.
- Submit profile information.
- View assigned level, class, group, moderator, weekly recitation day.
- View memorization assignments.
- View tajweed assignments.
- View poem/matn assignments if enabled.
- Listen to required audio material.
- Mark listening repetitions as complete.
- Upload or record recitation for AI-assisted feedback.
- Join weekly recitation session only when required listening is complete.
- View grades.
- View moderator comments.
- Listen to moderator/admin voice notes.
- Submit leave request with excuse.
- View leave status.
- View announcements.
- Receive notifications.
- Take exams.
- View exam results.
- View personal progress dashboard.

### 3.2 Moderator

Arabic label: `مشرف / مشرفة`

Capabilities:

- View assigned students only.
- View assigned classes/groups/levels.
- Start weekly tasmee/recitation session.
- Generate or attach session meeting link.
- Notify eligible students that session is open.
- Search student by student ID.
- Check student prerequisite completion:
  - Quran audio repetitions.
  - Tajweed audio repetitions.
  - Poem/matn repetitions if enabled.
  - Homework completion.
- Mark student attendance.
- Add grades after recitation.
- Add written notes.
- Add voice notes.
- Mark parts to review again.
- Approve or reject absence requests for assigned students.
- View student profile and progress.
- Create exams for assigned class/group if permission is enabled.
- Review exam submissions.
- Add manual grading where needed.

### 3.3 Admin

Arabic label: `مدير النظام`

Capabilities:

- All moderator capabilities.
- Approve or reject user registrations.
- Open or close enrollment.
- Assign students to:
  - Level.
  - Class.
  - Group.
  - Weekly recitation day.
  - Moderator.
- Assign moderators to:
  - Levels.
  - Classes.
  - Groups.
  - Specific students if needed.
- Create and manage levels.
- Create and manage classes.
- Create and manage groups.
- Create curriculum templates.
- Manage Quran assignments.
- Manage tajweed assignments.
- Manage poem/matn assignments.
- Enable or disable system features.
- Assign roles and permissions.
- Ban users.
- Deactivate users.
- Reactivate users.
- Expel students from group/class/level.
- Send system-wide notifications.
- Create announcements.
- View audit logs.
- View platform statistics.

### 3.4 Support

Arabic label: `الدعم`

Capabilities:

- View support tickets.
- Reply to students/moderators.
- Escalate issues to admin.
- View limited student account status.
- Cannot view grades unless explicitly permitted.
- Cannot modify curriculum, grades, exams, or assignments by default.

---

## 4. Language and Localization Requirements

The system must be Arabic-first.

Requirements:

- Default locale: Arabic.
- Layout direction: RTL.
- English locale must be supported through i18n structure.
- All user-facing strings must use translation files.
- Avoid hardcoding Arabic or English text directly in components.
- Support Arabic names.
- Support Hijri and Gregorian dates if feasible.
- MVP can use Gregorian dates first, but date formatting must be abstracted.

Recommended locales:

```txt
ar
en
```

Translation namespace examples:

```txt
auth.*
dashboard.*
student.*
moderator.*
admin.*
sessions.*
assignments.*
exams.*
notifications.*
common.*
```

---

## 5. Quran Domain Model

The system must understand Quran structure.

Implement canonical Quran reference entities:

### 5.1 Quran Structure

* Surah.
* Ayah.
* Juz.
* Hizb.
* Quarter Hizb.
* Page number, if a Mushaf edition is selected.
* Optional: Manzil (7 divisions for weekly completion), Sajdah markers.

Note: Rub al-Hizb is the same as Quarter Hizb — not a separate entity.

Initial assumptions:

* Quran has 114 Surahs.
* Quran has 6236 Ayahs.
* Quran is divided into 30 Ajza (Juz).
* Each Juz has 2 Hizbs. Total: 60 Hizbs.
* Each Hizb has 4 quarters. Total: 240 Quarter-Hizbs (Rub al-Hizb).

Entities:

  * `juz` — 30 total
  * `hizb` — 60 total
  * `quarter_hizb` — 240 total

Important:

* Do not invent Quran text.
* Use a verified Quran dataset.
* Store Quran text source metadata.
* Support recitation style/riwayah configuration.
* Default recitation: Hafs an Asim unless admin changes it.

### 5.2 Curriculum Assignment Types

Assignments may target:

* Quran memorization.
* Quran revision.
* Tajweed lesson.
* Tajweed audio.
* Poem/matn memorization.
* Homework.
* Exam preparation.

Each assignment must define:

* Title.
* Description.
* Type.
* Level.
* Class/group.
* Due date.
* Required repetitions.
* Audio material.
* Text material.
* Quran range, if applicable:

  * From Surah.
  * From Ayah.
  * To Surah.
  * To Ayah.
  * Juz/Hizb references if used.
* Tajweed topic, if applicable.
* Poem/matn section, if applicable.
* Whether completion is required before weekly session.

---

## 6. Enrollment Lifecycle

Implement enrollment as a controlled process.

### 6.1 Enrollment States

```txt
closed
open
paused
waitlist_only
```

### 6.2 Student Registration Status

Registration status and account status are separate fields to avoid invalid state transitions
(e.g., a student can be `approved` in registration but `deactivated` in account status).

**Registration status** (tracks the enrollment application):

```txt
draft
submitted
pending_review
approved
rejected
waitlisted
```

**Account status** (tracks the active account after approval):

```txt
active
deactivated
banned
expelled
```

### 6.3 Registration Flow

Student can register only if enrollment is open or waitlist is enabled.

Student provides:

* Full name.
* Gender if academy requires gender-based grouping.
* Age or date of birth.
* Parent/guardian contact if under age threshold.
* Email.
* Phone number.
* Country/timezone.
* Preferred language.
* Current Quran memorization level.
* Current tajweed level.
* Preferred weekly recitation day.
* Availability notes.
* Previous memorization background.
* Consent fields.
* Agreement to academy rules.

After registration:

* Student registration status becomes `pending_review`.
* Admin reviews.
* Admin approves/rejects/waitlists.
* If approved, admin assigns level/class/group/moderator. Account status becomes `active`.
* Student receives notification.

### 6.4 Moderator Onboarding

Moderators are created by admins. There is no self-registration for moderators.

Flow:

* Admin creates user account with moderator role.
* Admin assigns moderator to level/class/group.
* Moderator receives credentials and notification.

### 6.5 Password Reset Flow

* User requests password reset via `/forgot-password`.
* System sends a time-limited reset link to the registered email.
* User clicks link and sets a new password.
* Reset token expires after use or after a configured time limit.
* Failed reset attempts are rate-limited.

---

## 7. Class, Group, and Level Model

Implement these entities separately.

### 7.1 Level

Represents learning level.

Examples:

* Beginner.
* Intermediate.
* Advanced.
* Juz Amma.
* Juz Tabarak.
* Full Quran revision.
* Tajweed beginner.
* Tajweed intermediate.

Fields:

* Name Arabic.
* Name English.
* Description.
* Sort order.
* Active/inactive.
* Curriculum template.

### 7.2 Class

Represents a scheduled learning track.

Fields:

* Name.
* Level.
* Default weekly day.
* Timezone.
* Session time.
* Capacity.
* Gender policy if needed.
* Active/inactive.

### 7.3 Group

Represents smaller assigned cohort inside a class.

Fields:

* Name.
* Class.
* Moderator.
* Students.
* Weekly session day.
* Weekly session time.
* Meeting link policy.
* Active/inactive.

### 7.4 Timezone Handling

* All dates and times are stored in UTC in the database.
* Class and group define a display timezone for session scheduling.
* Students see session times converted to their own timezone (from registration profile).
* Moderators see session times in the group's configured timezone.

---

## 8. Weekly Recitation Session Workflow

### 8.1 Moderator Starts Session

Moderator can start a weekly session for assigned group.

Session fields:

* Group.
* Moderator.
* Date.
* Start time.
* End time.
* Status:

  * scheduled
  * open
  * in_progress
  * completed
  * cancelled
* Meeting link:

  * manually entered link for MVP.
  * future integration with Google Meet, Zoom, Jitsi, or BigBlueButton.
* Notes.
* Eligible students list.
* Attendance list.

### 8.2 Student Eligibility Gate

Student can join session only if all required prerequisites are complete.

Prerequisites:

* Quran audio listened required number of repetitions.
* Tajweed audio listened required number of repetitions.
* Poem/matn listened required number of repetitions, if assigned.
* Homework marked complete, if required.
* No active ban/deactivation.
* Not expelled from group.
* Not blocked by admin/moderator.

MVP implementation:

* Student self-reports listening repetition completion.
* Store each confirmation with timestamp.
* Show warning that confirmation is an amanah/trust.
* Moderator can verify completion status by student ID.
* Do not claim actual audio listening verification unless real playback tracking is implemented.

Future implementation:

* Track audio play events.
* Track percentage listened.
* Track repeated listens.
* Prevent fake completion by requiring actual playback progress.
* Add anti-abuse controls.

### 8.3 Moderator Grading After Recitation

For each student session record, moderator can add:

* Attendance status:

  * present
  * absent
  * excused_absence
  * late
* Recitation result:

  * excellent
  * good
  * needs_review
  * incomplete
  * not_recited
* Numeric grade if enabled.
* Mistake count if enabled.
* Tajweed notes.
* Memorization notes.
* Fluency notes.
* Review-required ranges (stored as Quran range references: from surah/ayah to surah/ayah).
* Written comment.
* Voice note attachment.
* Next assignment recommendation.

---

## 9. AI-Assisted Recitation Feedback

Build this as an interface-driven subsystem. Do not hardwire one AI provider.

### 9.1 MVP Scope

MVP should support:

* Student records or uploads an audio recitation.
* System stores audio securely.
* System creates an AI review job.
* AI provider returns tentative feedback.
* Student sees feedback clearly labeled as AI-assisted and not final.
* Moderator can view AI feedback.
* Moderator final grade overrides AI output.

### 9.2 AI Feedback Output

AI feedback should include:

* Target Quran range.
* Detected recited text if available.
* Missing words/ayahs if confidently detected.
* Repeated words if confidently detected.
* Possible pronunciation issues.
* Possible tajweed issues.
* Confidence score.
* Audio quality score.
* Recommendation:

  * ready_for_moderator
  * needs_repeat
  * unclear_audio
  * manual_review_required

### 9.3 Hard Rule

AI must not be the final religious or educational authority.

Final evaluation belongs to a qualified moderator.

### 9.4 Provider Interface

Create abstraction:

```ts
interface RecitationReviewProvider {
  review(input: RecitationReviewInput): Promise<RecitationReviewResult>
}
```

Input:

```ts
type RecitationReviewInput = {
  studentId: string
  assignmentId: string
  quranRange: {
    fromSurah: number
    fromAyah: number
    toSurah: number
    toAyah: number
  }
  audioFileUrl: string
  riwayah: string
  language: "ar" | "en"
}
```

Result:

```ts
type RecitationReviewResult = {
  status: "completed" | "failed" | "manual_review_required"
  confidence: number
  detectedText?: string
  missingSegments?: string[]
  repeatedSegments?: string[]
  tajweedNotes?: string[]
  pronunciationNotes?: string[]
  audioQualityNotes?: string[]
  recommendation: "ready_for_moderator" | "needs_repeat" | "unclear_audio" | "manual_review_required"
  rawProviderPayload?: unknown
}
```

MVP can implement a mock provider. Production provider can be added later.

---

## 10. Exams

### 10.1 Exam Creation

Moderators/admins can create exams.

Exam fields:

* Title.
* Description.
* Level/class/group.
* Start date/time.
* End date/time.
* Duration limit.
* Attempts allowed.
* Passing grade.
* Randomize questions: yes/no.
* Show results immediately: yes/no.
* Active/inactive.

### 10.2 Question Types

Support:

* Multiple choice.
* True/false.
* Short answer.
* Long answer.
* Audio answer upload.
* Quran range identification.
* Tajweed rule identification.
* Matching question.
* Fill in the blank.

Caution:

* Be careful with Quran text handling.
* Do not create disrespectful randomization or broken ayah fragments unless explicitly intended by qualified teachers.
* Preserve Arabic diacritics where needed.
* Audio answer and long answer question types require manual grading — they cannot be auto-scored.

### 10.3 Exam Submission

Track:

* Student.
* Exam.
* Started at.
* Submitted at.
* Time spent.
* Answers.
* Auto score.
* Manual score.
* Final score.
* Moderator/admin comments.

---

## 11. Leave Requests

Student can submit absence/leave request.

Fields:

* Student.
* Group/class.
* Date/session.
* Reason.
* Optional attachment.
* Status:

  * pending
  * approved
  * rejected
  * cancelled
* Moderator/admin decision.
* Decision note.
* Decision timestamp.

Rules:

* Moderator can approve/reject for assigned students.
* Admin can approve/reject all.
* Approved leave marks session as excused absence.

---

## 12. Announcements and Notifications

### 12.1 Announcements

Admins can create system-wide or targeted announcements.

Targeting options:

* All users.
* Students only.
* Moderators only.
* Specific level.
* Specific class.
* Specific group.
* Specific student.

Announcement fields:

* Title.
* Body.
* Priority:

  * normal
  * important
  * urgent
* Publish date.
* Expiry date.
* Attachment.
* Created by.

### 12.2 Notifications

Notification types:

* Enrollment approved.
* Enrollment rejected.
* Assigned to class.
* New assignment.
* Weekly session opened.
* Session cancelled.
* Grade added.
* Moderator comment added.
* Voice note added.
* Leave request approved/rejected.
* Exam assigned.
* Exam result published.
* Admin announcement.

Channels:

* In-app notifications for MVP.
* Email optional.
* WhatsApp/SMS later through provider abstraction.

---

## 13. Voice Notes and Audio Handling

Support audio attachments for:

* Student recitation upload.
* Moderator voice note.
* Admin voice note.
* Assignment audio material.
* Tajweed audio material.
* Poem/matn audio material.

Requirements:

* Store metadata in database.
* Store binary files in object storage.
* Do not store large audio files directly in relational database.
* Support file type validation. Accepted audio formats: mp3, m4a, wav, webm, ogg.
* Support size limits. Default maximum: 50 MB per audio file. Configurable by admin.
* Support access control.
* Signed URLs preferred for private audio access.
* Keep audit trail for uploads/deletions.

---

## 14. Admin Feature Flags

Admin can enable/disable features.

Feature examples:

```txt
ai_recitation_review
student_audio_upload
moderator_voice_notes
exams
leave_requests
announcements
english_locale
email_notifications
support_tickets
audio_playback_tracking
```

Feature flag rules:

* If disabled, hide UI entry points.
* Backend must also enforce disabled state.
* Do not rely only on frontend hiding.

---

## 15. Permissions Model

Use role-based permissions with optional granular overrides.

Entities:

* User.
* Role.
* Permission.
* RolePermission.
* UserPermissionOverride.

Permission examples:

```txt
users.approve
users.ban
users.deactivate
students.view_assigned
students.view_all
students.assign_group
groups.create
groups.update
sessions.create
sessions.start
sessions.grade
assignments.create
assignments.update
exams.create
exams.grade
leave_requests.review
announcements.create
notifications.send
support_tickets.view_assigned
support_tickets.view_all
support_tickets.reply
support_tickets.escalate
system_settings.update
feature_flags.update
audit_logs.view
```

Admins can assign roles and permissions.

---

## 16. Support Tickets

Support role can manage basic support workflow.

Ticket fields:

* Created by.
* Assigned to.
* Category.
* Subject.
* Description.
* Status:

  * open
  * pending_user
  * pending_admin
  * resolved
  * closed
* Priority.
* Messages.
* Attachments.

Access rules:

* Student sees own tickets.
* Support sees assigned/all tickets depending permission.
* Admin sees all tickets.

---

## 17. Dashboards

### 17.1 Student Dashboard

Show:

* Current level/class/group.
* Next weekly session.
* Whether eligible to join.
* Current assignments.
* Listening repetition status.
* AI recitation feedback status.
* Latest grades.
* Moderator comments.
* Leave request status.
* Announcements.
* Exams due.

### 17.2 Moderator Dashboard

Show:

* Assigned groups.
* Today’s sessions.
* Students needing review.
* Pending absence requests.
* Recent recitation uploads.
* Exams needing grading.
* At-risk students:

  * repeated absence
  * low grades
  * incomplete assignments
  * missed listening confirmations

### 17.3 Admin Dashboard

Show:

* Pending registrations.
* Active students.
* Active moderators.
* Enrollment status.
* Groups/classes summary.
* Attendance summary.
* Pending leave requests.
* Open support tickets.
* Feature flags.
* Recent audit events.

---

## 18. Security, Privacy, and Compliance

Implement security from the first version.

Requirements:

* Authentication.
* Authorization on every protected route/API.
* Server-side permission checks.
* Input validation.
* Audit logging for admin/moderator sensitive actions.
* Private audio access.
* Rate limiting for auth endpoints.
* Account deactivation and banning.
* No public exposure of student data.
* Data minimization.
* Protect minors’ data.
* Parent/guardian consent workflow if under configured age.
* Admin-controlled data retention policy for audio uploads.

Audit events:

* User approved/rejected.
* Role changed.
* Permission changed.
* Student assigned to group.
* Student expelled.
* User banned/deactivated.
* Grade created/updated.
* Leave request approved/rejected.
* Session opened/cancelled.
* Feature flag changed.
* Announcement sent.

---

## 19. Recommended Technical Architecture

Use existing repo stack if already present.

If no stack exists, use this default:

* Frontend/backend: Next.js with App Router.
* Language: TypeScript.
* Styling: Tailwind CSS.
* UI: shadcn/ui or equivalent accessible component library.
* Database: PostgreSQL.
* ORM: Prisma.
* Auth: Auth.js/NextAuth for authentication (session management, login/logout). Authorization and RBAC are a custom layer — Auth.js does not handle role-based access, admin approval, or permission checks.
* File storage: S3-compatible storage abstraction.
* Background jobs: queue abstraction for AI review jobs and notifications.
* Validation: Zod.
* Testing:

  * Unit tests for domain logic.
  * Integration tests for permissions.
  * E2E smoke tests for major flows.

Architecture layers:

```txt
app/
  [locale]/
    student/
    moderator/
    admin/
    support/

components/
  ui/
  forms/
  dashboards/
  quran/
  sessions/
  assignments/
  exams/

server/
  auth/
  permissions/
  services/
  repositories/
  jobs/
  providers/
    recitation-review/
    notification/
    storage/

db/
  schema.prisma
  seed/
```

---

## 20. Database Entities

Design schema for at least:

```txt
User
Role
Permission
RolePermission
UserPermissionOverride
StudentProfile
ModeratorProfile
EnrollmentApplication
Level
Class
Group
GroupStudent
ModeratorAssignment
QuranSurah
QuranAyah
QuranJuz
QuranHizb
QuranQuarter
QuranPage
MushafEdition
CurriculumTemplate
Assignment
AssignmentMaterial
StudentAssignment
ListeningRequirement
ListeningConfirmation
RecitationUpload
AIRecitationReview
WeeklySession
SessionStudent
Grade
ReviewRange
ModeratorComment
VoiceNote
LeaveRequest
Exam
ExamQuestion
ExamOption
ExamSubmission
ExamAnswer
Announcement
Notification
SupportTicket
SupportTicketMessage
FeatureFlag
SystemSetting
AuditLog
FileAsset
PasswordResetToken
```

Use clear foreign keys and indexes.

Important indexes:

* User email.
* Student ID.
* Group ID.
* Class ID.
* Moderator ID.
* Assignment due date.
* Weekly session date.
* Notification recipient/status.
* Audit log actor/date.
* Enrollment application status.
* Review range student/grade.
* Password reset token (user, expiry).

---

## 21. Required Pages

### Public

```txt
/
 /login
 /register
 /enrollment-closed
 /forgot-password
 /reset-password/[token]
```

### Student

```txt
/ar/student/dashboard
/ar/student/profile
/ar/student/assignments
/ar/student/assignments/[id]
/ar/student/listening
/ar/student/recitation
/ar/student/sessions
/ar/student/grades
/ar/student/comments
/ar/student/voice-notes
/ar/student/leave-requests
/ar/student/exams
/ar/student/announcements
/ar/student/notifications
```

### Moderator

```txt
/ar/moderator/dashboard
/ar/moderator/groups
/ar/moderator/students
/ar/moderator/students/[id]
/ar/moderator/sessions
/ar/moderator/sessions/[id]
/ar/moderator/grades
/ar/moderator/leave-requests
/ar/moderator/exams
/ar/moderator/announcements
```

### Admin

```txt
/ar/admin/dashboard
/ar/admin/enrollment
/ar/admin/users
/ar/admin/students
/ar/admin/moderators
/ar/admin/roles
/ar/admin/permissions
/ar/admin/levels
/ar/admin/classes
/ar/admin/groups
/ar/admin/curriculum
/ar/admin/assignments
/ar/admin/sessions
/ar/admin/exams
/ar/admin/announcements
/ar/admin/notifications
/ar/admin/feature-flags
/ar/admin/settings
/ar/admin/audit-logs
```

### Support

```txt
/ar/support/dashboard
/ar/support/tickets
/ar/support/tickets/[id]
```

---

## 22. MVP Scope

Build MVP in this order.

### Phase 1: Foundation

* App shell.
* Arabic RTL layout.
* i18n setup.
* Authentication.
* User roles.
* Permission checks.
* Admin dashboard skeleton.
* Student dashboard skeleton.
* Moderator dashboard skeleton.
* Database schema.
* Seed roles and permissions.
* Seed Quran structure placeholders using verified import process.

### Phase 2: Enrollment and User Management

* Enrollment open/close setting.
* Student registration.
* Admin approval.
* Student profile.
* Assign student to level/class/group.
* Assign moderator to group.
* Ban/deactivate/reactivate user.

### Phase 3: Assignments and Listening Requirements

* Admin/moderator assignment creation.
* Quran range assignment.
* Tajweed assignment.
* Audio material upload/link.
* Required repetition count.
* Student completion confirmation.
* Eligibility calculation.

### Phase 4: Weekly Sessions

* Moderator starts session.
* Meeting link field.
* Notify students.
* Student join gate.
* Attendance.
* Grades.
* Comments.
* Review ranges.
* Voice notes.

### Phase 5: Leave Requests and Announcements

* Student leave request.
* Moderator/admin approval.
* Announcements.
* In-app notifications.

### Phase 6: Exams

* Exam creation.
* Question types.
* Student submission.
* Auto/manual grading.
* Results.

### Phase 7: AI Recitation Interface

* Audio upload.
* AI review job model.
* Mock provider.
* Result display.
* Moderator review integration.
* Provider abstraction for future real AI.

---

## 23. Acceptance Criteria

### Student

* Student cannot register when enrollment is closed.
* Student can register when enrollment is open.
* Student remains pending until admin approval.
* Student cannot access dashboard before approval unless allowed by policy.
* Student can view assignments after class/group assignment.
* Student can mark required listening repetitions complete.
* Student cannot join weekly session if required listening is incomplete.
* Student can join if prerequisites are complete and session is open.
* Student can view grades/comments/voice notes.
* Student can submit leave request.
* Student can take assigned exams.

### Moderator

* Moderator sees only assigned groups/students unless elevated permission exists.
* Moderator can start session for assigned group.
* Moderator can notify eligible students.
* Moderator can search student by student ID.
* Moderator can verify listening completion.
* Moderator can add grades and comments.
* Moderator can upload voice notes.
* Moderator can approve/reject leave requests for assigned students.
* Moderator cannot manage global system settings.

### Admin

* Admin can approve/reject registrations.
* Admin can assign users to levels/classes/groups.
* Admin can assign moderators.
* Admin can manage roles/permissions.
* Admin can enable/disable feature flags.
* Admin can ban/deactivate/expel users.
* Admin can send system-wide notifications.
* Admin can view audit logs.

### Security

* No protected page is accessible without authentication.
* No user can perform unauthorized actions by calling API directly.
* All sensitive actions create audit logs.
* Audio files are not publicly exposed by default.

---

## 24. Engineering Rules

Follow these rules while implementing:

1. Inspect the repository first.
2. Reuse existing stack and conventions if present.
3. If no app exists, scaffold using the recommended architecture.
4. Keep the system modular.
5. Do not place business logic directly inside UI components.
6. Put permission checks on the server.
7. Add tests for permission-sensitive workflows.
8. Use Arabic translation keys, not hardcoded UI strings.
9. Use RTL-compatible layouts.
10. Use typed domain models.
11. Use validation schemas for all forms/API inputs.
12. Do not implement real AI recitation correction as fake logic.
13. Build a provider interface and mock provider first.
14. Mark AI output as tentative.
15. Ensure moderator remains final authority.
16. Do not invent Quran data. Use verified imports.
17. Keep all Quran source metadata.
18. Keep file/audio storage abstracted.
19. Keep notification delivery abstracted.
20. Produce clear README setup instructions.

---

## 25. Deliverables

Produce:

1. Updated architecture notes.
2. Database schema.
3. Seed data for roles, permissions, feature flags, and sample levels/classes/groups.
4. Arabic-first UI shell.
5. Auth and RBAC implementation.
6. Student registration/enrollment flow.
7. Admin approval and assignment flow.
8. Student assignment/listening flow.
9. Moderator session/grading flow.
10. Leave request flow.
11. Announcement/notification flow.
12. Exam skeleton.
13. AI recitation review abstraction with mock provider.
14. Tests for core authorization and eligibility rules.
15. README with setup and development instructions.

---

## 26. Initial Implementation Plan Required From Claude Code

Before coding, produce:

1. Current repository assessment.
2. Chosen stack confirmation.
3. Proposed folder structure.
4. Database schema plan.
5. First implementation slice.
6. Risks and assumptions.
7. Exact files to create or modify.

Then implement the first vertical slice:

**Admin opens enrollment → student registers → admin approves student → admin assigns student to level/class/group → student sees dashboard.**

After that, implement:

**Admin/moderator creates assignment with required listening repetitions → student confirms repetitions → moderator opens weekly session → student can join only if eligible → moderator grades student.**

```

## Key additions you should keep in the spec

The main missing pieces from your original idea were these:

1. **Enrollment lifecycle**
   
   You need explicit states: enrollment open, closed, paused, waitlist-only. Otherwise registration logic becomes messy.

2. **Human-in-the-loop AI**
   
   AI recitation correction should not be final authority. It should assist students and moderators, but moderator grading must override it.

3. **Listening verification honesty**
   
   In MVP, the system can let students confirm repetitions. It must not pretend it verified listening unless real playback tracking exists.

4. **Quran data source control**
   
   The system must not invent Quran text or structure. It needs a verified Quran dataset and source metadata.

5. **Child/minor privacy**
   
   Because many Quran students may be children, the spec needs parent/guardian consent, access control, and careful handling of audio files.

6. **Feature flags**
   
   You need admin-controlled switches for AI recitation, exams, voice notes, support tickets, English UI, and notifications.

7. **Audio storage abstraction**
   
   Recitation uploads and voice notes should go to object storage, not directly into the database.
```

