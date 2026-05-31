# Services Layer Reference

## Overview

The services layer contains business logic separated from Server Actions. Services are pure TypeScript functions that interact with the database and implement domain-specific operations.

**Total**: 22 service files

---

## Key Patterns

### Audit Logging
All mutation services should create audit logs (fire-and-forget):

```typescript
createAuditLog({
  actorId: session.user.id,
  action: "entity.created",
  entityType: "EntityName",
  entityId: entity.id,
  metadata: { additionalContext: "value" },
}).catch(console.error);
```

### Fire-and-Forget Notifications
Notifications should not block the main operation:

```typescript
createNotification({
  recipientId: userId,
  type: "notification.type",
  title: "Title",
  body: "Body",
}).catch(console.error);
```

### Transaction Usage
Complex operations with multiple writes:

```typescript
await db.$transaction(async (tx) => {
  const review = await tx.memorizationReview.create({ ... });
  await tx.studentMemorizationPlan.update({ ... });
  return review;
});
```

---

## Analytics Services

**File**: `server/services/analytics.ts`

### getAdminKPIs()
Returns admin dashboard KPIs: total students, groups, sessions this week, pending applications.

### getAttendanceTrend(weeks = 8)
Returns attendance statistics by week for the last N weeks.

### getExamScoreDistribution()
Returns exam score distribution (groups of scores: 0-50, 51-75, 76-100).

### getMemorizationProgressByGroup()
Returns total reviews completed per group.

### getGroupComparison()
Returns comparative metrics for all groups (student count, sessions, avg attendance).

### getModeratorKPIs(userId)
Returns moderator dashboard KPIs: assigned groups, students, sessions this week.

### getStudentAttendanceGrid(userId, weeks = 8)
Returns student's attendance grid for the last N weeks.

### getSessionGradeTrend(userId, weeks = 8)
Returns student's session grades trend for the last N weeks.

### getStudentKPIs(studentProfileId)
Returns student dashboard KPIs: reviews this month, current streak, badges earned.

### getStudentGradeHistory(studentProfileId)
Returns student's grade history (all session grades).

### getStudentMemorizationProgress(studentProfileId)
Returns student's memorization progress (juz completed, surahs completed, total ayahs).

---

## Announcement Services

**File**: `server/services/announcement.ts`

### createAnnouncement(input, actorId)
Creates an announcement. Creates audit log.

### updateAnnouncement(input, actorId)
Updates an announcement. Creates audit log.

### deleteAnnouncement(announcementId, actorId)
Deletes an announcement. Creates audit log.

### listAnnouncements()
Lists all announcements (admin view).

### getActiveAnnouncementsForUser(userId)
Returns active, non-expired announcements visible to a user (global + targeted).

---

## Assignment Services

**File**: `server/services/assignment.ts`

### createAssignment(input, actorId)
Creates an assignment. Distributes to students based on targetType (GROUP, CLASS, LEVEL). Creates StudentAssignment records for each eligible student. Creates audit log and notifications.

### getModeratorAssignments(userId)
Returns assignments created by or visible to a moderator.

### getAdminAssignments()
Returns all assignments (admin view).

### getStudentAssignments(userId)
Returns assignments assigned to a student.

### getAssignmentDetail(assignmentId)
Returns full assignment details including type-specific data and materials.

### getStudentAssignmentDetail(studentAssignmentId)
Returns student's view of an assignment including completion status and confirmations.

### confirmListening(studentAssignmentId, userId)
Records a listening confirmation for an audio assignment. Updates status to IN_PROGRESS or COMPLETED based on requiredRepetitions.

### getStudentEligibility(userId)
Returns student's current eligibility info (group, level, class).

### deleteAssignment(assignmentId, actorId)
Soft-deletes an assignment (sets active = false). Creates audit log.

---

## Attendance Services

**File**: `server/services/attendance.ts`

### getSchoolAttendanceStats()
Returns school-wide attendance statistics.

### getGroupAttendanceStats(groupId)
Returns attendance statistics for a specific group.

### getStudentAttendanceStats(studentProfileId)
Returns attendance statistics for a specific student.

### getAttendanceByWeek(groupId?, startDate?, endDate?)
Returns weekly attendance breakdown.

### getAttendanceByMonth(groupId?, year?, month?)
Returns monthly attendance breakdown.

### getAttendanceGroupComparison()
Returns attendance comparison across all groups.

### getStudentAttendanceLog(studentProfileId, limit = 50)
Returns student's attendance log (recent sessions).

### getStudentsAtRisk(groupId?)
Returns students with attendance issues (consecutive absences or low attendance rate).

### getMostAbsentGroup()
Returns the group with the lowest attendance rate.

### getAlertConfig(groupId)
Returns attendance alert configuration (group-specific or global default).

### upsertAlertConfig(groupId, config, actorId)
Creates or updates attendance alert configuration. Creates audit log.

### checkAttendanceAlerts(sessionId)
Checks if any students in a session trigger attendance alerts. Sends notifications to moderators and/or admins if thresholds are exceeded.

---

## Audit Log Services

**File**: `server/services/audit-log.ts`

### createAuditLog(params)
Creates an audit log entry.

**Params**: { actorId, action, entityType, entityId, metadata? }

### getAuditLogs(params?)
Returns paginated audit logs with filtering.

**Params**: { page?, pageSize?, action? }

---

## Enrollment Services

**File**: `server/services/enrollment.ts`

### getEnrollmentState()
Returns current enrollment state from SystemSetting.

### setEnrollmentState(state, actorId)
Updates enrollment state. Creates audit log.

### registerStudent(input)
Registers a new student. Creates User, StudentProfile, and EnrollmentApplication. Throws error if email already exists.

### getPendingApplications()
Returns applications with PENDING_REVIEW status.

### getAllApplications(status?)
Returns all applications, optionally filtered by status.

### approveApplication(applicationId, actorId, reviewNote?)
Approves an application. Creates StudentProfile (if not exists), sets accountStatus to ACTIVE. Creates audit log and notification.

### rejectApplication(applicationId, actorId, reviewNote?)
Rejects an application. Creates audit log and notification.

### waitlistApplication(applicationId, actorId, reviewNote?)
Waitlists an application. Creates audit log and notification.

---

## Exam Services

**File**: `server/services/exam.ts`

### createTemplate(input, actorId)
Creates an exam template. Creates audit log.

### updateTemplate(input, actorId)
Updates an exam template. Creates audit log.

### getTemplate(templateId)
Returns exam template with all questions.

### listTemplates()
Returns all exam templates.

### addQuestion(input, actorId)
Adds a question to a template. Updates template's totalPoints. Creates audit log.

### deleteQuestion(questionId, templateId, actorId)
Deletes a question. Re-orders remaining questions. Updates template's totalPoints. Creates audit log.

### assignToGroups(input, actorId)
Creates exam instances for multiple groups. Creates audit log and notifications.

### changeInstanceStatus(input, actorId)
Changes exam instance status. Creates audit log.

### customizeInstance(instanceId, customizations, actorId)
Applies customizations to an exam instance. Creates audit log.

### getModeratorInstances(userId, filter?)
Returns exam instances for a moderator's groups.

### getInstanceDetail(instanceId)
Returns full exam instance details with template and questions.

### getAllInstances(filter?)
Returns all exam instances (admin view).

### getOrCreateSubmission(instanceId, studentProfileId)
Gets or creates an exam submission for a student.

### createRetakeSubmission(instanceId, studentProfileId)
Creates a new submission with incremented attemptNumber.

### getBestSubmission(instanceId, studentId)
Returns student's best submission (highest score).

### saveAnswers(submissionId, answers, actorId)
Saves student's answers. Auto-grades MCQ and TF questions. Sets status to SUBMITTED.

### getSubmissionForGrading(submissionId)
Returns submission with all answers for moderator grading.

### gradeSubmission(input, actorId)
Manually grades answers. Calculates totalScore and passed status. Sets status to GRADED. Creates audit log and notification.

### getStudentInstances(studentProfileId)
Returns exam instances for a student.

### duplicateTemplate(templateId, actorId)
Duplicates a template with all questions. Creates audit log.

---

## Feature Flag Services

**File**: `server/services/feature-flag.ts`

### getAllFeatureFlags()
Returns all feature flags.

### getEnabledFeatureFlags()
Returns a Set of enabled feature flag keys.

### isFeatureEnabled(key)
Checks if a specific feature flag is enabled.

### toggleFeatureFlag(key, enabled, actorId)
Enables or disables a feature flag. Creates audit log.

---

## Gamification Services

**File**: `server/services/gamification.ts`

### checkBadges(studentProfileId)
Checks all automatic badge triggers for a student. Awards badges if criteria met.

### awardBadge(studentProfileId, badgeId, actorId, note?)
Manually awards a badge to a student. Creates audit log and notification.

### revokeBadge(studentBadgeId, actorId)
Revokes a badge from a student. Creates audit log.

### getStudentBadges(studentProfileId)
Returns all badges earned by a student.

### getBadgeCatalog()
Returns all badge definitions grouped by category.

### getRecentBadges(studentProfileId, limit = 3)
Returns student's most recently earned badges.

### getGroupLeaderboard(groupId)
Returns group leaderboard (students ranked by total reviews and badges).

### getSchoolLeaderboard(limit = 10)
Returns school-wide leaderboard.

### getBadgesAwardedThisMonth()
Returns count of badges awarded this month (school-wide).

---

## Leave Request Services

**File**: `server/services/leave-request.ts`

### createLeaveRequest(input, studentProfileId, actorId)
Creates a leave request for an upcoming session. Creates audit log and notification to moderator.

### reviewLeaveRequest(input, actorId)
Reviews a leave request. If approved, creates/updates SessionStudent with EXCUSED_ABSENCE. Creates audit log and notification to student.

### getStudentLeaveRequests(studentProfileId)
Returns student's leave requests.

### getModeratorLeaveRequests(userId, statusFilter?)
Returns leave requests for a moderator's students.

### getAllLeaveRequests()
Returns all leave requests (admin view).

### getUpcomingSessionsForStudent(studentProfileId)
Returns upcoming sessions eligible for leave requests (SCHEDULED status, future dates).

---

## Memorization Plan Services

**File**: `server/services/memorization-plan.ts`

### createPlan(input, actorId)
Creates a memorization plan for a student in a group. Creates audit log.

### updatePlan(input, actorId)
Updates a memorization plan. Creates audit log.

### getPlanByStudent(studentId, groupId)
Returns a student's plan for a specific group.

### getPlansForGroup(groupId)
Returns all plans for a group.

### getPlansForModerator(userId)
Returns all plans for a moderator's groups.

### getStudentProgress(planId)
Returns detailed progress for a plan (total reviews, juz/surahs completed, streak).

### setNextOverride(input, actorId)
Sets a one-time override for the next review range. Creates audit log.

### clearNextOverride(planId, actorId)
Clears the next review override. Creates audit log.

---

## Memorization Plan Template Services

**File**: `server/services/memorization-plan-template.ts`

### listTemplates()
Returns all memorization plan templates.

### createTemplate(input, actorId)
Creates a template. Creates audit log.

### updateTemplate(input, actorId)
Updates a template. Creates audit log.

### deleteTemplate(id, actorId)
Deletes a template (only if no plans reference it). Creates audit log.

---

## Memorization Review Services

**File**: `server/services/memorization-review.ts`

### createReview(input, actorId)
Creates a memorization review. Updates plan's currentSurahId and currentAyahNumber. Creates tajweed scores and mistakes. Checks milestones and custom goals. Creates audit log and notification.

### getReviewsByPlan(planId)
Returns all reviews for a plan.

### getReviewDetail(reviewId)
Returns full review details with tajweed scores and mistakes.

### computeNextRange(startSurahId, startAyah, paceUnit, paceValue)
Computes the next review range based on pace settings. Returns { nextFromSurahNumber, nextFromAyah, nextToSurahNumber, nextToAyah }.

### computeNextRangeForPlan(planId)
Computes the next review range for a plan (considers override if set).

---

## Notification Services

**File**: `server/services/notification.ts`

### createNotification(params)
Creates an in-app notification.

**Params**: { recipientId, type, title, body? }

### getUnreadNotifications(userId)
Returns unread notifications for a user.

### markNotificationRead(notificationId)
Marks a notification as read.

### getUnreadCount(userId)
Returns count of unread notifications.

### getNotifications(userId, limit = 50)
Returns all notifications for a user (read and unread).

### markAllNotificationsRead(userId)
Marks all notifications as read for a user.

### createBulkNotifications(notifications[])
Creates multiple notifications in a single transaction.

---

## Organization Services

**File**: `server/services/organization.ts`

### getAllLevels()
Returns all levels ordered by sortOrder.

### createLevel(input, actorId)
Creates a level. Creates audit log.

### getClassesByLevel(levelId)
Returns classes for a specific level.

### getAllClasses()
Returns all classes.

### createClass(input, actorId)
Creates a class. Creates audit log.

### getAllModerators()
Returns all moderators with user details.

### getAllGroups()
Returns all groups with class and level details.

### createGroup(input, actorId)
Creates a group. Creates audit log.

### getModeratorGroups(userId)
Returns groups assigned to a moderator.

### getModeratorStudents(userId)
Returns students in a moderator's groups.

### assignStudentToGroup(studentId, groupId, actorId)
Assigns a student to a group. Creates audit log and notification.

---

## Progress Services

**File**: `server/services/progress.ts`

### checkMilestones(studentProfileId, planId)
Checks and creates milestones for a student (JUZ_COMPLETE, SURAH_COMPLETE, etc.). Creates notifications for new milestones.

### checkCustomGoals(planId)
Checks if custom goals are completed. Marks as completed and creates notifications.

### getStudentMilestones(studentProfileId, limit = 50)
Returns student's milestones.

### getReviewStreak(studentProfileId)
Returns student's current review streak (consecutive weeks with reviews).

### getStudentProgressSummary(studentProfileId)
Returns progress summary (reviews, juz, surahs, pages, streak, badges).

### getReviewsByMonth(studentProfileId)
Returns reviews grouped by month.

### getGroupProgressOverview(groupId)
Returns progress overview for all students in a group.

### getSchoolProgressStats()
Returns school-wide progress statistics.

### getTopPerformers(limit = 10)
Returns top performing students (by total reviews).

### getMilestonesByMonth()
Returns milestones achieved this month (school-wide).

### getGroupProgressComparison()
Returns progress comparison across all groups.

### createCustomGoal(input, actorId)
Creates a custom goal for a student plan. Creates audit log.

### getCustomGoals(planId)
Returns all custom goals for a plan.

### deleteCustomGoal(goalId, actorId)
Deletes a custom goal. Creates audit log.

---

## Push Notification Services

**File**: `server/services/push-notification.ts`

### subscribe(userId, subscription)
Saves a push notification subscription for a user.

**Params**: { endpoint, p256dh, auth }

### unsubscribe(endpoint)
Removes a subscription by endpoint.

### unsubscribeAll(userId)
Removes all subscriptions for a user.

### sendPush(userId, notification)
Sends a push notification to all subscriptions for a user.

**Params**: { title, body, url? }

### sendPushToMany(userIds[], notification)
Sends a push notification to multiple users.

### getVapidPublicKey()
Returns the VAPID public key from environment variable.

---

## Quran Services

**File**: `server/services/quran.ts`

### getSurahList()
Returns all 114 surahs.

### getAyahsBySurah(surahNumber)
Returns all ayahs for a specific surah.

### getAyahsByJuz(juzNumber)
Returns all ayahs in a juz (1-30).

### getAyahsByPage(pageNumber)
Returns all ayahs on a Mushaf page (1-604).

### getAyahsByHizb(hizbNumber)
Returns all ayahs in a hizb (1-60).

---

## Session Services

**File**: `server/services/session.ts`

### createSession(input, actorId)
Creates a weekly session. Automatically creates SessionStudent records for all students in the group. Creates audit log and notifications.

### getModeratorSessions(userId)
Returns sessions for a moderator's groups.

### getStudentSessions(userId)
Returns sessions for a student.

### getAdminSessions()
Returns all sessions (admin view).

### getSessionDetail(sessionId)
Returns full session details with students and grades.

### updateSessionStatus(sessionId, status, actorId)
Updates session status. Creates audit log.

### updateMeetingLink(sessionId, meetingLink, actorId)
Updates session meeting link. Creates audit log.

### gradeStudent(input, actorId)
Grades a student's session performance. Creates ReviewRange entries if provided. Checks attendance alerts. Creates audit log.

### getStudentGrades(userId)
Returns all grades for a student.

---

## Support Ticket Services

**File**: `server/services/support-ticket.ts`

### createTicket(studentProfileId, subject, body, actorId)
Creates a support ticket. Creates audit log and notification to support team.

### addReply(ticketId, authorId, body, actorId)
Adds a reply to a ticket. Creates audit log and notification.

### assignTicket(ticketId, assignedToId, actorId)
Assigns a ticket to a support staff member. Creates audit log and notification.

### changeTicketStatus(ticketId, status, actorId)
Changes ticket status. Creates audit log.

### escalateTicket(ticketId, actorId)
Escalates a ticket to admin. Creates audit log and notification.

### getStudentTickets(studentProfileId)
Returns all tickets created by a student.

### getTicketWithReplies(ticketId)
Returns ticket with all replies.

### getAssignedTickets(userId, statusFilter?)
Returns tickets assigned to a support staff member.

### getAllTickets(statusFilter?)
Returns all tickets (admin view).

---

## Tajweed Category Services

**File**: `server/services/tajweed-category.ts`

### listTajweedCategories(includeInactive = false)
Returns tajweed categories ordered by sortOrder.

### createTajweedCategory(input, actorId)
Creates a tajweed category. Creates audit log.

### updateTajweedCategory(id, input, actorId)
Updates a tajweed category. Creates audit log.

### toggleTajweedCategoryActive(id, active, actorId)
Activates or deactivates a tajweed category. Creates audit log.

---

## User Services

**File**: `server/services/user.ts`

### getAllUsers()
Returns all users with role and profile information.

### createModerator(input, actorId)
Creates a moderator user with ModeratorProfile. Creates audit log.

### promoteToModerator(userId, actorId)
Promotes a student to moderator. Changes role, creates ModeratorProfile. Creates audit log and notification.

### updateAccountStatus(userId, accountStatus, actorId)
Updates user account status. Creates audit log.

---

## Common Service Utilities

### Database Client
All services import the Prisma client from `server/db/client.ts`:

```typescript
import { db } from "@/server/db/client";
```

### Error Handling
Services throw errors for invalid inputs:

```typescript
if (!entity) {
  throw new Error("Entity not found");
}
```

Server Actions catch these errors and return `{ error: "errorKey" }`.

### Pagination
Services that return lists support pagination:

```typescript
{
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}
```

### Filtering
Services support filtering via optional parameters:

```typescript
async function getSessions(filter?: "active" | "all") {
  const where = filter === "active" ? { status: "SCHEDULED" } : undefined;
  return db.weeklySession.findMany({ where });
}
```
