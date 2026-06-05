# Scorecard — Yusr Gap Analysis

Last updated: 2026-06-02 23:52

## Overall Health: 5.0 / 10

| Dimension | Score | Grade | Key Issue |
|-----------|-------|-------|-----------|
| **Security** | 4/10 | D | Banned users bypass, no rate limiting, stale JWT, IDOR bugs |
| **Data Integrity** | 6/10 | C | Transactions used in key paths but 8 services lack them; 9 N+1 patterns |
| **Error Handling** | 3/10 | F | 13 actions unprotected, 1 error boundary, silenced push errors |
| **Observability** | 1/10 | F | Zero logging, zero metrics, zero health checks |
| **Test Coverage** | 2/10 | F | 1 unit test, 10 e2e specs, 0 moderator/workflow tests |
| **Performance** | 5/10 | D | Good indexing overall but 3 unbounded queries, 9 N+1 patterns |
| **i18n** | 5/10 | D | Translations complete, but 68 stale-cache bugs + hardcoded redirects |
| **UX Completeness** | 6/10 | C | Core flows work, missing search/filter/pagination/export |
| **Architecture** | 7/10 | B- | Clean separation, RBAC, Zod validation; lacks centralized patterns |
| **Operations** | 2/10 | F | No CI/CD, no env validation, no deployment automation |

## Strengths

- Clean service/action separation with Zod validation on most inputs
- Proper bcrypt password hashing (12 rounds)
- No raw SQL anywhere — Prisma ORM eliminates SQL injection
- Transactions used in critical paths (enrollment, session creation, assignment creation)
- Comprehensive i18n translation keys
- PWA with push notification infrastructure
- Audit logging for key operations

## Critical Weaknesses

1. **Security enforcement gap**: requirePermission != requireApprovedUser, creating a bypass for banned users
2. **Zero observability**: Production errors are invisible
3. **Almost no test coverage**: Regressions will be caught by users, not CI
4. **i18n cache bugs**: 44% of revalidatePath calls break English locale
