# Roadmap — Yusr Implementation Plan

Last updated: 2026-06-02 23:55

## Milestone Overview

```
NOW (Week 1-2)          NEXT (Week 3-4)         LATER (Week 5+)
├─ EPIC-SEC (11 tasks)  ├─ EPIC-OBS (8 tasks)   ├─ EPIC-UX (6 tasks)
├─ EPIC-DATA (10 tasks) ├─ EPIC-PERF (7 tasks)  └─ EPIC-OPS (3 tasks)
└─ EPIC-I18N (3 tasks)  └─ EPIC-TEST (9 tasks)
   24 tasks                24 tasks                 9 tasks
```

---

## NOW — Security, Data Integrity, i18n (Week 1-2)

**Why first:** These are correctness and security bugs. Banned users can bypass authorization. English users see stale data. Exam grading can corrupt data. Unbounded queries will OOM at scale. None of these should exist in a production system.

### Epics Included

- **EPIC-SEC** (TASK-001 to TASK-011): Fix auth enforcement, add rate limiting, secure JWT lifecycle, fix IDOR bugs
- **EPIC-DATA** (TASK-012 to TASK-021): Transaction wrapping, unbounded query fixes, input validation, JSON safety
- **EPIC-I18N** (TASK-022 to TASK-024): Fix 68 revalidatePath calls, fix hardcoded redirects

### Entry Criteria
- Development environment running
- Database access available
- No active feature work that could conflict

### Exit Criteria
- All P0 tasks completed and verified
- All P1 tasks in NOW milestone completed
- No banned user can call any server action
- Rate limiting active on login/register/reset
- No Arabic-only revalidatePath calls remain
- Exam grading is transactional
- No unbounded full-table fetches

### Release Strategy
- No feature flags needed — these are bug fixes
- No database migrations needed (except adding indexes)
- Rollback: git revert individual commits
- Deploy incrementally: security fixes first, then data fixes, then i18n fixes

### Sequencing Rationale
1. TASK-001 (accountStatus check) first — closes the biggest security hole
2. TASK-005 (remove token log) — immediate security fix, zero risk
3. TASK-002 (rate limiting) — depends on nothing, high impact
4. TASK-012 (exam transaction) — most critical data integrity fix
5. TASK-013 (unbounded queries) — prevents production OOM
6. TASK-022 (revalidatePath) — fixes stale cache for all English users
7. Remaining tasks in parallel

---

## NEXT — Observability, Performance, Tests (Week 3-4)

**Why second:** NOW fixes correctness bugs. NEXT establishes the reliability foundation: logging so you can see errors, tests so you can catch regressions, and performance so pages load in under 3 seconds.

### Epics Included

- **EPIC-OBS** (TASK-025 to TASK-032): Structured logging, safe-action wrapper, error boundaries, loading states
- **EPIC-PERF** (TASK-033 to TASK-039): Permission caching, N+1 fixes, pagination, connection pooling
- **EPIC-TEST** (TASK-040 to TASK-048): Auth tests, service tests, E2E tests, CI pipeline

### Entry Criteria
- NOW milestone complete
- Security fixes verified
- Data integrity fixes verified

### Exit Criteria
- All server actions use safe-action wrapper (logs errors, checks auth consistently)
- Nested error boundaries at role level
- Loading.tsx on all data-heavy pages
- hasPermission cached per request
- Leaderboard/progress pages issue <10 queries
- All list queries paginated with defaults
- Auth guard unit tests passing
- E2E tests for moderator and student workflows
- CI pipeline runs on every PR

### Release Strategy
- TASK-025 (safe-action wrapper) is the highest-risk change — deploy first, verify existing actions work
- Performance fixes are safe to batch
- Test infrastructure can be set up in parallel with code changes
- Feature flag: none needed

### Sequencing Rationale
1. TASK-025 (safe-action wrapper) first — enables TASK-026 and TASK-027
2. TASK-026 (logging) — foundation for all observability
3. TASK-040/041 (security tests) — validates NOW fixes are regression-proof
4. TASK-033 (permission caching) — easy win, big impact
5. TASK-034 (N+1 fixes) — most impactful perf improvement
6. TASK-035 (pagination) — needed before E2E tests can be stable
7. E2E tests last — require stable pages to test against

---

## LATER — UX Polish, Operations (Week 5+)

**Why last:** These improve developer experience, admin UX, and operational maturity. Important but not blocking correctness or reliability.

### Epics Included

- **EPIC-UX** (TASK-049 to TASK-054): Confirmation dialogs, search/filter, password change, CSV export, CRUD completeness
- **EPIC-OPS** (TASK-055 to TASK-057): Env validation, dead dependency removal, CI/CD

### Entry Criteria
- NEXT milestone complete
- Test coverage established
- CI pipeline running

### Exit Criteria
- Destructive actions have confirmation dialogs
- Key list pages have search and pagination UI
- Admin can export CSV reports
- Organization entities (levels, classes, groups) can be edited and deleted
- CI/CD deploys automatically on merge to main
- App fails fast on missing env vars

### Release Strategy
- Each task is independent and can ship individually
- Feature flags recommended for CSV export (new API endpoint)
- Low risk — these are additive features

### Sequencing Rationale
- TASK-055 (env validation) first — quick win for production safety
- TASK-049 (confirmation dialogs) — prevents accidental data loss
- TASK-053 (org CRUD) — enables admin self-service
- TASK-050 (search/filter) — biggest UX improvement
- TASK-052 (CSV export) and TASK-057 (CI/CD) can run in parallel
