# Epics — Yusr Implementation Plan

Last updated: 2026-06-02 23:55

---

## EPIC-SEC: Security Hardening

**Problem:** Multiple auth enforcement gaps allow banned users to call server actions, no rate limiting on auth endpoints, IDOR vulnerabilities, and stale JWT sessions.

**In-scope:** requirePermission fix, rate limiting, JWT refresh, IDOR fixes, middleware auth, account lockout, token cleanup.
**Out-of-scope:** OAuth/SSO integration, 2FA, IP allowlisting.

**Key risks:** Any regression in auth enforcement exposes the entire app.
**Exit criteria:** All server actions check accountStatus. Login/register/reset are rate-limited. No IDOR in any endpoint. Auth middleware protects all dashboard routes.
**Success metrics:** Zero unauthorized access in security E2E tests. Rate limiting verified with load test.

**Tasks:** TASK-001 through TASK-011

---

## EPIC-DATA: Data Integrity & Transactions

**Problem:** Critical mutations lack transactions (exam grading), unbounded queries fetch entire tables into memory, race conditions in assignment confirmation and exam operations, missing input validation in 4 action files.

**In-scope:** Transaction wrapping, aggregate query replacement, race condition fixes, Zod validation, JSON.parse safety, soft-delete, cascade declarations, indexes.
**Out-of-scope:** Schema redesign, data migration of existing records.

**Key risks:** Transaction changes could affect existing behavior if not tested. Aggregate replacements must match existing calculation results.
**Exit criteria:** All multi-step mutations are transactional. No unbounded queries. All actions validate input with Zod.
**Success metrics:** No P2002/P2025 errors in production. Page load times within 2s for all data pages.

**Tasks:** TASK-012 through TASK-021

---

## EPIC-I18N: i18n Correctness

**Problem:** 68 revalidatePath calls only invalidate Arabic locale, leaving English pages stale. Redirects always go to /ar/login regardless of user locale. Hardcoded locale strings in moderator/admin pages.

**In-scope:** Fix all revalidatePath calls, fix redirects, fix hardcoded strings.
**Out-of-scope:** Adding new locales, RTL layout fixes.

**Key risks:** Low — these are mechanical find-and-replace fixes with clear before/after behavior.
**Exit criteria:** All revalidatePath calls cover both locales. Redirects respect user locale. No hardcoded locale strings remain.
**Success metrics:** English-locale E2E tests pass. Grep for hardcoded locale strings returns zero.

**Tasks:** TASK-022 through TASK-024

---

## EPIC-OBS: Observability & Error Handling

**Problem:** Zero structured logging. 13 server actions throw raw errors. 1 error boundary for 63 pages. No loading states for moderator/admin. Fire-and-forget operations silently discard errors.

**In-scope:** Logging library, safe-action wrapper, error boundaries, loading states, health check, error logging.
**Out-of-scope:** APM integration, distributed tracing, log aggregation infrastructure.

**Key risks:** Safe-action wrapper must not break existing action return types. Error boundaries must not hide debug information.
**Exit criteria:** All server actions log errors. Nested error boundaries at role level. Loading.tsx for all data pages. Health check endpoint responds.
**Success metrics:** Zero "unknownError" without server-side log entry. Error boundary catches visible in development.

**Tasks:** TASK-025 through TASK-032

---

## EPIC-PERF: Performance & Caching

**Problem:** hasPermission makes 3 uncached queries per call. 9 N+1 query patterns on high-traffic pages. No pagination on any list query. Sequential DB operations in exam service. Default connection pool.

**In-scope:** Permission caching, N+1 elimination, pagination, batch operations, connection pool config, i18n bundle splitting.
**Out-of-scope:** CDN setup, edge caching, database read replicas.

**Key risks:** N+1 fixes require verifying calculation equivalence. Pagination changes UI behavior.
**Exit criteria:** hasPermission cached per request. Leaderboard/progress pages issue <10 queries. All lists paginated.
**Success metrics:** 50th percentile page load <1s. 95th percentile <3s.

**Tasks:** TASK-033 through TASK-039

---

## EPIC-TEST: Test Coverage

**Problem:** 1 unit test file for entire server layer. No moderator E2E tests. No security E2E tests. No student workflow tests beyond dashboard.

**In-scope:** Auth guard tests, security E2E tests, service unit tests (enrollment, exam, session, memorization), moderator/student E2E tests, CI pipeline.
**Out-of-scope:** Visual regression tests, performance tests, component unit tests.

**Key risks:** Test infrastructure setup (test database, fixtures) must work reliably. Flaky tests undermine trust.
**Exit criteria:** Auth guards 100% tested. Critical services 80%+ tested. E2E covers login → all role dashboards → key workflows.
**Success metrics:** CI passes on every PR. Coverage >60% for server/services. Zero flaky tests.

**Tasks:** TASK-040 through TASK-048

---

## EPIC-UX: UX Completeness

**Problem:** No confirmation dialogs for destructive actions. No search/filter on list pages. No password change in profile. No data export. Organization entities can't be edited/deleted.

**In-scope:** Confirmation dialogs, search/filter, password change, CSV export, CRUD completeness, dark mode fixes.
**Out-of-scope:** Calendar view, parent accounts, audio recording, mobile-specific design.

**Key risks:** Low — these are additive features with no regression risk.
**Exit criteria:** All destructive actions have confirmation dialogs. Key list pages have search. Admin can export CSV.
**Success metrics:** User-reported friction points resolved.

**Tasks:** TASK-049 through TASK-054

---

## EPIC-OPS: Operations & Infrastructure

**Problem:** No environment variable validation. Dead dependency. No CI/CD pipeline.

**In-scope:** Env validation, dependency cleanup, GitHub Actions CI/CD.
**Out-of-scope:** Kubernetes, Docker, staging environment, monitoring infrastructure.

**Key risks:** CI/CD pipeline requires secrets management.
**Exit criteria:** App fails fast on missing env vars. CI runs tests + lint on every PR.
**Success metrics:** Zero production deployments with missing config. CI feedback within 5 minutes.

**Tasks:** TASK-055 through TASK-057
