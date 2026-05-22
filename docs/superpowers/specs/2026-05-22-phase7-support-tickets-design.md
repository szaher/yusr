# Phase 7: Support Tickets — Design Spec

## Overview

Phase 7 adds a support ticket system to Yusr Academy. Students create tickets describing issues; admin assigns tickets to support staff; support staff replies, resolves, and can escalate to admin. A reply thread model enables back-and-forth conversation on each ticket.

## Existing State

| Component | Status |
|-----------|--------|
| Prisma model | None — must be created |
| Permissions | 4 exist: `view_assigned`, `view_all`, `reply`, `escalate` |
| Feature flag | `support_tickets` exists (disabled) |
| Routes | Stub at `/support/tickets` ("Coming soon") |
| Sidebar | Support role has "Tickets" nav item |

---

## 1. Data Model

### New Enum: TicketStatus

```
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

### New Model: SupportTicket

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| subject | String | Free-text, required |
| body | String | Initial description |
| status | TicketStatus | Default: OPEN |
| escalated | Boolean | Default: false |
| studentId | String | FK → StudentProfile |
| assignedToId | String? | FK → User (support staff) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:** `@@index([studentId])`, `@@index([assignedToId])`, `@@index([status])`

**Relations:**
- `student StudentProfile @relation(fields: [studentId], references: [id])`
- `assignedTo User? @relation("ticketAssignee", fields: [assignedToId], references: [id])`

### New Model: TicketReply

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| ticketId | String | FK → SupportTicket |
| authorId | String | FK → User |
| body | String | Reply text |
| createdAt | DateTime | |

**Constraints:** `@@index([ticketId])`

**Relations:**
- `ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)`
- `author User @relation("ticketReplyAuthor", fields: [authorId], references: [id])`

### Reverse Relations on Existing Models

- `StudentProfile.supportTickets SupportTicket[]`
- `User.assignedTickets SupportTicket[] @relation("ticketAssignee")`
- `User.ticketReplies TicketReply[] @relation("ticketReplyAuthor")`

---

## 2. Student Flow

### Page: `/student/tickets` (list + create form)

- "Create Ticket" form at the top: subject input + body textarea + submit button
- Below: table of the student's tickets showing subject, status (badge), created date, last updated
- Clicking a row links to the detail page
- Feature-flagged behind `support_tickets`

### Page: `/student/tickets/[ticketId]` (detail + reply thread)

- Header with subject, status badge, created date
- Thread of replies in chronological order — each shows author name, timestamp, body
- The student's initial body is displayed as the first "message" in the thread (not stored as a TicketReply, just rendered from `SupportTicket.body`)
- Reply form at the bottom: textarea + submit button
- Student can only reply while ticket is OPEN or IN_PROGRESS. When RESOLVED or CLOSED, the reply form is hidden and the thread is read-only
- Access guard: student can only view their own tickets (checked via `studentId`)

---

## 3. Support Flow

### Page: `/support/tickets` (assigned tickets list)

- Table of tickets assigned to this support user: subject, student name, status (badge), escalated flag, created date, last updated
- Default filter: open/in-progress tickets. Toggle to show all (including resolved/closed)
- Permission: `support_tickets.view_assigned`
- Feature-flagged behind `support_tickets`

### Page: `/support/tickets/[ticketId]` (detail + reply thread + actions)

- Same thread view as student detail page
- Reply form at the bottom (permission: `support_tickets.reply`). Can reply while OPEN, IN_PROGRESS, or RESOLVED (not CLOSED)
- Action buttons:
  - **Start** — changes OPEN → IN_PROGRESS
  - **Resolve** — changes IN_PROGRESS → RESOLVED
  - **Escalate** — sets `escalated = true`, creates notification for all admin users (permission: `support_tickets.escalate`)
- Access guard: support user can only view tickets assigned to them

---

## 4. Admin Flow

### Page: `/admin/tickets` (all tickets list)

- Table of all tickets: subject, student name, assigned to, status (badge), escalated flag (highlighted if true), created date
- Filter by status: default shows non-closed tickets, toggle to show all
- Assignment action per row: dropdown of support-role users + assign button (form with hidden ticketId + select for assignee)
- Permission: `support_tickets.view_all` (admin has all permissions)
- Feature-flagged behind `support_tickets`

### Page: `/admin/tickets/[ticketId]` (read-only detail + assignment + close)

- Same thread view (read-only — admin does not reply)
- Assignment form: select support user + assign button
- **Close** button — changes any status → CLOSED (terminal state, only admin can do this)
- **Re-open** button — changes RESOLVED/CLOSED → OPEN (if a ticket needs further work)

---

## 5. Status Transitions

| From | To | Who |
|------|----|-----|
| OPEN | IN_PROGRESS | Support (assigned) |
| IN_PROGRESS | RESOLVED | Support (assigned) |
| RESOLVED | CLOSED | Admin |
| RESOLVED | OPEN | Admin (re-open) |
| CLOSED | OPEN | Admin (re-open) |

Students cannot change status. Support cannot close or re-open.

---

## 6. Notifications

| Event | Recipient | Type | Title |
|-------|-----------|------|-------|
| Ticket created | Admin users (all) | `TICKET_CREATED` | "New support ticket: [subject]" |
| Ticket assigned | Assigned support user | `TICKET_ASSIGNED` | "Ticket assigned to you: [subject]" |
| Support replies | Student (ticket owner) | `TICKET_REPLY` | "New reply on your ticket: [subject]" |
| Student replies | Assigned support user | `TICKET_REPLY` | "New reply on ticket: [subject]" |
| Ticket resolved | Student | `TICKET_RESOLVED` | "Your ticket has been resolved: [subject]" |
| Ticket escalated | Admin users (all) | `TICKET_ESCALATED` | "Ticket escalated: [subject]" |

---

## 7. Sidebar & Navigation

| Role | Change |
|------|--------|
| Student | Add "Support" → `/student/tickets` |
| Support | Already has "Tickets" → `/support/tickets` (no change) |
| Admin | Add "Tickets" → `/admin/tickets` |

---

## 8. Permissions & Feature Flags

### Permissions (all pre-existing, no changes needed)

| Permission | Role | Usage |
|------------|------|-------|
| `support_tickets.view_assigned` | Support | View assigned tickets list |
| `support_tickets.view_all` | Admin | View all tickets list |
| `support_tickets.reply` | Support | Reply to assigned tickets |
| `support_tickets.escalate` | Support | Flag ticket as escalated |

Students create/view/reply to their own tickets — authenticated as approved users, no special permission needed.

Admin has all permissions (defined as `Object.values(PERMISSIONS)` in `ROLE_PERMISSIONS`).

### Feature Flag (pre-existing)

| Flag | State | Gates |
|------|-------|-------|
| `support_tickets` | Disabled (enabled during rollout) | All ticket pages and actions |

---

## 9. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `server/services/support-ticket.ts` | Ticket CRUD, assignment, status transitions, reply logic |
| `server/actions/support-ticket.ts` | Server actions for all ticket mutations |
| `lib/validations/support-ticket.ts` | Zod schemas for create ticket, reply, assign, status change |
| `app/[locale]/(dashboard)/student/tickets/page.tsx` | Student ticket list + create form |
| `app/[locale]/(dashboard)/student/tickets/[ticketId]/page.tsx` | Student ticket detail + reply thread |
| `app/[locale]/(dashboard)/support/tickets/[ticketId]/page.tsx` | Support ticket detail + reply thread + actions |
| `app/[locale]/(dashboard)/admin/tickets/page.tsx` | Admin ticket list + assignment |
| `app/[locale]/(dashboard)/admin/tickets/[ticketId]/page.tsx` | Admin ticket detail + close/re-open |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add TicketStatus enum, SupportTicket model, TicketReply model, reverse relations |
| `app/[locale]/(dashboard)/support/tickets/page.tsx` | Replace stub with real ticket list |
| `components/layout/sidebar.tsx` | Add student "Support" nav + admin "Tickets" nav |
| `messages/en.json` | Add `supportTickets` i18n namespace (~25 keys) |
| `messages/ar.json` | Add `supportTickets` i18n namespace (~25 keys) |

---

## 10. Deferred to Phase 7.1

- **Email notification delivery** — same deferral as Phase 6
- **File attachments** on tickets/replies
- **SLA timers** — auto-escalate if unresolved after N hours
- **Canned responses** — predefined reply templates for support staff
- **Ticket search/filtering** — full-text search across tickets
- **Satisfaction rating** — student rates support after resolution
