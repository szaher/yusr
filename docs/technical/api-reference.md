---
title: API Reference
parent: Technical Documentation
nav_order: 4
---

# API Reference - Server Actions

## Overview

Yusr uses **Server Actions** instead of REST APIs for all mutations. Server Actions are

 TypeScript functions marked with `"use server"` that run on the server and can be called directly from Client Components.

**Total**: 60+ Server Actions across 17 files

---

## Pattern

All Server Actions follow this pattern:

```typescript
"use server";

export async function actionName(formData: FormData) {
  // 1. Authentication & authorization
  const session = await requirePermission(PERMISSIONS.SOME_PERMISSION);
  
  // 2. Input validation (Zod schema)
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "validationError" };
  }
  
  // 3. Business logic (via service layer)
  const result = await serviceFunction(parsed.data, session.user.id);
  
  // 4. Side effects (fire-and-forget)
  createAuditLog(...).catch(console.error);
  sendNotification(...).catch(console.error);
  
  // 5. Cache invalidation
  revalidatePath("/path");
  
  // 6. Return result or redirect
  return { success: true, data: result };
}
```

---

## Auth Actions

**File**: `server/actions/auth.ts`

### loginAction()
**Params**: FormData { email, password }  
**Returns**: `{ error?: string }` or redirects  
**Permissions**: None (public)  
**Description**: Authenticates user and redirects to role-specific dashboard.

### logoutAction()
**Params**: None  
**Returns**: Redirects to `/ar/login`  
**Permissions**: None  
**Description**: Signs out user and clears session.

### registerAction()
**Params**: FormData { name, email, password, confirmPassword, phone?, country?, ... }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (public)  
**Validation**: `registerSchema` from `lib/validations/auth.ts`  
**Description**: Registers a new student. Creates User, StudentProfile, and EnrollmentApplication with PENDING_REVIEW status.

### forgotPasswordAction()
**Params**: FormData { email }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (public)  
**Validation**: `forgotPasswordSchema`  
**Description**: Generates password reset token and logs reset link (email not wired yet). Always returns success to prevent email enumeration.

---

## Enrollment Actions

**File**: `server/actions/enrollment.ts`

### reviewApplicationAction()
**Params**: FormData { applicationId, action ("approve" | "reject" | "waitlist"), reviewNote? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `users.approve`  
**Validation**: `reviewApplicationSchema`  
**Description**: Reviews enrollment application. If approved, creates StudentProfile and sets accountStatus to ACTIVE.

### updateEnrollmentStateAction()
**Params**: FormData { state }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `system_settings.update`  
**Validation**: `updateEnrollmentStateSchema`  
**Description**: Updates global enrollment state (open, closed, paused, waitlist_only).

---

## Organization Actions

**File**: `server/actions/organization.ts`

### createLevelAction()
**Params**: FormData { nameAr, nameEn?, description?, sortOrder }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `levels.create`  
**Validation**: `createLevelSchema`  
**Description**: Creates a new organizational level.

### createClassAction()
**Params**: FormData { name, levelId, defaultDay?, sessionTime?, capacity?, ... }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `classes.create`  
**Validation**: `createClassSchema`  
**Description**: Creates a new class within a level.

### createGroupAction()
**Params**: FormData { name, classId, moderatorId?, weeklyDay?, weeklyTime?, ... }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `groups.create`  
**Validation**: `createGroupSchema`  
**Description**: Creates a new student group within a class.

### assignStudentToGroupAction()
**Params**: FormData { studentId, groupId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `students.assign_group`  
**Validation**: `assignStudentSchema`  
**Description**: Assigns a student to a group.

---

## Session Actions

**File**: `server/actions/session.ts`

### createSessionAction()
**Params**: FormData { groupId, date, startTime?, endTime?, meetingLink? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `sessions.create`  
**Validation**: `createSessionSchema`  
**Description**: Creates a new weekly session for a group.

### updateSessionStatusAction()
**Params**: FormData { sessionId, status }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `sessions.start` or `sessions.grade`  
**Validation**: `updateSessionStatusSchema`  
**Description**: Updates session status (OPEN, IN_PROGRESS, COMPLETED, CANCELLED).

### updateMeetingLinkAction()
**Params**: FormData { sessionId, meetingLink }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `sessions.start`  
**Validation**: `updateMeetingLinkSchema`  
**Description**: Updates meeting link for a session.

### gradeStudentAction()
**Params**: FormData { sessionStudentId, attendance, recitationResult?, numericGrade?, mistakeCount?, tajweedNotes?, memorizationNotes?, fluencyNotes?, comment?, voiceNoteUrl?, reviewRanges? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `sessions.grade`  
**Validation**: `gradeStudentSchema`  
**Description**: Grades a student's session performance. Creates ReviewRange entries if provided.

---

## Assignment Actions

**File**: `server/actions/assignment.ts`

### createAssignmentAction()
**Params**: FormData (complex, depends on type: QURAN_MEMORIZATION, QURAN_REVISION, TAJWEED, HOMEWORK)  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `assignments.create`  
**Validation**: `createAssignmentSchema`  
**Description**: Creates an assignment for a GROUP, CLASS, or LEVEL. Automatically distributes to students based on targetType.

### confirmListeningAction()
**Params**: FormData { studentAssignmentId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (student action)  
**Validation**: `confirmListeningSchema`  
**Description**: Student confirms listening to an audio assignment. Creates ListeningConfirmation record.

### deleteAssignmentAction()
**Params**: FormData { assignmentId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `assignments.update`  
**Validation**: `deleteAssignmentSchema`  
**Description**: Soft-deletes an assignment (sets active = false).

---

## Memorization Actions

**File**: `server/actions/memorization.ts`

### createPlanAction()
**Params**: FormData { studentId, groupId, currentSurahId, currentAyahNumber, paceUnit, paceValue, templateId? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `createPlanSchema`  
**Description**: Creates a memorization plan for a student in a group.

### updatePlanAction()
**Params**: FormData { planId, currentSurahId?, currentAyahNumber?, paceUnit?, paceValue?, ... }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `updatePlanSchema`  
**Description**: Updates an existing memorization plan.

### createReviewAction()
**Params**: FormData { planId, sessionId?, fromSurahNumber, fromAyah, toSurahNumber, toAyah, recitationResult, grade, notes?, voiceNoteUrl?, tajweedScores?, mistakes?, nextFromSurahNumber, nextFromAyah, nextToSurahNumber, nextToAyah }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.review`  
**Validation**: `createReviewSchema`  
**Description**: Records a memorization review. Updates plan's currentSurahId and currentAyahNumber to "next" values. Creates tajweed scores and mistakes if provided. Checks milestones and custom goals.

### createTajweedCategoryAction()
**Params**: FormData { nameEn, nameAr, isCore?, sortOrder? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `tajweed_categories.manage`  
**Validation**: `createTajweedCategorySchema`  
**Description**: Creates a new tajweed evaluation category.

### updateTajweedCategoryAction()
**Params**: FormData { categoryId, nameEn?, nameAr?, sortOrder? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `tajweed_categories.manage`  
**Validation**: `updateTajweedCategorySchema`  
**Description**: Updates a tajweed category.

### toggleTajweedCategoryAction()
**Params**: FormData { categoryId, active }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `tajweed_categories.manage`  
**Validation**: `toggleTajweedCategorySchema`  
**Description**: Activates or deactivates a tajweed category.

### updateGroupCadenceAction()
**Params**: FormData { groupId, meetingCadence, customCadenceDays?, memorizationPlansEnabled }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `groups.update`  
**Validation**: `updateGroupCadenceSchema`  
**Description**: Updates group's meeting cadence and enables/disables memorization plans.

### createTemplateAction() (Memorization Plan Template)
**Params**: FormData { name, nameAr, paceUnit, paceValue, description?, isDefault? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `createTemplateSchema`  
**Description**: Creates a reusable memorization plan template.

### updateTemplateAction() (Memorization Plan Template)
**Params**: FormData { templateId, name?, nameAr?, paceUnit?, paceValue?, description?, isDefault? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `updateTemplateSchema`  
**Description**: Updates a memorization plan template.

### deleteTemplateAction() (Memorization Plan Template)
**Params**: FormData { templateId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `deleteTemplateSchema`  
**Description**: Deletes a memorization plan template (only if no plans reference it).

### setOverrideAction()
**Params**: FormData { planId, fromSurahNumber, fromAyah, toSurahNumber, toAyah }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `setOverrideSchema`  
**Description**: Sets a one-time override for the next review range.

### clearOverrideAction()
**Params**: FormData { planId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `clearOverrideSchema`  
**Description**: Clears the next review override.

---

## Exam Actions

**File**: `server/actions/exam.ts`

### createTemplateAction() (Exam Template)
**Params**: FormData { title, description?, passingScore }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `createTemplateSchema`  
**Description**: Creates a new exam template.

### updateTemplateAction() (Exam Template)
**Params**: FormData { templateId, title?, description?, passingScore? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `updateTemplateSchema`  
**Description**: Updates an exam template.

### addQuestionAction()
**Params**: FormData { templateId, type, text, points, options?, correctAnswer?, tags?, fromSurahNumber?, fromAyah?, toSurahNumber?, toAyah? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `addQuestionSchema`  
**Description**: Adds a question to an exam template.

### deleteQuestionAction()
**Params**: FormData { questionId, templateId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `deleteQuestionSchema`  
**Description**: Deletes a question from an exam template.

### assignToGroupsAction()
**Params**: FormData { templateId, groupIds[], startDate, endDate, timeLimitMinutes?, shuffleQuestions?, maxAttempts? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `assignToGroupsSchema`  
**Description**: Creates exam instances for multiple groups.

### changeInstanceStatusAction()
**Params**: FormData { instanceId, status }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `changeInstanceStatusSchema`  
**Description**: Changes exam instance status (DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED).

### customizeInstanceAction()
**Params**: FormData { instanceId, customizations (JSON string) }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `customizeInstanceSchema`  
**Description**: Applies customizations to an exam instance (e.g., question pool, custom instructions).

### saveAnswersAction()
**Params**: FormData { submissionId, answers (JSON string) }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (student action)  
**Validation**: `saveAnswersSchema`  
**Description**: Saves student's exam answers (auto-graded for MCQ/TF, pending for RECITATION/SHORT_ANSWER).

### gradeSubmissionAction()
**Params**: FormData { submissionId, answers[] { answerId, score, isCorrect?, moderatorNotes?, recitationResult?, tajweedNotes?, fluencyNotes? } }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.grade`  
**Validation**: `gradeSubmissionSchema`  
**Description**: Manually grades a submission (for RECITATION and SHORT_ANSWER questions).

### duplicateTemplateAction()
**Params**: FormData { templateId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `duplicateTemplateSchema`  
**Description**: Duplicates an exam template with all questions.

### createRetakeAction()
**Params**: FormData { instanceId, studentId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `exams.create`  
**Validation**: `createRetakeSchema`  
**Description**: Creates a retake submission for a student (increments attemptNumber).

---

## Leave Request Actions

**File**: `server/actions/leave-request.ts`

### createLeaveRequestAction()
**Params**: FormData { sessionId, reason }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (student action)  
**Validation**: `createLeaveRequestSchema`  
**Description**: Student requests leave for an upcoming session.

### reviewLeaveRequestAction()
**Params**: FormData { leaveRequestId, status ("approve" | "reject"), reviewNote? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `leave_requests.review`  
**Validation**: `reviewLeaveRequestSchema`  
**Description**: Moderator/admin reviews leave request. If approved, sets attendance to EXCUSED_ABSENCE.

---

## Announcement Actions

**File**: `server/actions/announcement.ts`

### createAnnouncementAction()
**Params**: FormData { title, body, priority?, targetType?, targetId?, expiryDate? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `announcements.create`  
**Validation**: `createAnnouncementSchema`  
**Description**: Creates a system announcement (global or targeted to GROUP/CLASS/LEVEL).

### updateAnnouncementAction()
**Params**: FormData { announcementId, title?, body?, priority?, expiryDate? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `announcements.create`  
**Validation**: `updateAnnouncementSchema`  
**Description**: Updates an announcement.

### deleteAnnouncementAction()
**Params**: FormData { announcementId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `announcements.create`  
**Validation**: `deleteAnnouncementSchema`  
**Description**: Deletes an announcement.

---

## Support Ticket Actions

**File**: `server/actions/support-ticket.ts`

### createTicketAction()
**Params**: FormData { subject, body }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (student action)  
**Validation**: `createTicketSchema`  
**Description**: Student creates a support ticket.

### addReplyAction()
**Params**: FormData { ticketId, body }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `support_tickets.reply` (or ticket owner)  
**Validation**: `addReplySchema`  
**Description**: Adds a reply to a support ticket.

### assignTicketAction()
**Params**: FormData { ticketId, assignedToId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `support_tickets.view_all`  
**Validation**: `assignTicketSchema`  
**Description**: Assigns a ticket to a support staff member.

### changeTicketStatusAction()
**Params**: FormData { ticketId, status }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `support_tickets.reply`  
**Validation**: `changeTicketStatusSchema`  
**Description**: Changes ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).

### escalateTicketAction()
**Params**: FormData { ticketId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `support_tickets.escalate`  
**Validation**: `escalateTicketSchema`  
**Description**: Escalates a ticket to admin.

---

## Notification Actions

**File**: `server/actions/notification.ts`

### markNotificationReadAction()
**Params**: FormData { notificationId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (user action on their own notification)  
**Validation**: `markNotificationReadSchema`  
**Description**: Marks a notification as read.

### markAllNotificationsReadAction()
**Params**: None  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (user action)  
**Description**: Marks all notifications as read for the current user.

---

## Attendance Actions

**File**: `server/actions/attendance.ts`

### markQuickAttendanceAction()
**Params**: FormData { sessionId, attendanceData (JSON: { studentId: string, status: AttendanceStatus }[]) }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `sessions.grade`  
**Validation**: `markQuickAttendanceSchema`  
**Description**: Bulk-updates attendance for all students in a session.

### updateAlertConfigAction()
**Params**: FormData { groupId?, consecutiveAbsenceThreshold, attendanceRateThreshold, notifyModerator, notifyAdmin }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `system_settings.update`  
**Validation**: `updateAlertConfigSchema`  
**Description**: Updates attendance alert thresholds (global or per-group).

---

## Admin Actions

**File**: `server/actions/admin.ts`

### toggleFeatureFlagAction()
**Params**: FormData { key, enabled }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `feature_flags.update`  
**Validation**: `toggleFeatureFlagSchema`  
**Description**: Enables or disables a feature flag.

### updateSystemSettingAction()
**Params**: FormData { key, value }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `system_settings.update`  
**Validation**: `updateSystemSettingSchema`  
**Description**: Updates a system setting.

---

## User Actions

**File**: `server/actions/user.ts`

### createModeratorAction()
**Params**: FormData { name, nameAr?, email, password }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `moderators.assign`  
**Validation**: `createModeratorSchema`  
**Description**: Creates a new moderator user with profile.

### promoteToModeratorAction()
**Params**: FormData { userId }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `moderators.assign`  
**Validation**: `promoteToModeratorSchema`  
**Description**: Promotes an existing student to moderator.

### updateAccountStatusAction()
**Params**: FormData { userId, accountStatus }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `users.ban` or `users.deactivate`  
**Validation**: `updateAccountStatusSchema`  
**Description**: Updates user account status (ACTIVE, DEACTIVATED, BANNED, EXPELLED).

---

## Student Actions

**File**: `server/actions/student.ts`

### updateStudentProfileAction()
**Params**: FormData { phone?, country?, timezone?, currentQuranLevel?, currentTajweedLevel?, previousBackground?, parentContact?, preferredDay?, availabilityNotes? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: None (student updates own profile)  
**Validation**: `updateStudentProfileSchema`  
**Description**: Student updates their own profile.

---

## Progress Actions

**File**: `server/actions/progress.ts`

### createCustomGoalAction()
**Params**: FormData { planId, targetSurahNumber, targetAyahNumber, deadline?, title }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Validation**: `createCustomGoalSchema`  
**Description**: Creates a custom memorization goal for a student plan.

### deleteCustomGoalAction()
**Params**: goalId (string)  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Description**: Deletes a custom goal.

---

## Gamification Actions

**File**: `server/actions/gamification.ts`

### awardBadgeAction()
**Params**: FormData { studentId, badgeId, note? }  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage` (manual badge award)  
**Validation**: `awardBadgeSchema`  
**Description**: Manually awards a badge to a student.

### revokeBadgeAction()
**Params**: studentBadgeId (string)  
**Returns**: `{ error?: string, success?: boolean }`  
**Permissions**: `memorization.manage`  
**Description**: Revokes a badge from a student.

---

## Validation Schemas

All validation schemas are located in `lib/validations/*.ts`:

- `lib/validations/auth.ts` - loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema
- `lib/validations/enrollment.ts` - reviewApplicationSchema, updateEnrollmentStateSchema
- `lib/validations/organization.ts` - createLevelSchema, createClassSchema, createGroupSchema, assignStudentSchema
- `lib/validations/session.ts` - createSessionSchema, updateSessionStatusSchema, gradeStudentSchema
- `lib/validations/assignment.ts` - createAssignmentSchema, confirmListeningSchema
- `lib/validations/memorization.ts` - createPlanSchema, updatePlanSchema, createReviewSchema, createTajweedCategorySchema, etc.
- `lib/validations/exam.ts` - createTemplateSchema, addQuestionSchema, assignToGroupsSchema, etc.
- `lib/validations/leave-request.ts` - createLeaveRequestSchema, reviewLeaveRequestSchema
- `lib/validations/announcement.ts` - createAnnouncementSchema, updateAnnouncementSchema
- `lib/validations/support-ticket.ts` - createTicketSchema, addReplySchema, etc.
- `lib/validations/admin.ts` - toggleFeatureFlagSchema, updateSystemSettingSchema
- `lib/validations/user.ts` - createModeratorSchema, updateAccountStatusSchema
- `lib/validations/student.ts` - updateStudentProfileSchema
- `lib/validations/progress.ts` - createCustomGoalSchema
- `lib/validations/gamification.ts` - awardBadgeSchema
- `lib/validations/attendance.ts` - markQuickAttendanceSchema, updateAlertConfigSchema

---

## Usage Example

```typescript
// In a Client Component
"use client";

import { createGroupAction } from "@/server/actions/organization";
import { useActionState } from "react";

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(createGroupAction, null);
  
  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="classId" required />
      <button disabled={isPending}>Create</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```
