# Database Schema Reference

## Overview

Yusr Academy uses **PostgreSQL 16** with **Prisma 7** ORM. The schema is organized into logical domains with 40+ models covering authentication, organization, memorization tracking, exams, gamification, and system management.

## Database Configuration

- **Provider**: PostgreSQL
- **Client Generator**: Prisma Client (output: `./generated/prisma`)
- **Adapter**: PrismaPg for connection pooling
- **Migrations**: Located in `prisma/migrations/`

---

## Schema by Domain

### Auth & RBAC

#### User
Core user entity with role-based access control.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| email | String (unique) | User email (indexed) |
| passwordHash | String | bcrypt hash (12 rounds) |
| name | String | Display name |
| nameAr | String? | Arabic name |
| roleId | String | Foreign key to Role |
| accountStatus | AccountStatus? | ACTIVE, DEACTIVATED, BANNED, EXPELLED |
| locale | String | Preferred locale (default: "ar") |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

**Relations**: role, studentProfile, moderatorProfile, enrollmentApplication, permissionOverrides, notifications, auditLogs, passwordResetTokens, createdAssignments, memorizationReviews, reviewedLeaveRequests, createdAnnouncements, assignedTickets, ticketReplies, createdExamTemplates, createdExamInstances, createdGoals, awardedBadges, planTemplates, pushSubscriptions

**Indexes**: email, roleId, accountStatus

#### Role
Predefined roles with permission associations.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String (unique) | Role name (admin, moderator, student, support) |
| nameAr | String | Arabic name |
| description | String? | Role description |

**Relations**: users, permissions (via RolePermission)

#### Permission
Granular permissions for RBAC.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| key | String (unique) | Permission key (e.g., "users.approve") |
| description | String? | Human-readable description |

**Relations**: rolePermissions, userOverrides

#### RolePermission
Many-to-many join table for Role ↔ Permission.

| Field | Type | Description |
|-------|------|-------------|
| roleId | String | FK to Role |
| permissionId | String | FK to Permission |

**Composite PK**: [roleId, permissionId]

#### UserPermissionOverride
Per-user permission grants/revokes.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | FK to User |
| permissionId | String | FK to Permission |
| granted | Boolean | True = grant, False = revoke |

**Composite PK**: [userId, permissionId]

#### PasswordResetToken
Password reset tokens with expiry.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK to User |
| token | String (unique) | Reset token (64 hex chars) |
| expiresAt | DateTime | Token expiry (1 hour from creation) |
| usedAt | DateTime? | Timestamp when token was used |

**Indexes**: token, [userId, expiresAt]

---

### Student & Enrollment

#### StudentProfile
Extended profile for students.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String (unique) | FK to User |
| dateOfBirth | DateTime? | Student birthdate |
| gender | String? | Gender (male/female) |
| phone | String? | Phone number |
| country | String? | Country |
| timezone | String? | Timezone (default: "UTC") |
| currentQuranLevel | String? | Self-reported Quran level |
| currentTajweedLevel | String? | Self-reported Tajweed level |
| previousBackground | String? | Prior Quran education |
| parentContact | String? | Parent/guardian contact |
| preferredDay | String? | Preferred session day |
| availabilityNotes | String? | Availability notes |

**Relations**: user, groupStudents, studentAssignments, sessionStudents, memorizationPlans, leaveRequests, supportTickets, examSubmissions, milestones, badges

#### EnrollmentApplication
Tracks student registration and approval workflow.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String (unique) | FK to User |
| registrationStatus | RegistrationStatus | DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED, WAITLISTED (default: PENDING_REVIEW) |
| submittedAt | DateTime? | Submission timestamp |
| reviewedById | String? | FK to reviewer User |
| reviewedAt | DateTime? | Review timestamp |
| reviewNote | String? | Reviewer's notes |

**Indexes**: registrationStatus

---

### Organization (Level → Class → Group)

#### Level
Top-level organization structure.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| nameAr | String | Arabic name |
| nameEn | String? | English name |
| description | String? | Level description |
| sortOrder | Int | Display order (default: 0) |
| active | Boolean | Is active (default: true) |

**Relations**: classes

#### Class
Classes within levels.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Class name |
| levelId | String | FK to Level |
| defaultDay | String? | Default session day |
| timezone | String | Timezone (default: "UTC") |
| sessionTime | String? | Default session time |
| capacity | Int? | Max student capacity |
| genderPolicy | String? | Gender policy (if any) |
| active | Boolean | Is active (default: true) |

**Indexes**: levelId

**Relations**: level, groups

#### Group
Student groups within classes.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Group name |
| classId | String | FK to Class |
| moderatorId | String? | FK to ModeratorProfile |
| weeklyDay | String? | Weekly session day |
| weeklyTime | String? | Weekly session time |
| meetingLinkPolicy | String? | Meeting link generation policy |
| meetingCadence | MeetingCadence | WEEKLY, BIWEEKLY, TWICE_WEEKLY, CUSTOM (default: WEEKLY) |
| customCadenceDays | Int? | Custom cadence in days |
| memorizationPlansEnabled | Boolean | Enable memorization plans (default: false) |
| active | Boolean | Is active (default: true) |

**Indexes**: classId, moderatorId

**Relations**: class, moderator, students (via GroupStudent), sessions, memorizationPlans, examInstances, attendanceAlertConfig

#### GroupStudent
Many-to-many join for Group ↔ StudentProfile.

| Field | Type | Description |
|-------|------|-------------|
| groupId | String | FK to Group |
| studentId | String | FK to StudentProfile |
| assignedAt | DateTime | Assignment timestamp |

**Composite PK**: [groupId, studentId]

#### ModeratorProfile
Extended profile for moderators.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String (unique) | FK to User |

**Relations**: user, groups, sessions

---

### Assignments

#### Assignment
Base assignment entity (polymorphic via type-specific tables).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Assignment title |
| description | String? | Assignment description |
| type | AssignmentType | QURAN_MEMORIZATION, QURAN_REVISION, TAJWEED, HOMEWORK |
| targetType | AssignmentTargetType | GROUP, CLASS, LEVEL |
| targetId | String | ID of target entity |
| createdById | String | FK to User (creator) |
| dueDate | DateTime? | Due date |
| requiredRepetitions | Int | Required repetitions (default: 1) |
| active | Boolean | Is active (default: true) |

**Indexes**: [targetType, targetId], createdById, type, dueDate

**Relations**: createdBy, quranAssignment, tajweedAssignment, homeworkAssignment, materials, studentAssignments

#### QuranAssignment
Quran-specific assignment details.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| assignmentId | String (unique) | FK to Assignment (cascade delete) |
| fromSurahNumber | Int | FK to QuranSurah |
| fromAyahNumber | Int | Starting ayah |
| toSurahNumber | Int | FK to QuranSurah |
| toAyahNumber | Int | Ending ayah |
| juzNumber | Int? | Juz number (if applicable) |

#### TajweedAssignment
Tajweed-specific assignment details.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| assignmentId | String (unique) | FK to Assignment (cascade delete) |
| topicTitle | String | Topic title |
| topicDescription | String? | Topic description |
| materialUrl | String? | Material URL |

#### HomeworkAssignment
Homework-specific assignment details.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| assignmentId | String (unique) | FK to Assignment (cascade delete) |
| instructions | String | Homework instructions |

#### AssignmentMaterial
Attached materials for assignments.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| assignmentId | String | FK to Assignment (cascade delete) |
| type | MaterialType | AUDIO_URL, VIDEO_URL, IFRAME_EMBED |
| url | String | Material URL |
| title | String? | Material title |
| sortOrder | Int | Display order (default: 0) |

**Indexes**: assignmentId

#### StudentAssignment
Assignment distribution to individual students.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| assignmentId | String | FK to Assignment (cascade delete) |
| studentId | String | FK to StudentProfile |
| status | StudentAssignmentStatus | ASSIGNED, IN_PROGRESS, COMPLETED (default: ASSIGNED) |
| assignedAt | DateTime | Assignment timestamp |
| completedAt | DateTime? | Completion timestamp |

**Unique**: [assignmentId, studentId]

**Indexes**: studentId, status

**Relations**: assignment, student, confirmations

#### ListeningConfirmation
Tracks listening confirmations for audio assignments.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| studentAssignmentId | String | FK to StudentAssignment (cascade delete) |
| confirmedAt | DateTime | Confirmation timestamp |

**Indexes**: studentAssignmentId

---

### Weekly Sessions

#### WeeklySession
Scheduled or completed group sessions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| groupId | String | FK to Group |
| moderatorId | String | FK to ModeratorProfile |
| date | DateTime | Session date |
| startTime | String? | Session start time |
| endTime | String? | Session end time |
| status | SessionStatus | SCHEDULED, OPEN, IN_PROGRESS, COMPLETED, CANCELLED (default: SCHEDULED) |
| meetingLink | String? | Online meeting link |
| notes | String? | Session notes |

**Indexes**: groupId, moderatorId, date, status

**Relations**: group, moderator, students (via SessionStudent), memorizationReviews, leaveRequests, examInstances

#### SessionStudent
Per-student session attendance and grading.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| sessionId | String | FK to WeeklySession (cascade delete) |
| studentId | String | FK to StudentProfile |
| attendance | AttendanceStatus | PENDING, PRESENT, ABSENT, EXCUSED_ABSENCE, LATE (default: PENDING) |
| recitationResult | RecitationResult | NOT_GRADED, EXCELLENT, GOOD, NEEDS_REVIEW, INCOMPLETE, NOT_RECITED (default: NOT_GRADED) |
| numericGrade | Float? | Numeric grade (if applicable) |
| mistakeCount | Int? | Number of mistakes |
| tajweedNotes | String? | Tajweed notes |
| memorizationNotes | String? | Memorization notes |
| fluencyNotes | String? | Fluency notes |
| comment | String? | General comment |
| voiceNoteUrl | String? | Voice note URL |
| gradedAt | DateTime? | Grading timestamp |

**Unique**: [sessionId, studentId]

**Indexes**: studentId, sessionId

**Relations**: session, student, reviewRanges

#### LeaveRequest
Student leave/absence requests.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| studentId | String | FK to StudentProfile |
| sessionId | String | FK to WeeklySession |
| reason | String | Leave reason |
| status | LeaveRequestStatus | PENDING, APPROVED, REJECTED (default: PENDING) |
| reviewedById | String? | FK to reviewer User |
| reviewNote | String? | Reviewer notes |

**Unique**: [studentId, sessionId]

**Indexes**: studentId, sessionId, status

#### ReviewRange
Quran ranges reviewed during session.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| sessionStudentId | String | FK to SessionStudent (cascade delete) |
| fromSurahNumber | Int | FK to QuranSurah |
| fromAyahNumber | Int | Starting ayah |
| toSurahNumber | Int | FK to QuranSurah |
| toAyahNumber | Int | Ending ayah |
| note | String? | Review notes |

**Indexes**: sessionStudentId

---

### Quran Reference Data (Read-Only)

#### QuranSurah
Surah metadata (114 surahs).

| Field | Type | Description |
|-------|------|-------------|
| number | Int (PK) | Surah number (1-114) |
| nameAr | String | Arabic name |
| nameEn | String | English name |
| revelationType | String | Meccan or Medinan |
| ayahCount | Int | Number of ayahs |

**Relations**: ayahs, quranAssignments, reviewRanges, memorizationPlans, memorizationReviews, examQuestions, customGoals

#### QuranAyah
Individual ayahs with text and boundary metadata (6236 ayahs).

| Field | Type | Description |
|-------|------|-------------|
| id | Int (auto-increment PK) | Primary key |
| surahNumber | Int | FK to QuranSurah |
| ayahNumber | Int | Ayah number within surah |
| juzNumber | Int | Juz number (1-30) |
| hizbNumber | Int | Hizb number (1-60) |
| quarterNumber | Int | Quarter-hizb number (1-240) |
| pageNumber | Int? | Mushaf page (1-604) |
| textAr | String? | Arabic text |
| textEn | String? | English translation |

**Unique**: [surahNumber, ayahNumber]

**Indexes**: juzNumber, hizbNumber, quarterNumber

#### QuranJuz
Juz metadata (30 juz).

| Field | Type | Description |
|-------|------|-------------|
| number | Int (PK) | Juz number (1-30) |
| nameAr | String? | Arabic name |

#### QuranHizb
Hizb metadata (60 hizbs).

| Field | Type | Description |
|-------|------|-------------|
| number | Int (PK) | Hizb number (1-60) |
| juzNumber | Int | Parent juz |

#### QuranQuarter
Quarter-hizb metadata (240 quarters, also called "rub").

| Field | Type | Description |
|-------|------|-------------|
| number | Int (PK) | Quarter number (1-240) |
| hizbNumber | Int | Parent hizb |

---

### Memorization Plans

#### TajweedCategory
Tajweed evaluation categories.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| nameEn | String | English name |
| nameAr | String | Arabic name |
| isCore | Boolean | Is core category (default: false) |
| sortOrder | Int | Display order (default: 0) |
| active | Boolean | Is active (default: true) |

**Relations**: reviewScores

#### MemorizationPlanTemplate
Reusable memorization plan templates.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| name | String | Template name |
| nameAr | String | Arabic name |
| paceUnit | PaceUnit | RUB, HIZB, PAGE_COUNT |
| paceValue | Decimal | Pace value (e.g., 1.5 pages) |
| description | String? | Template description |
| isDefault | Boolean | Is default template (default: false) |
| createdById | String? | FK to creator User |

**Relations**: createdBy, plans

#### StudentMemorizationPlan
Individual student memorization tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| studentId | String | FK to StudentProfile |
| groupId | String | FK to Group |
| currentSurahId | Int | FK to QuranSurah (current position) |
| currentAyahNumber | Int | Current ayah position |
| paceUnit | PaceUnit | RUB, HIZB, PAGE_COUNT (default: RUB) |
| paceValue | Decimal | Pace value (default: 1) |
| meetingCadence | MeetingCadence? | Meeting cadence override |
| customCadenceDays | Int? | Custom cadence days |
| nextReviewDate | DateTime? | Next scheduled review |
| templateId | String? | FK to MemorizationPlanTemplate (nullable, set null on delete) |
| nextOverride | Json? | Next range override |
| active | Boolean | Is active (default: true) |

**Unique**: [studentId, groupId]

**Indexes**: studentId, groupId

**Relations**: student, group, currentSurah, template, reviews, milestones, customGoals

#### MemorizationReview
Individual memorization review records.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| planId | String | FK to StudentMemorizationPlan (cascade delete) |
| moderatorId | String | FK to User (moderator) |
| sessionId | String? | FK to WeeklySession |
| reviewDate | DateTime | Review timestamp (default: now) |
| fromSurahNumber | Int | FK to QuranSurah (reviewed range start) |
| fromAyah | Int | Start ayah |
| toSurahNumber | Int | FK to QuranSurah (reviewed range end) |
| toAyah | Int | End ayah |
| recitationResult | String | Recitation result |
| grade | Int | Numeric grade |
| notes | String? | Review notes |
| voiceNoteUrl | String? | Voice note URL |
| nextFromSurahNumber | Int | FK to QuranSurah (next range start) |
| nextFromAyah | Int | Next start ayah |
| nextToSurahNumber | Int | FK to QuranSurah (next range end) |
| nextToAyah | Int | Next end ayah |

**Indexes**: planId, moderatorId, sessionId, reviewDate

**Relations**: plan, moderator, session, fromSurah, toSurah, nextFromSurah, nextToSurah, tajweedScores, mistakes

#### ReviewTajweedScore
Tajweed scores for reviews.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| reviewId | String | FK to MemorizationReview (cascade delete) |
| categoryId | String | FK to TajweedCategory |
| score | Int | Score value |
| notes | String? | Notes |

**Unique**: [reviewId, categoryId]

**Indexes**: reviewId

#### ReviewMistake
Categorized mistakes during review.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| reviewId | String | FK to MemorizationReview (cascade delete) |
| category | MistakeCategory | TAJWEED_ERROR, WRONG_WORD, HESITATION, SKIPPED_AYAH, REPEATED_AYAH, OTHER |
| notes | String | Mistake description |

**Indexes**: reviewId

---

### Exams

#### ExamTemplate
Reusable exam templates.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Exam title |
| description | String? | Exam description |
| passingScore | Int | Passing score threshold |
| totalPoints | Int | Total possible points (default: 0) |
| createdById | String | FK to creator User |

**Indexes**: createdById

**Relations**: createdBy, questions, instances

#### ExamQuestion
Questions within exam templates.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| templateId | String | FK to ExamTemplate (cascade delete) |
| type | QuestionType | MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, RECITATION |
| text | String | Question text |
| points | Int | Point value |
| order | Int | Question order |
| options | Json? | Answer options (for MCQ/TF) |
| correctAnswer | String? | Correct answer |
| tags | String[] | Question tags |
| fromSurahNumber | Int? | FK to QuranSurah (for recitation) |
| fromAyah | Int? | Start ayah (for recitation) |
| toSurahNumber | Int? | FK to QuranSurah (for recitation) |
| toAyah | Int? | End ayah (for recitation) |

**Unique**: [templateId, order]

**Indexes**: templateId

**Relations**: template, fromSurah, toSurah, answers

#### ExamInstance
Deployed exam instances for groups.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| templateId | String | FK to ExamTemplate |
| groupId | String | FK to Group |
| sessionId | String? | FK to WeeklySession |
| status | ExamInstanceStatus | DRAFT, PUBLISHED, IN_PROGRESS, COMPLETED (default: DRAFT) |
| startDate | DateTime | Exam start date |
| endDate | DateTime | Exam end date |
| customizations | Json? | Instance customizations |
| timeLimitMinutes | Int? | Time limit in minutes |
| shuffleQuestions | Boolean | Shuffle question order (default: false) |
| maxAttempts | Int? | Maximum attempts allowed |
| poolConfig | Json? | Question pool configuration |
| createdById | String | FK to creator User |

**Indexes**: templateId, groupId, status

**Relations**: template, group, session, createdBy, submissions

#### ExamSubmission
Student exam submissions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| instanceId | String | FK to ExamInstance (cascade delete) |
| studentId | String | FK to StudentProfile |
| status | ExamSubmissionStatus | NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED (default: NOT_STARTED) |
| attemptNumber | Int | Attempt number (default: 1) |
| questionOrder | Json? | Shuffled question order |
| startedAt | DateTime? | Start timestamp |
| submittedAt | DateTime? | Submission timestamp |
| gradedAt | DateTime? | Grading timestamp |
| totalScore | Float? | Total score achieved |
| passed | Boolean? | Pass/fail status |

**Unique**: [instanceId, studentId, attemptNumber]

**Indexes**: instanceId, studentId

**Relations**: instance, student, answers

#### ExamAnswer
Individual answers within submissions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| submissionId | String | FK to ExamSubmission (cascade delete) |
| questionId | String | FK to ExamQuestion |
| answer | String? | Student's answer |
| isCorrect | Boolean? | Correctness (auto or manual) |
| score | Float? | Points awarded |
| moderatorNotes | String? | Grading notes |
| recitationResult | String? | Recitation result (for RECITATION type) |
| tajweedNotes | String? | Tajweed notes |
| fluencyNotes | String? | Fluency notes |

**Unique**: [submissionId, questionId]

**Indexes**: submissionId, questionId

---

### Gamification

#### BadgeDefinition
Reusable badge definitions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| key | String (unique) | Badge key (e.g., "first_juz") |
| icon | String | Icon name |
| color | String | Badge color (hex) |
| category | String | Badge category (MILESTONE, STREAK, REVIEW, SPECIAL) |
| trigger | Json? | Auto-trigger criteria (null for manual) |
| sortOrder | Int | Display order (default: 0) |

**Indexes**: category

**Relations**: studentBadges

#### StudentBadge
Badges awarded to students.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| studentId | String | FK to StudentProfile |
| badgeId | String | FK to BadgeDefinition |
| awardedAt | DateTime | Award timestamp (default: now) |
| awardedById | String? | FK to awarder User (null for auto) |
| note | String? | Award note |

**Unique**: [studentId, badgeId]

**Indexes**: studentId, badgeId

#### StudentMilestone
Milestone achievements.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| studentId | String | FK to StudentProfile |
| planId | String | FK to StudentMemorizationPlan |
| type | String | Milestone type (JUZ_COMPLETE, SURAH_COMPLETE, etc.) |
| value | String | Milestone value (e.g., juz number) |
| label | String | Display label |
| achievedAt | DateTime | Achievement timestamp (default: now) |

**Unique**: [studentId, type, value]

**Indexes**: studentId, planId

#### CustomGoal
Custom student goals.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| planId | String | FK to StudentMemorizationPlan |
| createdById | String | FK to creator User |
| targetSurahNumber | Int | FK to QuranSurah |
| targetAyahNumber | Int | Target ayah |
| deadline | DateTime? | Goal deadline |
| completedAt | DateTime? | Completion timestamp |
| title | String | Goal title |

**Indexes**: planId

---

### Support & Announcements

#### Announcement
System announcements.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Announcement title |
| body | String | Announcement body |
| priority | String | Priority level (default: "normal") |
| targetType | String? | Target type (GROUP, CLASS, LEVEL, null = global) |
| targetId | String? | Target entity ID |
| publishDate | DateTime | Publish date (default: now) |
| expiryDate | DateTime? | Expiry date |
| createdById | String | FK to creator User |

**Relations**: createdBy

#### SupportTicket
Student support tickets.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| subject | String | Ticket subject |
| body | String | Ticket body |
| status | TicketStatus | OPEN, IN_PROGRESS, RESOLVED, CLOSED (default: OPEN) |
| escalated | Boolean | Is escalated (default: false) |
| studentId | String | FK to StudentProfile |
| assignedToId | String? | FK to assigned User |

**Indexes**: studentId, assignedToId, status

**Relations**: student, assignedTo, replies

#### TicketReply
Replies to support tickets.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| ticketId | String | FK to SupportTicket (cascade delete) |
| authorId | String | FK to author User |
| body | String | Reply body |

**Indexes**: ticketId

---

### System

#### FeatureFlag
Feature flag toggles.

| Field | Type | Description |
|-------|------|-------------|
| key | String (PK) | Feature flag key |
| enabled | Boolean | Is enabled (default: false) |
| description | String? | Flag description |

#### SystemSetting
System configuration key-value store.

| Field | Type | Description |
|-------|------|-------------|
| key | String (PK) | Setting key |
| value | String | Setting value |
| description | String? | Setting description |

#### AuditLog
Audit trail for all actions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| actorId | String? | FK to User (actor) |
| action | String | Action name (e.g., "user.approved") |
| entityType | String | Entity type (e.g., "User") |
| entityId | String | Entity ID |
| metadata | Json? | Additional context |
| createdAt | DateTime | Timestamp (default: now) |

**Indexes**: actorId, action, [entityType, entityId], createdAt

#### Notification
In-app notifications.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| recipientId | String | FK to User |
| type | String | Notification type |
| title | String | Notification title |
| body | String? | Notification body |
| read | Boolean | Is read (default: false) |
| createdAt | DateTime | Timestamp (default: now) |

**Indexes**: [recipientId, read], createdAt

#### PushSubscription
Web push notification subscriptions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK to User (cascade delete) |
| endpoint | String (unique) | Push subscription endpoint |
| p256dh | String | P256DH key |
| auth | String | Auth secret |
| createdAt | DateTime | Subscription timestamp (default: now) |

**Indexes**: userId

#### AttendanceAlertConfig
Attendance alert thresholds.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| groupId | String? (unique) | FK to Group (null = global default) |
| consecutiveAbsenceThreshold | Int | Consecutive absence threshold (default: 3) |
| attendanceRateThreshold | Int | Attendance rate threshold % (default: 75) |
| notifyModerator | Boolean | Notify moderator (default: true) |
| notifyAdmin | Boolean | Notify admin (default: true) |

---

## Enums Reference

| Enum | Values |
|------|--------|
| AccountStatus | ACTIVE, DEACTIVATED, BANNED, EXPELLED |
| RegistrationStatus | DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED, WAITLISTED |
| AssignmentType | QURAN_MEMORIZATION, QURAN_REVISION, TAJWEED, HOMEWORK |
| AssignmentTargetType | GROUP, CLASS, LEVEL |
| MaterialType | AUDIO_URL, VIDEO_URL, IFRAME_EMBED |
| StudentAssignmentStatus | ASSIGNED, IN_PROGRESS, COMPLETED |
| SessionStatus | SCHEDULED, OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| AttendanceStatus | PENDING, PRESENT, ABSENT, EXCUSED_ABSENCE, LATE |
| LeaveRequestStatus | PENDING, APPROVED, REJECTED |
| TicketStatus | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| QuestionType | MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, RECITATION |
| ExamInstanceStatus | DRAFT, PUBLISHED, IN_PROGRESS, COMPLETED |
| ExamSubmissionStatus | NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED |
| RecitationResult | NOT_GRADED, EXCELLENT, GOOD, NEEDS_REVIEW, INCOMPLETE, NOT_RECITED |
| PaceUnit | RUB, HIZB, PAGE_COUNT |
| MeetingCadence | WEEKLY, BIWEEKLY, TWICE_WEEKLY, CUSTOM |
| MistakeCategory | TAJWEED_ERROR, WRONG_WORD, HESITATION, SKIPPED_AYAH, REPEATED_AYAH, OTHER |

---

## Key Relationships

```
User 1→1 StudentProfile / ModeratorProfile
User N→1 Role
Role N→M Permission (via RolePermission)
User N→M Permission (overrides via UserPermissionOverride)

Level 1→M Class
Class 1→M Group
Group N→M StudentProfile (via GroupStudent)
Group N→1 ModeratorProfile

Group 1→M WeeklySession
WeeklySession 1→M SessionStudent
SessionStudent 1→M ReviewRange

Assignment 1→1 QuranAssignment / TajweedAssignment / HomeworkAssignment
Assignment 1→M AssignmentMaterial
Assignment 1→M StudentAssignment
StudentAssignment 1→M ListeningConfirmation

StudentProfile 1→M StudentMemorizationPlan
StudentMemorizationPlan 1→M MemorizationReview
MemorizationReview 1→M ReviewTajweedScore
MemorizationReview 1→M ReviewMistake

ExamTemplate 1→M ExamQuestion
ExamTemplate 1→M ExamInstance
ExamInstance 1→M ExamSubmission
ExamSubmission 1→M ExamAnswer

StudentProfile 1→M StudentBadge
BadgeDefinition 1→M StudentBadge

StudentProfile 1→M SupportTicket
SupportTicket 1→M TicketReply
```
