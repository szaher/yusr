# Testing Plan — Yusr Implementation Plan

Last updated: 2026-06-03 00:00

## Current State

| Category | Files | Test Cases | Coverage |
|----------|-------|------------|----------|
| Unit tests (Vitest) | 1 | 4 | ~1% of server layer |
| E2E tests (Playwright) | 12 | ~47 | ~15-20% of user flows |
| Component tests | 0 | 0 | 0% |

## Target State

| Category | Files | Test Cases | Coverage Target |
|----------|-------|------------|----------------|
| Unit tests | 15+ | 100+ | >60% of server/services |
| E2E tests | 20+ | 80+ | >50% of user flows |
| Component tests | 0 | 0 | Deferred (LATER) |

## Coverage Map by Epic

### EPIC-SEC (Security)
| What to test | Test type | Task | Priority |
|-------------|-----------|------|----------|
| requirePermission rejects banned users | Unit | TASK-040 | P0 |
| requireApprovedUser redirects non-ACTIVE | Unit | TASK-040 | P0 |
| authorize callback rejects invalid input | Unit | TASK-040 | P0 |
| Cross-role access denial (student→admin) | E2E | TASK-041 | P0 |
| Rate limiting triggers on auth endpoints | Integration | TASK-002 | P0 |
| IDOR: cross-user notification marking fails | Unit | TASK-004 | P0 |
| Moderator ownership check on memorization | Unit | TASK-006 | P1 |

### EPIC-DATA (Data Integrity)
| What to test | Test type | Task | Priority |
|-------------|-----------|------|----------|
| Exam grading atomicity | Unit | TASK-043 | P1 |
| Aggregate queries match manual calculation | Unit | TASK-013 | P0 |
| confirmListening respects count limit | Unit | TASK-014 | P1 |
| Zod validation rejects bad input | Unit | TASK-016 | P1 |
| JSON.parse error handling | Unit | TASK-017 | P1 |

### EPIC-OBS (Observability)
| What to test | Test type | Task | Priority |
|-------------|-----------|------|----------|
| Safe-action wrapper logs errors | Unit | TASK-025 | P1 |
| Error boundary renders on simulated error | E2E | TASK-028 | P1 |
| Health check returns 200/503 | Integration | TASK-032 | P2 |

### EPIC-TEST (Core Business Logic)
| What to test | Test type | Task | Priority |
|-------------|-----------|------|----------|
| Enrollment lifecycle | Unit | TASK-042 | P1 |
| Exam lifecycle | Unit | TASK-043 | P1 |
| Session/attendance lifecycle | Unit | TASK-044 | P1 |
| Memorization plan/review lifecycle | Unit | TASK-045 | P1 |
| Moderator workflows | E2E | TASK-046 | P1 |
| Student workflows | E2E | TASK-047 | P1 |

## Test Data Strategy

### Unit Tests
- Use Vitest mocks for Prisma client (`vi.mock("@/server/db/client")`).
- Create factory functions for test data: `createTestUser()`, `createTestGroup()`, `createTestSession()`.
- Store factories in `server/__tests__/factories.ts`.

### E2E Tests
- Use existing `e2e/fixtures.ts` TestDb helper for database operations.
- Use existing `loginAs` fixture for authentication.
- Create test data in `global-setup.ts`: admin, moderator, student users; a level/class/group hierarchy; sample assignments and sessions.
- Clean up test data in `global-teardown.ts`.

### Test Database
- Use a separate PostgreSQL database for tests (TEST_DATABASE_URL).
- Run `prisma db push` before test suite.
- Seed Quran reference data (required for memorization tests).
- Use transactions for test isolation where possible.

## Regression Suite

### Critical Path Tests (must pass before any deploy)
1. Login/logout flow (existing)
2. Registration + approval flow (existing)
3. Role-based access denial (TASK-041)
4. Auth guard enforcement (TASK-040)
5. Exam grading integrity (TASK-043)

### Smoke Tests (run after deploy)
1. Health check endpoint returns 200
2. Admin dashboard loads
3. Student dashboard loads
4. Moderator dashboard loads

## CI Integration

See TASK-048. Pipeline:
1. Install dependencies
2. Lint + type-check
3. Unit tests (Vitest)
4. E2E tests (Playwright with PostgreSQL service container)
5. Report coverage to PR
