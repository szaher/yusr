# Backlog — Full Task List

Last updated: 2026-06-02 23:55

---

# EPIC-SEC: Security Hardening

---

### TASK-001: Add accountStatus check to requirePermission
**Type:** Security
**Source:** BUG-001(data), BUG-100(sec), BUG-112(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P0
**Severity:** Blocker
**Component(s):** server/permissions, server/auth
**Owner role:** Fullstack
**Estimate:** S

**Problem / Goal**
- `requirePermission()` checks role-based permissions but NOT `accountStatus`. A banned user with a valid JWT can call any server action using `requirePermission`.
- `confirmListeningAction` uses `auth()` directly instead of `requireApprovedUser()`.

**Requirements**
- R1: `requirePermission()` must reject users whose accountStatus is not ACTIVE.
- R2: All server actions must go through either `requirePermission()` (which now checks status) or `requireApprovedUser()`.
- R3: `confirmListeningAction` must use `requireApprovedUser()`.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given a user with accountStatus = BANNED and a valid JWT
  - When they call any server action using requirePermission
  - Then PermissionDeniedError is thrown
- AC2:
  - Given a user with accountStatus = DEACTIVATED
  - When they call confirmListeningAction
  - Then they are redirected to login

**Implementation Notes**
- Modify `server/permissions/require.ts`: After `hasPermission` check, query the user's accountStatus from DB (or from session if reliable after TASK-003).
- Change `server/actions/assignment.ts:96`: Replace `auth()` with `requireApprovedUser()`.

**Testing**
- Unit tests: requirePermission rejects BANNED, DEACTIVATED, EXPELLED users
- Unit tests: requirePermission allows ACTIVE users with correct permissions

**Dependencies**
- Blocks on: nothing
- Blocked-by: nothing

**Definition of Done**
- [x] requirePermission checks accountStatus
- [x] confirmListeningAction uses requireApprovedUser
- [x] Unit tests pass
- [x] No regressions in existing auth flows

---

### TASK-002: Add rate limiting to auth endpoints
**Type:** Security
**Source:** BUG-005(data), BUG-102(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P0
**Severity:** Blocker
**Component(s):** server/actions/auth.ts, middleware
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- Login, registration, and password reset have zero rate limiting. Credential stuffing, brute-force, and email bombing are trivial.

**Requirements**
- R1: Login attempts limited to 5 per minute per IP, 10 per minute per email.
- R2: Registration limited to 3 per hour per IP.
- R3: Password reset limited to 3 per hour per email.
- R4: Rate limit responses include Retry-After header.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given 6 login attempts in 1 minute from the same IP
  - When the 6th attempt is made
  - Then a rate limit error is returned with Retry-After header
- AC2:
  - Given 4 registration attempts in 1 hour from the same IP
  - When the 4th attempt is made
  - Then a rate limit error is returned

**Implementation Notes**
- Use in-memory rate limiter (Map-based) for MVP. Upgrade to Redis for multi-instance deployments.
- Wrap auth actions with a `withRateLimit()` higher-order function.
- Store counters by IP (from headers) and by email (from input).

**Testing**
- Integration test: verify rate limit triggers after threshold
- Manual: rapid login attempts show rate limit error

**Dependencies**
- Blocks on: nothing
- Blocked-by: nothing

**Definition of Done**
- [x] Rate limiting active on login, register, forgot-password
- [x] Tests verify rate limit behavior
- [x] Retry-After header set on rate limit responses

---

### TASK-003: Add JWT refresh and set session maxAge
**Type:** Security
**Source:** BUG-002(data), BUG-100(sec), BUG-101(sec), BUG-114(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P0
**Severity:** Critical
**Component(s):** server/auth/config.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- JWT stores role, locale, and accountStatus at login time and never refreshes. A ban, role change, or locale change has no effect until the user re-logs.
- No maxAge set — JWT defaults to 30 days.

**Requirements**
- R1: JWT maxAge set to 24 hours.
- R2: JWT callback re-validates accountStatus and role from DB every 5 minutes (track lastChecked timestamp in token).
- R3: If accountStatus is no longer ACTIVE during refresh, return null to invalidate session.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given an admin bans a user
  - When the banned user's next request triggers JWT refresh (within 5 minutes)
  - Then the user's session is invalidated
- AC2:
  - Given a user's JWT is older than 24 hours
  - When they make any request
  - Then they are redirected to login

**Implementation Notes**
- In `jwt()` callback: add `lastChecked: Date.now()` to token. On subsequent calls, if `Date.now() - lastChecked > 5 * 60 * 1000`, query DB for current user state.
- Set `session: { strategy: "jwt", maxAge: 24 * 60 * 60 }`.
- In authorize(): reject login if accountStatus is BANNED or DEACTIVATED.

**Testing**
- Unit tests: JWT refresh updates role and accountStatus from DB
- Integration: banning a user forces session end within 5 minutes

**Dependencies**
- Blocked-by: TASK-001 (accountStatus check must exist)

---

### TASK-004: Fix IDOR vulnerabilities in notification and push endpoints
**Type:** Security
**Source:** BUG-103(sec), BUG-104(sec), BUG-026(data)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P0
**Severity:** High
**Component(s):** server/actions/notification.ts, server/services/notification.ts, app/api/push/unsubscribe/route.ts, server/services/push-notification.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- Any authenticated user can mark any other user's notification as read.
- Any authenticated user can delete any other user's push subscription.

**Requirements**
- R1: markNotificationRead must verify notification.recipientId === session.user.id.
- R2: Push unsubscribe must verify subscription.userId === session.user.id.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given user A tries to mark user B's notification as read
  - When markNotificationReadAction is called with user B's notification ID
  - Then an "notAuthorized" error is returned
- AC2:
  - Given user A tries to unsubscribe user B's push endpoint
  - When DELETE /api/push/unsubscribe is called
  - Then only user A's matching subscription is deleted

**Implementation Notes**
- `server/services/notification.ts:23`: Change to `db.notification.updateMany({ where: { id, recipientId: userId } })`.
- `server/services/push-notification.ts:36-39`: Change to `db.pushSubscription.deleteMany({ where: { endpoint, userId } })`.
- Pass userId from session in both cases.

**Testing**
- Unit tests: cross-user notification marking fails
- Unit tests: cross-user push unsubscribe has no effect

**Dependencies**
- Blocks on: nothing

---

### TASK-005: Remove password reset token from console.log
**Type:** Security
**Source:** BUG-107(sec), BUG-008(data), GAP-014(obs)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P0
**Severity:** High
**Component(s):** server/actions/auth.ts
**Owner role:** Backend
**Estimate:** XS

**Problem / Goal**
- Password reset token and user email logged to stdout via `console.log`. Visible in production log aggregation systems.

**Requirements**
- R1: Remove the console.log at server/actions/auth.ts:99.
- R2: If logging is needed for development, gate it behind NODE_ENV === 'development'.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given a production environment
  - When forgotPasswordAction is called
  - Then no password reset token appears in stdout

**Implementation Notes**
- Delete or guard `console.log(\`[Password Reset] ${user.email}: /ar/reset-password/${token}\`)` at line 99.

**Testing**
- Code review verification

**Dependencies**
- Blocks on: nothing

---

### TASK-006: Add moderator ownership checks to memorization actions
**Type:** Security
**Source:** BUG-105(sec), BUG-109(sec), BUG-110(sec), BUG-111(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/actions/memorization.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- 5 memorization actions (createPlan, updatePlan, createReview, setOverride, clearOverride, updateGroupCadence) accept arbitrary plan/group IDs without verifying the moderator owns the group.

**Requirements**
- R1: For moderator role, verify the plan's group.moderatorId matches the caller's moderator profile.
- R2: For updateGroupCadence, verify the group belongs to the caller.
- R3: Admin role bypasses ownership checks.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given moderator A manages group X and moderator B manages group Y
  - When moderator A tries to create a review for a student in group Y
  - Then "notAuthorized" is returned

**Implementation Notes**
- Use the pattern from `server/actions/progress.ts:14-20`: `db.studentMemorizationPlan.findFirst({ where: { id: planId, group: { moderator: { userId: session.user.id } } } })`.
- Apply to: createPlanAction, updatePlanAction, createReviewAction, setOverrideAction, clearOverrideAction, updateGroupCadenceAction.

**Testing**
- Unit tests: cross-moderator plan/review creation fails
- E2E: moderator cannot modify another moderator's students

**Dependencies**
- Blocks on: nothing

---

### TASK-007: Add auth middleware for route protection
**Type:** Security
**Source:** BUG-113(sec), GAP-008(feat)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P1
**Severity:** Medium
**Component(s):** middleware.ts
**Owner role:** Fullstack
**Estimate:** M

**Problem / Goal**
- Middleware only handles i18n routing. No auth checks at the routing layer. Every page must independently call requireAuth().

**Requirements**
- R1: Middleware checks for valid session on all /admin/*, /moderator/*, /student/* routes.
- R2: Unauthenticated requests to protected routes redirect to /[locale]/login.
- R3: Role-based route protection: students cannot access /admin/* or /moderator/*, moderators cannot access /admin/*.
- R4: i18n routing continues to work.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given an unauthenticated user
  - When they navigate to /ar/admin/dashboard
  - Then they are redirected to /ar/login
- AC2:
  - Given a student user
  - When they navigate to /ar/admin/dashboard
  - Then they are redirected to /ar/student/dashboard

**Implementation Notes**
- Extend existing middleware.ts with NextAuth middleware helper or manual JWT check.
- Check auth header/cookie for valid session. Extract role from JWT payload.

**Testing**
- E2E tests in TASK-041

**Dependencies**
- Blocked-by: TASK-001 (accountStatus check)

---

### TASK-008: Add account lockout after failed login attempts
**Type:** Security
**Source:** BUG-006(data)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/auth/config.ts, prisma/schema.prisma
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- Unlimited login attempts per account. No lockout mechanism.

**Requirements**
- R1: After 5 failed login attempts, lock the account for 15 minutes.
- R2: Show remaining lockout time in error response.
- R3: Successful login resets the counter.
- R4: Admin can manually unlock accounts.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given 5 consecutive failed login attempts for user X
  - When the 6th attempt is made (even with correct password)
  - Then "accountLocked" error is returned with lockout duration

**Implementation Notes**
- Add `failedLoginAttempts Int @default(0)` and `lockedUntil DateTime?` to User model.
- In authorize(): check lockedUntil, increment failedLoginAttempts on failure, reset on success.

**Testing**
- Unit tests: lockout triggers after 5 failures
- Unit tests: lockout expires after 15 minutes
- Unit tests: successful login resets counter

**Dependencies**
- Blocked-by: TASK-002 (rate limiting should exist first)

---

### TASK-009: Add startup validation for environment variables
**Type:** Security / Ops
**Source:** BUG-108(sec), GAP-013(feat)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P1
**Severity:** Medium
**Component(s):** lib/env.ts (new), server/db/client.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- No env var validation at startup. AUTH_SECRET defaults to a weak dev value. Missing DATABASE_URL causes runtime crash instead of boot-time error.

**Requirements**
- R1: Validate required env vars at module load: DATABASE_URL, AUTH_SECRET.
- R2: In production, reject AUTH_SECRET containing "dev-secret".
- R3: Validate VAPID keys if push notifications are enabled.
- R4: App fails fast with clear error message listing missing vars.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given AUTH_SECRET = "dev-secret-change-in-production" and NODE_ENV = "production"
  - When the app starts
  - Then it crashes with "AUTH_SECRET must not be the default dev value in production"

**Implementation Notes**
- Create `lib/env.ts` with Zod schema for env vars.
- Import at top of `server/db/client.ts` and `server/auth/config.ts`.

**Testing**
- Unit test: missing DATABASE_URL throws
- Unit test: weak AUTH_SECRET in production throws

**Dependencies**
- Blocks on: nothing

---

### TASK-010: Clean up expired password reset tokens
**Type:** Security
**Source:** BUG-106(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P2
**Component(s):** server/services/enrollment.ts, server/actions/auth.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- Password reset tokens are never deleted. Multiple valid tokens can exist for the same user simultaneously.

**Requirements**
- R1: Before creating a new token, invalidate all existing tokens for the same user.
- R2: Delete expired tokens periodically (or on each new token creation).

**Implementation Notes**
- In forgotPasswordAction: add `db.passwordResetToken.deleteMany({ where: { userId: user.id } })` before creating new token.

**Testing**
- Unit test: creating a new token invalidates previous tokens

**Dependencies**
- Blocks on: nothing

---

### TASK-011: Invalidate sessions on password reset
**Type:** Security
**Source:** BUG-116(sec)
**Epic:** EPIC-SEC
**Milestone:** Now
**Priority:** P2
**Component(s):** server/auth/config.ts, prisma/schema.prisma
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- After a password reset, old JWT sessions remain valid. A compromised session survives password change.

**Requirements**
- R1: Add a `tokenVersion Int @default(0)` field to User model.
- R2: Increment tokenVersion on password change.
- R3: Store tokenVersion in JWT. In jwt() callback, verify it matches DB on refresh.

**Implementation Notes**
- Works in conjunction with TASK-003's JWT refresh mechanism.

**Testing**
- Integration test: after password reset, old JWT is rejected on next refresh

**Dependencies**
- Blocked-by: TASK-003 (JWT refresh must exist)

---

# EPIC-DATA: Data Integrity & Transactions

---

### TASK-012: Wrap exam grading in database transaction
**Type:** Bugfix
**Source:** BUG-036(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P0
**Severity:** High
**Component(s):** server/services/exam.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- `gradeSubmission` updates individual answers in a loop, computes totals, updates submission status, creates notification, and creates audit log — all without a transaction. Partial failure leaves inconsistent state.

**Requirements**
- R1: Answer updates, total computation, and submission status update must be atomic.
- R2: Notification and audit log can be outside the transaction (non-critical).

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given a 20-question exam submission
  - When grading fails on the 15th answer update
  - Then no answers are updated (rollback)

**Implementation Notes**
- Wrap lines 760-796 in `db.$transaction(async (tx) => { ... })`.
- Move notification and audit log creation outside the transaction.

**Testing**
- Unit test: verify atomicity by simulating mid-transaction failure

**Dependencies**
- Blocks on: nothing

---

### TASK-013: Replace unbounded full-table fetches with aggregate queries
**Type:** Bugfix
**Source:** BUG-043(data), BUG-044(data), BUG-045(data), GAP-315(perf), GAP-316(perf), GAP-318(perf), GAP-320(perf)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P0
**Severity:** Critical
**Component(s):** server/services/attendance.ts, server/services/analytics.ts
**Owner role:** Backend
**Estimate:** L

**Problem / Goal**
- `getSchoolAttendanceStats` fetches ALL sessionStudent records into memory to count attendance statuses.
- `getAttendanceGroupComparison` loads ALL sessions and students for ALL groups.
- `getAdminKPIs` fetches ALL graded exam submissions to count passed/failed.
- These will OOM at scale.

**Requirements**
- R1: Replace `findMany` + in-memory counting with `count()` or `groupBy()` queries.
- R2: Add date range filters where appropriate.
- R3: Results must be mathematically equivalent to current implementation.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given 10,000 session student records in the database
  - When getSchoolAttendanceStats is called
  - Then it returns correct counts without loading all records into memory
  - And it completes in under 500ms

**Implementation Notes**
- `attendance.ts:9`: Replace with `db.sessionStudent.groupBy({ by: ['attendance'], _count: true })`.
- `attendance.ts:182`: Use aggregate queries per group instead of loading nested data.
- `analytics.ts:19`: Use `db.examSubmission.count({ where: { status: "GRADED", passed: true } })`.

**Testing**
- Unit tests: verify aggregate results match manual calculation
- Performance test: verify query time is constant regardless of data volume

**Dependencies**
- Blocks on: nothing

---

### TASK-014: Fix race condition in confirmListening
**Type:** Bugfix
**Source:** BUG-020(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/services/assignment.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- `confirmListening` reads the confirmation count outside the transaction, then creates a confirmation inside it. Concurrent requests can both read the same count and both proceed.

**Requirements**
- R1: Count read and confirmation creation must be atomic.
- R2: A student cannot exceed requiredRepetitions.

**Implementation Notes**
- Move the `_count` query inside the `$transaction`. Use `SELECT ... FOR UPDATE` pattern via Prisma interactive transaction.

**Testing**
- Unit test: concurrent confirmation attempts don't exceed count

**Dependencies**
- Blocks on: nothing

---

### TASK-015: Wrap missing service operations in transactions
**Type:** Bugfix
**Source:** BUG-001-006(data), BUG-037(data), BUG-038(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P1
**Severity:** Medium
**Component(s):** server/services/enrollment.ts, server/services/organization.ts, server/services/exam.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- 8 service functions perform multi-step mutations (create entity + audit log, update + audit log) without transactions.
- Exam addQuestion/deleteQuestion + recalculateTotalPoints are not atomic.

**Requirements**
- R1: setEnrollmentState, rejectApplication, waitlistApplication: wrap in $transaction.
- R2: createLevel, createClass, createGroup, assignStudentToGroup: wrap create + audit log in $transaction.
- R3: addQuestion, deleteQuestion: wrap question mutation + recalculateTotalPoints in $transaction.

**Testing**
- Unit tests: verify audit log is created atomically with the mutation

**Dependencies**
- Blocks on: nothing

---

### TASK-016: Add Zod validation to unvalidated server actions
**Type:** Bugfix
**Source:** BUG-022(data), BUG-023(data), BUG-024(data), BUG-025(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/actions/admin.ts, server/actions/attendance.ts, server/actions/gamification.ts, server/actions/progress.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- 4 action files accept raw user input without Zod validation: toggleFeatureFlag (key as string), markQuickAttendance (raw arrays), awardBadge/revokeBadge (raw IDs), createCustomGoal/deleteCustomGoal (raw IDs).

**Requirements**
- R1: Create Zod schemas for each unvalidated action's input.
- R2: Validate with safeParse before processing.
- R3: Return `{ error: "validationError" }` on failure.

**Testing**
- Unit tests: invalid input returns validation error
- Unit tests: valid input passes through

**Dependencies**
- Blocks on: nothing

---

### TASK-017: Fix unchecked JSON.parse in exam service
**Type:** Bugfix
**Source:** BUG-040(data), GAP-020(obs)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/services/exam.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- 5 `JSON.parse()` calls on user input without try/catch: groupIds, customizations, answersJson, grades, options.

**Requirements**
- R1: Wrap each JSON.parse in try/catch.
- R2: Throw a descriptive error ("Invalid JSON input for [field]") instead of SyntaxError.
- R3: Validate parsed structure with Zod where possible.

**Testing**
- Unit test: malformed JSON returns descriptive error

**Dependencies**
- Blocks on: nothing

---

### TASK-018: Add soft-delete pattern for assignments, announcements, templates
**Type:** Refactor
**Source:** BUG-027(data), BUG-028(data), BUG-029(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P2
**Component(s):** server/services/assignment.ts, server/services/announcement.ts, server/services/memorization-plan-template.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- Assignments, announcements, and memorization plan templates are hard-deleted, losing data permanently. Audit logs reference non-existent entities.

**Requirements**
- R1: Add `deletedAt DateTime?` field to Assignment, Announcement models.
- R2: Replace `delete()` with `update({ deletedAt: new Date() })`.
- R3: Add `where: { deletedAt: null }` to all findMany queries for these models.
- R4: For templates, prevent deletion if active plans reference the template.

**Testing**
- Unit test: deleted items don't appear in list queries
- Unit test: template deletion blocked when plans reference it

**Dependencies**
- Blocks on: nothing

---

### TASK-019: Add cascade/restrict declarations to FK relations
**Type:** Bugfix
**Source:** BUG-007(data), BUG-008(data), BUG-009(data), BUG-047(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P2
**Component(s):** prisma/schema.prisma
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- User, Group, Level, Class, ExamTemplate models lack onDelete behavior. Deleting any of these will fail with FK constraint violations.

**Requirements**
- R1: Add `onDelete: Cascade` to child relations of Group (GroupStudent, WeeklySession, ExamInstance, AttendanceAlertConfig).
- R2: Add `onDelete: Cascade` to Level→Class, Class→Group hierarchy.
- R3: Add `onDelete: Cascade` or `Restrict` to User→Profile relations (use Cascade since these should be cleaned up with the user).
- R4: Add `onDelete: Restrict` to ExamTemplate→ExamInstance (prevent template deletion if instances exist).

**Testing**
- Integration test: deleting a group cascades to child records
- Integration test: deleting an exam template with instances is blocked

**Dependencies**
- Blocks on: nothing

---

### TASK-020: Fix race conditions in exam question and retake operations
**Type:** Bugfix
**Source:** BUG-021(data), BUG-039(data)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P2
**Component(s):** server/services/exam.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- addQuestion reads max order then creates with nextOrder — concurrent adds can collide.
- createRetakeSubmission reads latest attemptNumber then creates — concurrent retakes can collide.
- Both have unique constraints that catch the collision, but the error is a raw P2002.

**Requirements**
- R1: Catch P2002 errors and retry with incremented value (max 3 retries).
- R2: Or use interactive transaction with SELECT FOR UPDATE.

**Testing**
- Unit test: concurrent question additions don't fail

**Dependencies**
- Blocked-by: TASK-012 (exam transactions)

---

### TASK-021: Add missing database indexes
**Type:** Bugfix
**Source:** BUG-032(data), BUG-033(data), BUG-035(data), GAP-331(perf)
**Epic:** EPIC-DATA
**Milestone:** Now
**Priority:** P2
**Component(s):** prisma/schema.prisma
**Owner role:** Backend
**Estimate:** XS

**Problem / Goal**
- Announcement model has no indexes (queried by publishDate, targetType).
- ExamInstance missing index on startDate/endDate for date range queries.

**Requirements**
- R1: Add `@@index([publishDate])` and `@@index([targetType, targetId])` to Announcement.
- R2: Add `@@index([startDate])` to ExamInstance.

**Testing**
- Run `prisma db push` and verify indexes created
- Verify query explain plan uses indexes

**Dependencies**
- Blocks on: nothing

---

# EPIC-I18N: i18n Correctness

---

### TASK-022: Fix 68 hardcoded Arabic-only revalidatePath calls
**Type:** Bugfix
**Source:** BUG-003(sec)
**Epic:** EPIC-I18N
**Milestone:** Now
**Priority:** P0
**Severity:** Critical
**Component(s):** server/actions/*.ts (all files)
**Owner role:** Fullstack
**Estimate:** M

**Problem / Goal**
- 68 of 153 `revalidatePath` calls only invalidate `/ar/` paths. English-locale pages serve stale data after mutations.

**Requirements**
- R1: Every revalidatePath call must cover both `/ar/` and `/en/` locale variants.
- R2: Prefer locale-agnostic revalidation where Next.js supports it: `revalidatePath("/[locale]/admin/settings", "page")`.
- R3: If agnostic revalidation doesn't work, call both `/ar/` and `/en/` variants.

**Acceptance Criteria (Gherkin)**
- AC1:
  - Given an English-locale user viewing the feature flags page
  - When an admin toggles a feature flag
  - Then the English page reflects the change without manual refresh

**Implementation Notes**
- Grep for `revalidatePath.*"/ar/` and systematically add `/en/` counterparts or switch to pattern-based revalidation.
- Files to touch: leave-request.ts, admin.ts, organization.ts, session.ts, memorization.ts, announcement.ts, enrollment.ts, attendance.ts, gamification.ts, support-ticket.ts.

**Testing**
- Grep verification: `grep -rn 'revalidatePath' server/ | grep -v '/en/' | grep '/ar/' | wc -l` = 0

**Dependencies**
- Blocks on: nothing

---

### TASK-023: Fix hardcoded /ar/login redirect to use user locale
**Type:** Bugfix
**Source:** BUG-007(data), BUG-012(sec)
**Epic:** EPIC-I18N
**Milestone:** Now
**Priority:** P1
**Severity:** High
**Component(s):** server/auth/session.ts, server/auth/config.ts
**Owner role:** Fullstack
**Estimate:** S

**Problem / Goal**
- `requireAuth()` redirects to `"/ar/login"` regardless of locale.
- NextAuth config hardcodes `signIn: "/ar/login"`.

**Requirements**
- R1: Redirect to `/[locale]/login` using the user's preferred locale or request locale.
- R2: NextAuth signIn page should use the locale from the request.

**Implementation Notes**
- Use `cookies().get('NEXT_LOCALE')` or parse the request URL for locale.
- For NextAuth config, use a dynamic signIn page resolver.

**Testing**
- E2E: English user whose session expires is redirected to /en/login

**Dependencies**
- Blocks on: nothing

---

### TASK-024: Fix hardcoded locale strings in moderator/admin pages
**Type:** Bugfix
**Source:** GAP-204(feat), GAP-210(feat), GAP-214(feat), GAP-222(feat), GAP-229(feat)
**Epic:** EPIC-I18N
**Milestone:** Now
**Priority:** P2
**Component(s):** app/[locale]/(dashboard)/moderator/*, app/[locale]/(dashboard)/admin/*
**Owner role:** Frontend
**Estimate:** S

**Problem / Goal**
- Several pages use inline `locale === "ar" ? "..." : "..."` instead of t() for labels.

**Requirements**
- R1: Replace all inline locale checks with proper i18n translation keys.
- R2: Add missing keys to both ar.json and en.json message files.

**Testing**
- Visual: verify both locales render correctly
- Grep: `grep -rn 'locale === "ar"' app/ | grep -v node_modules | wc -l` should decrease to near-zero

**Dependencies**
- Blocks on: nothing

---

# EPIC-OBS: Observability & Error Handling

---

### TASK-025: Create centralized safe-action wrapper
**Type:** Refactor
**Source:** GAP-023(obs), GAP-005(obs)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P1
**Component(s):** server/actions/ (new utility + all action files)
**Owner role:** Backend
**Estimate:** L

**Problem / Goal**
- 60+ action functions each independently implement auth + validation + try/catch + error return. 13 actions lack try/catch entirely. Error handling is inconsistent.

**Requirements**
- R1: Create a `createSafeAction<TInput, TOutput>(config)` wrapper that handles: auth check, input validation, try/catch, error logging, and typed return.
- R2: Wrapper must support both `requirePermission` and `requireApprovedUser` auth strategies.
- R3: Wrapper must return `{ success: true, data: T }` or `{ error: string, details?: any }`.
- R4: Wrapper must log all caught errors with request context.

**Implementation Notes**
- Create `server/lib/safe-action.ts`.
- Migrate actions incrementally — start with exam actions (most complex), then remaining.

**Testing**
- Unit tests: wrapper catches and logs errors
- Unit tests: wrapper validates input with provided schema
- Unit tests: wrapper enforces auth

**Dependencies**
- Blocks on: nothing
- Blocks: TASK-027

---

### TASK-026: Add structured logging with pino
**Type:** Missing Feature
**Source:** GAP-004(obs)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P1
**Component(s):** server/ (new logging module)
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- Zero structured logging. Errors in production are invisible.

**Requirements**
- R1: Add pino as a dependency.
- R2: Create a `server/lib/logger.ts` module with structured JSON output.
- R3: Log level configurable via LOG_LEVEL env var.
- R4: Include request context (userId, action name) in log entries.

**Testing**
- Unit test: logger outputs valid JSON
- Integration: verify log output includes expected fields

**Dependencies**
- Blocks on: nothing
- Blocks: TASK-027, TASK-030

---

### TASK-027: Log errors before returning "unknownError"
**Type:** Bugfix
**Source:** GAP-013(obs)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P1
**Component(s):** server/actions/*.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- 36 occurrences of `catch (e) { return { error: "unknownError" } }` without any server-side logging.

**Requirements**
- R1: Every catch block that returns an error must log the full error before returning.
- R2: Do not expose internal error messages to the client.

**Implementation Notes**
- If TASK-025 (safe-action wrapper) is complete, this is automatic.
- Otherwise, add `logger.error({ err: e, action: 'actionName' }, 'Action failed')` to each catch block.

**Testing**
- Verify log output when an action throws

**Dependencies**
- Blocked-by: TASK-025, TASK-026

---

### TASK-028: Add nested error boundaries for dashboard sections
**Type:** Missing Feature
**Source:** GAP-009(obs), GAP-004(feat)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P1
**Component(s):** app/[locale]/(dashboard)/admin/, moderator/, student/
**Owner role:** Frontend
**Estimate:** S

**Problem / Goal**
- 1 error boundary for 63 pages. Any crash replaces entire dashboard with error card.

**Requirements**
- R1: Add error.tsx at each role route level: admin/error.tsx, moderator/error.tsx, student/error.tsx.
- R2: Error boundary preserves the dashboard layout (sidebar, nav).
- R3: Show error digest in production for support reference.

**Testing**
- Manual: trigger error on admin page, verify sidebar remains visible
- E2E: verify error boundary renders on simulated error

**Dependencies**
- Blocks on: nothing

---

### TASK-029: Add loading.tsx for all moderator and admin pages
**Type:** Missing Feature
**Source:** GAP-008(obs), GAP-225(feat), GAP-226(feat)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P1
**Component(s):** app/[locale]/(dashboard)/moderator/*, admin/*
**Owner role:** Frontend
**Estimate:** M

**Problem / Goal**
- 43 moderator/admin pages have no loading.tsx. Pages appear frozen during server rendering.

**Requirements**
- R1: Add loading.tsx with skeleton UI for all moderator pages (sessions, assignments, students, groups, exams, memorization, attendance, leave-requests, progress, announcements, notifications).
- R2: Add loading.tsx for all admin pages (users, enrollment, classes, groups, sessions, assignments, attendance, audit-logs, settings, feature-flags, leave-requests, announcements, notifications, progress, tickets).

**Testing**
- Visual: navigate to pages, verify skeleton appears before data

**Dependencies**
- Blocks on: nothing
- Blocks: TASK-046, TASK-047

---

### TASK-030: Fix fire-and-forget error swallowing
**Type:** Bugfix
**Source:** GAP-002(obs), GAP-003(obs)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P2
**Component(s):** server/services/notification.ts, server/services/memorization-review.ts, server/services/progress.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- `.catch(() => {})` silently discards all push notification and milestone check errors.

**Requirements**
- R1: Replace `.catch(() => {})` with `.catch((err) => logger.warn({ err }, 'background task failed'))`.

**Testing**
- Unit test: verify log output when push notification fails

**Dependencies**
- Blocked-by: TASK-026 (structured logging)

---

### TASK-031: Use notFound() instead of findUniqueOrThrow in page data fetching
**Type:** Bugfix
**Source:** GAP-025(obs)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P2
**Component(s):** server/services/exam.ts, support-ticket.ts, announcement.ts, leave-request.ts
**Owner role:** Backend
**Estimate:** S

**Problem / Goal**
- Server component pages that fetch by ID use `findUniqueOrThrow`, which crashes the dashboard error boundary on invalid IDs. Should show a proper 404 page.

**Requirements**
- R1: For service functions called from pages (not actions), use `findUnique` and return null.
- R2: In the page component, call `notFound()` when service returns null.

**Testing**
- E2E: navigate to /student/tickets/invalid-id, verify 404 page (not error boundary)

**Dependencies**
- Blocks on: nothing

---

### TASK-032: Add health check API endpoint
**Type:** Missing Feature
**Source:** GAP-007(feat)
**Epic:** EPIC-OBS
**Milestone:** Next
**Priority:** P2
**Component(s):** app/api/health/route.ts (new)
**Owner role:** Backend
**Estimate:** XS

**Problem / Goal**
- No health check endpoint for monitoring or load balancer probes.

**Requirements**
- R1: GET /api/health returns `{ status: "ok", timestamp: "..." }` with 200.
- R2: Verify database connectivity. Return 503 if database unreachable.

**Testing**
- Integration test: health endpoint returns 200 with connected DB

**Dependencies**
- Blocks on: nothing

---

# EPIC-PERF: Performance & Caching

---

### TASK-033: Cache hasPermission per request using React cache()
**Type:** Bugfix
**Source:** BUG-004(data)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P1
**Component(s):** server/permissions/check.ts
**Owner role:** Backend
**Estimate:** XS

**Problem / Goal**
- `hasPermission()` makes 3 uncached DB queries per call. `getPermissionsForUser` is cached but `hasPermission` is not.

**Requirements**
- R1: Refactor `hasPermission` to use `getPermissionsForUser` (already cached) and check the returned set.

**Implementation Notes**
- Change `hasPermission` to: `const perms = await getPermissionsForUser(userId); return perms.includes(permissionKey);`

**Testing**
- Unit test: verify hasPermission returns correct results
- Performance: verify only 1 DB round-trip per request for multiple permission checks

**Dependencies**
- Blocks on: nothing

---

### TASK-034: Fix N+1 queries on leaderboard and progress pages
**Type:** Bugfix
**Source:** BUG-010-016(data), GAP-300-305(perf)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/gamification.ts, server/services/progress.ts
**Owner role:** Backend
**Estimate:** XL

**Problem / Goal**
- 9 N+1 query patterns: getGroupLeaderboard, getSchoolLeaderboard, getGroupProgressOverview, getSchoolProgressStats, getTopPerformers, checkAttendanceAlerts, getStudentsAtRisk, getGroupProgressComparison, getAdminAssignments.

**Requirements**
- R1: Replace per-item queries with batch queries.
- R2: getQuranPercentage: use a single aggregate query for all students.
- R3: getReviewStreak: add date window limit (last 52 weeks) to avoid fetching all reviews.
- R4: getAdminAssignments: batch-resolve target names by type.
- R5: Results must be equivalent to current implementation.

**Testing**
- Unit tests: verify calculations match current implementation
- Performance: verify query count is O(1) not O(N) for all fixed functions

**Dependencies**
- Blocks on: nothing

---

### TASK-035: Add pagination to all list service functions
**Type:** Missing Feature
**Source:** GAP-306-314(perf)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/*.ts, app/[locale]/(dashboard)/**/*.tsx
**Owner role:** Fullstack
**Estimate:** XL

**Problem / Goal**
- 10+ service functions return unbounded result sets: getAllUsers, getAdminSessions, getModeratorSessions, getStudentSessions, getStudentGrades, getAllLeaveRequests, getAllTickets, listAnnouncements, getAllApplications, listTemplates.

**Requirements**
- R1: All list functions accept `page` and `limit` parameters with sensible defaults (page=1, limit=20).
- R2: Return `{ items: T[], total: number, page: number, totalPages: number }`.
- R3: Add pagination UI components to corresponding pages.

**Testing**
- Unit tests: verify correct offset/take calculation
- E2E: verify pagination controls work on admin users page

**Dependencies**
- Blocks on: nothing

---

### TASK-036: Batch sequential DB operations in exam service
**Type:** Refactor
**Source:** GAP-324(perf), GAP-325(perf), GAP-326(perf), BUG-018(data), BUG-019(data)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P2
**Component(s):** server/services/exam.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- saveAnswers, gradeSubmission, assignToGroups, duplicateTemplate all use sequential DB operations in loops.

**Requirements**
- R1: Use Promise.all within transactions for saveAnswers upserts.
- R2: Use Promise.all for gradeSubmission answer updates.
- R3: Use createMany for assignToGroups and duplicateTemplate.

**Testing**
- Unit tests: verify batch results match sequential results

**Dependencies**
- Blocked-by: TASK-012 (exam transactions)

---

### TASK-037: Configure explicit pg.Pool connection pooling
**Type:** Refactor
**Source:** GAP-333(perf)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P2
**Component(s):** server/db/client.ts
**Owner role:** Backend
**Estimate:** XS

**Problem / Goal**
- PrismaPg uses default pg settings (max 10 connections). No explicit pool configuration.

**Requirements**
- R1: Create explicit pg.Pool with configurable max connections (default 20).
- R2: Set idleTimeoutMillis (30s) and connectionTimeoutMillis (10s).
- R3: Make pool size configurable via DATABASE_POOL_SIZE env var.

**Testing**
- Integration: verify pool settings are applied

**Dependencies**
- Blocks on: nothing

---

### TASK-038: Split i18n messages by namespace
**Type:** Refactor
**Source:** GAP-336(perf)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P2
**Component(s):** app/[locale]/layout.tsx, i18n/
**Owner role:** Frontend
**Estimate:** M

**Problem / Goal**
- Full i18n message bundle (53KB Arabic) sent to every page. Most pages only need 2-3 namespaces.

**Requirements**
- R1: Split messages into namespace-based files.
- R2: Load only needed namespaces per page using next-intl's `getMessages({ namespace })`.

**Testing**
- Performance: verify page JS bundle size decrease
- Visual: verify translations still render correctly

**Dependencies**
- Blocks on: nothing

---

### TASK-039: Add targeted cache invalidation with revalidateTag
**Type:** Refactor
**Source:** GAP-339(perf)
**Epic:** EPIC-PERF
**Milestone:** Next
**Priority:** P3
**Component(s):** server/services/*.ts, server/actions/*.ts
**Owner role:** Backend
**Estimate:** L

**Problem / Goal**
- All cache invalidation uses broad revalidatePath sweeps. No targeted invalidation possible.

**Requirements**
- R1: Add cache tags to key data-fetching functions using unstable_cache.
- R2: Use revalidateTag for targeted invalidation in actions.

**Testing**
- Integration: verify targeted invalidation works for exam/session data

**Dependencies**
- Blocked-by: TASK-022 (revalidatePath must be fixed first)

---

# EPIC-TEST: Test Coverage

---

### TASK-040: Add auth guard unit tests
**Type:** Test
**Source:** GAP-101(test), GAP-103(test), GAP-104(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P0
**Component(s):** server/auth/session.ts, server/permissions/require.ts, server/auth/config.ts
**Owner role:** Backend
**Estimate:** M

**Problem / Goal**
- requireAuth, requireApprovedUser, requirePermission, and the authorize callback have zero tests. These are the most critical security functions in the app.

**Requirements**
- R1: Test requireAuth: redirects when no session, returns session when authenticated.
- R2: Test requireApprovedUser: redirects when status != ACTIVE.
- R3: Test requirePermission: throws when no session, throws when no permission, passes when permitted.
- R4: Test authorize: rejects invalid schema, non-existent user, wrong password. Returns correct shape.

**Testing**
- 15+ unit test cases covering happy paths and error cases

**Dependencies**
- Blocked-by: TASK-001 (accountStatus check — tests should verify the fix)

---

### TASK-041: Add security E2E tests for cross-role access denial
**Type:** Test
**Source:** GAP-102(test), GAP-105(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P0
**Component(s):** e2e/
**Owner role:** Fullstack
**Estimate:** M

**Problem / Goal**
- No E2E test verifies that a student cannot access admin/moderator pages, or that a moderator cannot access admin pages.

**Requirements**
- R1: Student accessing /admin/dashboard is denied/redirected.
- R2: Student accessing /moderator/dashboard is denied/redirected.
- R3: Moderator accessing /admin/dashboard is denied/redirected.
- R4: Deactivated/banned user accessing dashboard is denied.

**Testing**
- 4+ E2E test cases

**Dependencies**
- Blocked-by: TASK-001, TASK-007 (auth must be enforced in middleware)

---

### TASK-042: Add unit tests for enrollment service
**Type:** Test
**Source:** GAP-106(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/enrollment.ts
**Owner role:** Backend
**Estimate:** M

**Requirements**
- R1: registerStudent creates user + application with PENDING_REVIEW.
- R2: approveApplication sets APPROVED + ACTIVE + creates StudentProfile.
- R3: rejectApplication sets REJECTED.
- R4: Duplicate email rejection.

**Dependencies**
- Blocks on: nothing

---

### TASK-043: Add unit tests for exam service
**Type:** Test
**Source:** GAP-107(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/exam.ts
**Owner role:** Backend
**Estimate:** L

**Requirements**
- R1: createTemplate creates record.
- R2: addQuestion auto-scores MCQ correctly.
- R3: saveAnswers auto-grades MCQ, marks essays pending.
- R4: gradeSubmission calculates total correctly.
- R5: changeInstanceStatus enforces valid transitions.

**Dependencies**
- Blocked-by: TASK-012 (exam transactions should be in place before writing tests)

---

### TASK-044: Add unit tests for session/attendance service
**Type:** Test
**Source:** GAP-108(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/session.ts, server/services/attendance.ts
**Owner role:** Backend
**Estimate:** M

**Requirements**
- R1: createSession creates with attendees.
- R2: updateSessionStatus enforces transitions.
- R3: gradeStudent records grade and attendance.
- R4: checkAttendanceAlerts fires correctly.

**Dependencies**
- Blocks on: nothing

---

### TASK-045: Add unit tests for memorization service
**Type:** Test
**Source:** GAP-109(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** server/services/memorization-plan.ts, memorization-review.ts
**Owner role:** Backend
**Estimate:** M

**Requirements**
- R1: createPlan creates correct plan.
- R2: computeNextRange handles surah boundaries.
- R3: createReview advances plan progress.

**Dependencies**
- Blocks on: nothing

---

### TASK-046: Add E2E tests for moderator workflows
**Type:** Test
**Source:** GAP-121(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** e2e/moderator/
**Owner role:** Fullstack
**Estimate:** L

**Requirements**
- R1: Moderator dashboard loads.
- R2: Moderator creates session.
- R3: Moderator views student list.
- R4: Moderator records memorization review.

**Dependencies**
- Blocked-by: TASK-029 (loading states needed for stable tests)

---

### TASK-047: Add E2E tests for student workflows
**Type:** Test
**Source:** GAP-122(test)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P1
**Component(s):** e2e/student/
**Owner role:** Fullstack
**Estimate:** L

**Requirements**
- R1: Student views assignments.
- R2: Student views sessions and detail.
- R3: Student views memorization progress.
- R4: Student submits leave request.

**Dependencies**
- Blocked-by: TASK-029

---

### TASK-048: Set up CI test pipeline
**Type:** Ops
**Source:** GAP-012(feat)
**Epic:** EPIC-TEST
**Milestone:** Next
**Priority:** P2
**Component(s):** .github/workflows/ (new)
**Owner role:** DevOps
**Estimate:** M

**Requirements**
- R1: GitHub Actions workflow that runs on every PR.
- R2: Steps: install deps, lint, type-check, unit tests, E2E tests.
- R3: Test database provisioned in CI (PostgreSQL service container).
- R4: Playwright browsers cached.

**Dependencies**
- Blocked-by: TASK-040 (auth tests should exist to run in CI), TASK-042

---

# EPIC-UX: UX Completeness

---

### TASK-049: Add confirmation dialogs for destructive admin actions
**Type:** Missing Feature
**Source:** GAP-215(feat)
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P2
**Component(s):** app/[locale]/(dashboard)/admin/*
**Owner role:** Frontend
**Estimate:** M

**Requirements**
- R1: Ban, deactivate, delete actions show AlertDialog before submission.
- R2: Dialog explains the consequence and requires explicit confirmation.

**Dependencies**
- Blocks on: nothing

---

### TASK-050: Add search and filter to key list pages
**Type:** Missing Feature
**Source:** GAP-009(feat), GAP-212(feat), GAP-213(feat)
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P2
**Component(s):** app/[locale]/(dashboard)/admin/users, moderator/students
**Owner role:** Frontend
**Estimate:** L

**Requirements**
- R1: Admin users page: search by name/email, filter by role.
- R2: Moderator students page: search by name, filter by group.
- R3: Search is server-side (query parameter).

**Dependencies**
- Blocked-by: TASK-035 (pagination must exist)

---

### TASK-051: Add password change to student profile page
**Type:** Missing Feature
**Source:** GAP-205(feat)
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P2
**Component(s):** app/[locale]/(dashboard)/student/profile/, server/actions/auth.ts
**Owner role:** Fullstack
**Estimate:** M

**Requirements**
- R1: Password change form with current password, new password, confirm password.
- R2: Server action validates current password before changing.
- R3: Zod validation with min 8 chars, match confirmation.

**Dependencies**
- Blocks on: nothing

---

### TASK-052: Add CSV data export for admin reports
**Type:** New Feature
**Source:** GAP-220(feat), FEAT-007
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P3
**Component(s):** app/api/export/ (new), admin pages
**Owner role:** Fullstack
**Estimate:** L

**Requirements**
- R1: Export buttons on admin users, attendance, and exam results pages.
- R2: Server-side CSV generation with proper encoding (UTF-8 BOM for Excel Arabic support).
- R3: Downloadable as .csv file.

**Dependencies**
- Blocked-by: TASK-035 (pagination for query limits)

---

### TASK-053: Add edit and delete for organization entities
**Type:** Missing Feature
**Source:** GAP-221(feat)
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P2
**Component(s):** admin/levels, admin/classes, admin/groups pages + server actions
**Owner role:** Fullstack
**Estimate:** L

**Requirements**
- R1: Edit dialog for level (name, sort order).
- R2: Edit dialog for class (name, capacity, schedule).
- R3: Edit dialog for group (name, moderator, schedule).
- R4: Delete with confirmation for entities with no children.

**Dependencies**
- Blocks on: nothing

---

### TASK-054: Fix dark mode colors on announcement banners
**Type:** Bugfix
**Source:** GAP-224(feat)
**Epic:** EPIC-UX
**Milestone:** Later
**Priority:** P3
**Component(s):** admin/dashboard, moderator/dashboard, support/dashboard
**Owner role:** Frontend
**Estimate:** XS

**Requirements**
- R1: Replace `bg-red-50`, `bg-amber-50` with `bg-red-500/10 dark:bg-red-500/10` pattern from student dashboard.

**Dependencies**
- Blocks on: nothing

---

# EPIC-OPS: Operations & Infrastructure

---

### TASK-055: Add environment variable validation at startup
**Type:** Ops
**Source:** GAP-013(feat)
**Epic:** EPIC-OPS
**Milestone:** Later
**Priority:** P1
**Component(s):** lib/env.ts (new)
**Owner role:** Backend
**Estimate:** S

**Requirements**
- R1: Validate DATABASE_URL, AUTH_SECRET at import time.
- R2: Validate VAPID keys if push is enabled.
- R3: Fail fast with clear error message.

**Implementation Notes**
- Merged with TASK-009 if done in same cycle.

**Dependencies**
- Blocks on: nothing

---

### TASK-056: Remove dead @auth/prisma-adapter dependency
**Type:** Ops
**Source:** GAP-335(perf)
**Epic:** EPIC-OPS
**Milestone:** Later
**Priority:** P3
**Component(s):** package.json
**Owner role:** Backend
**Estimate:** XS

**Requirements**
- R1: Remove @auth/prisma-adapter from dependencies.
- R2: Verify build still succeeds.

**Dependencies**
- Blocks on: nothing

---

### TASK-057: Add CI/CD pipeline with GitHub Actions
**Type:** Ops
**Source:** GAP-012(feat)
**Epic:** EPIC-OPS
**Milestone:** Later
**Priority:** P2
**Component(s):** .github/workflows/ (new)
**Owner role:** DevOps
**Estimate:** L

**Requirements**
- R1: CI workflow on PR: lint, type-check, unit tests, E2E tests.
- R2: CD workflow on merge to main: build and deploy.
- R3: Secrets management for DATABASE_URL, AUTH_SECRET, VAPID keys.

**Dependencies**
- Blocked-by: TASK-048 (CI test pipeline must exist)
