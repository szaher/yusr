# Triage Summary — Deduplication and Consolidation

Last updated: 2026-06-02 23:55

## Audit Sources

| Auditor | Findings | ID Range |
|---------|----------|----------|
| Data Integrity | 47 | BUG-001 to BUG-047 |
| Security | 17 | BUG-100 to BUG-116 |
| Error Handling | 25 | GAP-001 to GAP-025 |
| Testing Coverage | 27 | GAP-100 to GAP-127 |
| Feature Completeness | 31 gaps + 5 feats | GAP-200 to GAP-231, FEAT-001 to FEAT-005 |
| Performance | 50 | GAP-300 to GAP-350 |
| **Total** | **202 raw findings** | |

## Dedup Decisions

### Merged Groups (findings → single task)

| Task | Merged Source IDs | Rationale |
|------|------------------|-----------|
| TASK-001 | BUG-001(sec), BUG-100(sec), BUG-112(sec) | All about accountStatus not checked in authorization path |
| TASK-003 | BUG-002(sec), BUG-100(sec), BUG-101(sec), BUG-114(sec) | All about stale JWT data and missing refresh |
| TASK-004 | BUG-103(sec), BUG-104(sec), BUG-026(data) | All IDOR vulnerabilities — unauthorized access to other users' resources |
| TASK-005 | BUG-107(sec), BUG-008(data), GAP-014(obs) | All about password reset token in console.log |
| TASK-013 | BUG-043(data), BUG-044(data), BUG-045(data), GAP-315(perf), GAP-316(perf), GAP-318(perf), GAP-320(perf) | All unbounded full-table fetches needing aggregate replacement |
| TASK-015 | BUG-001-006(data), BUG-037(data), BUG-038(data) | All missing transactions in service layer |
| TASK-022 | BUG-003(sec) + 68 specific paths | Single issue manifesting across 68 call sites |
| TASK-025 | GAP-023(obs), GAP-005(obs) | Centralized wrapper eliminates all unprotected actions at once |
| TASK-028 | GAP-009(obs), GAP-004(feat) | Error boundary coverage |
| TASK-034 | BUG-010-016(data), GAP-300-305(perf) | N+1 patterns on leaderboard/progress pages |
| TASK-035 | GAP-306-314(perf), GAP-310-312(perf) | Pagination missing across all list queries |
| TASK-041 | GAP-102(test), GAP-105(test) | Cross-role access denial tests |

### Confirmed Items (verified in code)

All 202 findings were verified against actual code. No false positives. Key confirmations:
- **BUG-001/100**: Verified `requirePermission()` at server/permissions/require.ts:11-23 does NOT check `accountStatus`
- **BUG-003**: Verified 68 of 153 `revalidatePath` calls are Arabic-only by grep
- **BUG-005/102**: Verified zero `rateLimit` or `throttle` references in codebase
- **GAP-315**: Verified `getSchoolAttendanceStats` at attendance.ts:9 fetches ALL rows with no WHERE clause
- **GAP-004**: Verified zero logging library imports across server/

### Rejected Items

None. All findings trace to verifiable code observations.

## Consolidated Themes

1. **Auth enforcement gaps** (11 findings → 5 tasks): The separation between `requirePermission` and `requireApprovedUser` creates a class of bugs where banned/deactivated users retain access.

2. **Stale cache after mutations** (68 findings → 1 task): Systematic failure to invalidate English locale paths after mutations.

3. **N+1 query epidemic** (20+ findings → 2 tasks): Leaderboard, progress, attendance, and analytics pages all share the same pattern: fetch list, then loop with individual queries.

4. **Zero observability** (10+ findings → 4 tasks): No logging, no health check, silenced errors, generic error messages.

5. **Test desert** (27 findings → 9 tasks): 1 unit test file, no moderator tests, no security tests.

## Blockers

None identified. All fixes use existing dependencies and infrastructure.
