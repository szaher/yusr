# Phase 6: Leave Requests, Announcements & Notifications — Design Spec

## Overview

Phase 6 adds three interconnected features to Yusr Academy:

1. **Leave Requests** — students request excused absence from specific weekly sessions; moderators approve/reject
2. **Announcements** — admin creates targeted announcements visible on dashboards
3. **Notifications** — in-app notification system with header bell icon, dropdown, and dedicated history page

These features share a notification layer: leave request state changes and new announcements generate in-app notifications delivered to relevant users.

## Existing State

| Feature | Model | Service | Actions | Pages | Feature Flag | Permissions |
|---------|-------|---------|---------|-------|--------------|-------------|
| Leave Requests | No | No | No | No | `leave_requests` (enabled) | `leave_requests.review` (moderator) |
| Announcements | Yes (schema only) | No | No | No | `announcements` (enabled) | `announcements.create` (admin) |
| Notifications | Yes | Yes (basic) | No | No | None | `notifications.send` (admin) |

---

## 1. Data Model

### New Enum: LeaveRequestStatus

```
PENDING
APPROVED
REJECTED
```

### New Model: LeaveRequest

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| studentId | String | FK → StudentProfile |
| sessionId | String | FK → WeeklySession |
| reason | String | Required text |
| status | LeaveRequestStatus | Default: PENDING |
| reviewedById | String? | FK → User (moderator) |
| reviewNote | String? | Optional moderator note |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:**
- `@@unique([studentId, sessionId])` — one request per student per session
- `@@index([studentId])`, `@@index([sessionId])`, `@@index([status])`

**Relations:**
- `student StudentProfile @relation(fields: [studentId], references: [id])`
- `session WeeklySession @relation(fields: [sessionId], references: [id])`
- `reviewedBy User? @relation("leaveReviewer", fields: [reviewedById], references: [id])`

**Reverse relations to add:**
- `StudentProfile.leaveRequests LeaveRequest[]`
- `WeeklySession.leaveRequests LeaveRequest[]`
- `User.reviewedLeaveRequests LeaveRequest[] @relation("leaveReviewer")`

### Existing Model Changes: Announcement

Add a relation for `createdById` (currently a bare string):

```prisma
createdBy User @relation("announcementCreator", fields: [createdById], references: [id])
```

Add reverse relation on User:
```prisma
createdAnnouncements Announcement[] @relation("announcementCreator")
```

### Existing Model: Notification (no schema changes)

`type` field values used in this phase:
- `LEAVE_SUBMITTED` — moderator notification when student submits
- `LEAVE_APPROVED` — student notification on approval
- `LEAVE_REJECTED` — student notification on rejection
- `ANNOUNCEMENT` — notification for new announcement

---

## 2. Leave Requests

### Student Flow

**Page:** `/student/leave-requests`

- Table showing student's leave request history: session date, group name, reason, status (badge), submitted date
- "Request Leave" form above/beside the table:
  - Dropdown of upcoming sessions (SCHEDULED or OPEN status) from the student's groups
  - Reason textarea (required)
  - Submit button
- One pending/approved request per session enforced by unique constraint
- Feature-flagged behind `leave_requests`

### Moderator Flow

**Page:** `/moderator/leave-requests`

- Table of leave requests from students in the moderator's groups
- Default filter: pending requests only; toggle to show all
- Each row: student name, group name, session date, reason, submitted date, status
- Approve/reject actions per row:
  - Approve button → optional review note → sets status to APPROVED
  - Reject button → optional review note → sets status to REJECTED
- Feature-flagged behind `leave_requests`
- Permission: `leave_requests.review`

### Auto-Excuse on Approval

When a moderator approves a leave request:
1. Set `LeaveRequest.status = APPROVED`
2. Find or create the `SessionStudent` record for that student + session
3. Set `SessionStudent.attendance = EXCUSED_ABSENCE`
4. Create notification for the student

This is done transactionally in the approve action.

### Notification Triggers

| Event | Recipient | Type | Title |
|-------|-----------|------|-------|
| Student submits leave request | Group moderator | `LEAVE_SUBMITTED` | "Student [name] requested leave for [date]" |
| Moderator approves | Student | `LEAVE_APPROVED` | "Your leave request for [date] has been approved" |
| Moderator rejects | Student | `LEAVE_REJECTED` | "Your leave request for [date] has been rejected" |

---

## 3. Announcements

### Admin Flow

**Page:** `/admin/announcements`

- Table listing all announcements: title, target, priority (badge), publish date, expiry, actions
- Create form (inline or modal):
  - Title (required)
  - Body (textarea, required)
  - Priority: `normal` | `high` | `urgent` (select)
  - Target type: `ALL` | `ROLE` | `GROUP` (select)
  - Target ID: conditional — role name dropdown (when ROLE) or group dropdown (when GROUP), hidden when ALL
  - Publish date (defaults to now)
  - Expiry date (optional)
- Edit existing announcements (same form, pre-filled)
- Delete announcement (with confirmation)
- Feature-flagged behind `announcements`
- Permission: `announcements.create`

### Display on Dashboards

Each role's dashboard page shows active announcements matching the user:

- Active = `publishDate <= now` AND (`expiryDate IS NULL` OR `expiryDate > now`)
- Matching = `targetType IS NULL/ALL` OR `(targetType = ROLE AND targetId = user's role)` OR `(targetType = GROUP AND targetId IN user's groups)`
- Displayed as a card/banner section at the top of the dashboard
- Priority `high`/`urgent` gets a colored left border (amber/red)
- Most recent first, max 5 shown

### Notification Trigger

When an announcement is created:
- Resolve all target users based on targetType/targetId
- Create bulk notifications with type `ANNOUNCEMENT` and the announcement title
- For `ALL`: all users with `accountStatus = ACTIVE`
- For `ROLE`: all active users with that role name
- For `GROUP`: all students in that group (via GroupStudent → StudentProfile → User) + the group's moderator (via Group.moderator → ModeratorProfile → User)

---

## 4. Notification System

### Header Bell Icon

**Location:** `components/layout/header.tsx`

- Bell icon (from lucide-react) with unread count badge (red circle)
- Server component: queries `getUnreadCount(userId)` on page load
- Clicking opens a dropdown (client component) showing 10 most recent notifications
- Each notification: type icon, title, relative time ("2h ago"), read/unread styling
- "Mark all as read" button at top of dropdown
- "View all" link at bottom → navigates to `/${locale}/${role}/notifications`

### Dedicated Notifications Page

**Pages:** `/${role}/notifications` for all four roles (student, moderator, admin, support)

- Full list of all notifications for the user, newest first
- Each row: type icon, title, body (if present), timestamp, read/unread indicator
- Click a notification to mark it as read
- "Mark all as read" bulk action button
- No pagination needed initially (notifications are lightweight; latest 50 is sufficient)

### Notification Service Updates

Add to existing `server/services/notification.ts`:

- `getNotifications(userId: string, limit?: number)` — get all notifications (read + unread), ordered by createdAt desc, default limit 50
- `markAllNotificationsRead(userId: string)` — update all unread for user to read=true
- `createBulkNotifications(recipientIds: string[], type: string, title: string, body?: string)` — create notification records for multiple recipients

### Server Actions

New file `server/actions/notification.ts`:
- `markNotificationReadAction(formData)` — marks a single notification as read
- `markAllNotificationsReadAction(formData)` — marks all notifications as read for the current user

### Architecture: Inline Notification Calls

Notifications are created inline within the server actions that trigger them:

```
approveLeaveRequestAction:
  1. Update LeaveRequest status
  2. Update SessionStudent attendance
  3. createNotification({ recipientId: student.userId, type: "LEAVE_APPROVED", ... })
  4. createAuditLog(...)

createAnnouncementAction:
  1. Create Announcement record
  2. Resolve target user IDs
  3. createBulkNotifications(userIds, "ANNOUNCEMENT", title)
  4. createAuditLog(...)
```

No event bus, no dispatcher — direct calls. Appropriate for 3 triggers.

---

## 5. Permissions & Feature Flags

### Permissions (all pre-existing)

| Permission | Role | Usage |
|------------|------|-------|
| `leave_requests.review` | Moderator | Approve/reject leave requests |
| `announcements.create` | Admin | Create/edit/delete announcements |
| `notifications.send` | Admin | Not used this phase (reserved for future manual notification sending) |

No new permissions needed. Students create their own leave requests authenticated as approved users.

### Feature Flags (all pre-existing)

| Flag | State | Gates |
|------|-------|-------|
| `leave_requests` | Enabled | Leave request pages and actions |
| `announcements` | Enabled | Announcement pages and actions |

Notifications have no feature flag — they are always active as the delivery mechanism.

---

## 6. Sidebar & Navigation

| Role | New Nav Items |
|------|---------------|
| Student | "Leave Requests" → `/student/leave-requests` |
| Moderator | "Leave Requests" → `/moderator/leave-requests` |
| Admin | "Announcements" → `/admin/announcements` |

Notifications page is accessed via the bell icon dropdown "View all" link, not via sidebar.

---

## 7. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `server/services/leave-request.ts` | Leave request CRUD + approval logic |
| `server/services/announcement.ts` | Announcement CRUD + target resolution |
| `server/actions/leave-request.ts` | Leave request server actions |
| `server/actions/announcement.ts` | Announcement server actions |
| `server/actions/notification.ts` | Mark read/mark all read actions |
| `lib/validations/leave-request.ts` | Zod schemas for leave request |
| `lib/validations/announcement.ts` | Zod schemas for announcement |
| `components/layout/notification-bell.tsx` | Bell icon + dropdown client component |
| `app/[locale]/(dashboard)/student/leave-requests/page.tsx` | Student leave requests page |
| `app/[locale]/(dashboard)/moderator/leave-requests/page.tsx` | Moderator leave requests page |
| `app/[locale]/(dashboard)/admin/announcements/page.tsx` | Admin announcements page |
| `app/[locale]/(dashboard)/student/notifications/page.tsx` | Student notifications page |
| `app/[locale]/(dashboard)/moderator/notifications/page.tsx` | Moderator notifications page |
| `app/[locale]/(dashboard)/admin/notifications/page.tsx` | Admin notifications page |
| `app/[locale]/(dashboard)/support/notifications/page.tsx` | Support notifications page |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add LeaveRequest model, LeaveRequestStatus enum, Announcement relation, reverse relations |
| `server/services/notification.ts` | Add getNotifications, markAllNotificationsRead, createBulkNotifications |
| `components/layout/header.tsx` | Add notification bell component |
| `components/layout/sidebar.tsx` | Add leave requests + announcements nav items |
| `messages/en.json` | Add leaveRequests, announcements, notifications i18n keys |
| `messages/ar.json` | Add leaveRequests, announcements, notifications i18n keys |
| `app/[locale]/(dashboard)/admin/dashboard/page.tsx` | Add active announcements banner |
| `app/[locale]/(dashboard)/moderator/dashboard/page.tsx` | Add active announcements banner |
| `app/[locale]/(dashboard)/student/dashboard/page.tsx` | Add active announcements banner |
| `app/[locale]/(dashboard)/support/dashboard/page.tsx` | Add active announcements banner |

---

## 8. Deferred to Phase 6.1

- **Email notification delivery** — the `email_notifications` flag exists but email infrastructure is out of scope
- **Notification preferences** — user-level opt-in/opt-out per notification type
- **Announcement rich text editor** — body is plain textarea; a markdown or WYSIWYG editor could be added later
- **Leave request calendar view** — visual calendar showing approved leaves for a group
- **Push notifications** — browser push or mobile notifications
