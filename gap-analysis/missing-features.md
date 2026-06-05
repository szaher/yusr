# Missing Features — Yusr Gap Analysis

Last updated: 2026-06-02 23:52

## GAP-001: No structured logging

**Area:** Observability
**Evidence:** Zero imports of any logging library across server/. Only 1 console.log (password reset token at auth.ts:99). Errors returned to clients are never logged server-side.
**Impact:** Production issues invisible. "unknownError" responses leave zero diagnostic trail.

## GAP-002: Fire-and-forget push/milestone errors silently discarded

**Area:** Observability
**Evidence:** `sendPush(...).catch(() => {})` in notification.ts:11,67. `checkMilestones(...).catch(() => {})` in memorization-review.ts:120-122.
**Impact:** Push notifications and milestone awards can fail permanently with no visibility. Students miss badges.

## GAP-003: 13 server actions lack try/catch — raw throws crash the UI

**Area:** Error Handling
**Evidence:** admin.ts:20,34, organization.ts:33,51,69, session.ts:45,123, memorization.ts:167,187,201,220, attendance.ts:39,100
**Impact:** Service exceptions propagate as unhandled errors, triggering full-page error boundary instead of inline form errors.

## GAP-004: Only 1 error boundary for 63 dashboard pages

**Area:** Error Handling
**Evidence:** Single error.tsx at app/[locale]/(dashboard)/error.tsx. No nested boundaries.
**Impact:** Any component crash replaces entire dashboard (sidebar, nav, everything) with error card.

## GAP-005: 43 admin/moderator pages have no loading.tsx

**Area:** UX
**Evidence:** Only student pages and dashboards have loading.tsx. All admin and moderator pages except dashboards lack them.
**Impact:** Frozen UI during server rendering on data-heavy pages.

## GAP-006: No centralized server action error wrapper

**Area:** Architecture
**Evidence:** 60+ action functions each independently implement auth + validation + try/catch + error return. Inconsistent: some use requireApprovedUser, some use auth() + null check.
**Impact:** Error handling is inconsistent. Easy to miss try/catch in new actions. Cross-cutting concerns (logging, rate limiting) require touching every file.

## GAP-007: No health check endpoint

**Area:** Operations
**Evidence:** No /api/health or equivalent route. grep returns zero results.
**Impact:** No way for load balancers, container orchestrators, or monitoring to verify app health.

## GAP-008: No middleware auth protection

**Area:** Security/Architecture
**Evidence:** middleware.ts only handles i18n routing (next-intl). No auth checks. Each page independently must call requireAuth().
**Impact:** Missing auth check on any new page = unauthenticated access. No defense-in-depth.

## GAP-009: No search/filter on list pages

**Area:** UX
**Evidence:** Admin users, moderator students, assignment lists, session lists — all render full lists without search or filter controls.
**Impact:** Unusable at scale. Moderator with 50+ students must scroll through full list.

## GAP-010: No pagination on data-heavy queries

**Area:** Performance/UX
**Evidence:** Service functions like getAdminAssignments, listAnnouncements, getSchoolAttendanceStats fetch unbounded result sets.
**Impact:** Page load times degrade linearly with data volume. Memory consumption grows unboundedly.

## GAP-011: No data export capability

**Area:** Admin tooling
**Evidence:** No CSV/Excel export found anywhere. grep for "export\|download\|csv" returns zero results outside docs.
**Impact:** Admins cannot generate reports for stakeholders, parents, or institutional requirements.

## GAP-012: No CI/CD pipeline

**Area:** Operations
**Evidence:** No .github/workflows, no Dockerfile, no deployment configuration in repo.
**Impact:** No automated testing, linting, or deployment. All releases are manual.

## GAP-013: No environment variable validation at startup

**Area:** Operations
**Evidence:** DATABASE_URL, AUTH_SECRET, VAPID keys accessed via process.env without startup checks. AUTH_SECRET defaults to a weak dev value.
**Impact:** App starts with missing/invalid config and fails at runtime instead of boot time.

## GAP-014: No Suspense boundaries for progressive rendering

**Area:** Performance
**Evidence:** Zero Suspense usage in dashboard pages. All queries must complete before any content renders.
**Impact:** Dashboard pages with 5+ independent queries are bottlenecked by the slowest one.

## GAP-015: Service-layer functions accept unvalidated enum values

**Area:** Data Integrity
**Evidence:** updateAccountStatus casts status to `any` (user.ts:88). setEnrollmentState accepts arbitrary strings (enrollment.ts:14).
**Impact:** Defense-in-depth gap. Invalid values could reach DB if services are called directly.
