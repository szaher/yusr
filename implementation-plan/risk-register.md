# Risk Register — Yusr Implementation Plan

Last updated: 2026-06-03 00:00

## Technical Risks

### TR-1: Safe-action wrapper breaks existing action return types
**Probability:** Medium
**Impact:** High — all forms relying on `{ error: ... }` responses could break
**Mitigation:** Migrate incrementally. Start with exam actions (most complex). Verify each migration with existing E2E tests before proceeding. Keep backward-compatible return type.
**Task:** TASK-025

### TR-2: JWT refresh mechanism adds latency to every request
**Probability:** Medium
**Impact:** Medium — 5-minute check interval means 1 extra DB query every 5 minutes per user
**Mitigation:** Use `lastChecked` timestamp in JWT to avoid checking every request. Cache user status in Redis for multi-instance deployments.
**Task:** TASK-003

### TR-3: N+1 fix calculations differ from current implementation
**Probability:** Low
**Impact:** High — leaderboard rankings or progress percentages could change
**Mitigation:** Write comprehensive unit tests comparing batch query results with current per-item results. Run both implementations in parallel during migration.
**Task:** TASK-034

### TR-4: Pagination changes break existing UI components
**Probability:** Low
**Impact:** Medium — pages that render full lists may need UI changes
**Mitigation:** Add pagination with high default limit (50). Existing pages work unchanged until UI pagination controls are added.
**Task:** TASK-035

### TR-5: Auth middleware conflicts with i18n middleware
**Probability:** Medium
**Impact:** High — could break routing for all users
**Mitigation:** Test middleware composition carefully. Use NextAuth's `auth()` helper which is designed to work alongside other middleware. Test with both locales.
**Task:** TASK-007

### TR-6: Rate limiting false positives in shared-IP environments
**Probability:** Medium
**Impact:** Medium — multiple users behind same NAT could trigger limits
**Mitigation:** Use combined IP + email rate limiting. Set reasonable thresholds (5/min login, not 3/min). Include Retry-After header.
**Task:** TASK-002

## Product Risks

### PR-1: Pagination disrupts admin workflow expectations
**Probability:** Low
**Impact:** Low — admins may expect to see all data on one page
**Mitigation:** Default limit of 50 covers most schools. Add "show all" option for small datasets. CSV export provides full data access.
**Task:** TASK-035, TASK-052

### PR-2: Loading skeletons don't match actual page layout
**Probability:** Medium
**Impact:** Low — visual mismatch between skeleton and loaded page causes layout shift
**Mitigation:** Create reusable skeleton components matching common page patterns (table, card grid, form).
**Task:** TASK-029

## Migration Risks

### MR-1: Schema migration for account lockout fields
**Probability:** Low
**Impact:** Low — adding nullable fields to User model has no downtime risk
**Mitigation:** Use `prisma db push` for non-production. Use `prisma migrate` for production with reviewed migration SQL.
**Task:** TASK-008

### MR-2: Schema migration for tokenVersion field
**Probability:** Low
**Impact:** Low — adding an Int field with default 0 is backward-compatible
**Mitigation:** Existing JWTs without tokenVersion are treated as version 0 (matches default).
**Task:** TASK-011

### MR-3: Schema migration for soft-delete fields
**Probability:** Low
**Impact:** Medium — adding `deletedAt` requires updating all queries to filter by `deletedAt IS NULL`
**Mitigation:** Add queries incrementally. Use a Prisma middleware or `$extends` to auto-filter deleted records.
**Task:** TASK-018

### MR-4: Index addition on large tables
**Probability:** Low
**Impact:** Low — Announcement and ExamInstance tables are small, index creation is fast
**Mitigation:** CREATE INDEX CONCURRENTLY in production to avoid table locks.
**Task:** TASK-021

## Security Risks

### SR-1: Insufficient JWT refresh interval allows exploitation window
**Probability:** Medium
**Impact:** Medium — a 5-minute window exists after a ban before the JWT refreshes
**Mitigation:** 5 minutes is a practical trade-off. For immediate enforcement, add a blacklist check (not in current scope). Document the 5-minute window.
**Task:** TASK-003

### SR-2: Rate limiting bypass via distributed IPs
**Probability:** Low
**Impact:** Medium — sophisticated attackers can use rotating IPs
**Mitigation:** Combine IP + email rate limiting. Account lockout (TASK-008) provides per-account protection regardless of IP.
**Task:** TASK-002, TASK-008

### SR-3: IDOR fixes may have other unidentified instances
**Probability:** Medium
**Impact:** High — identified 2 IDOR bugs, but other endpoints may have similar issues
**Mitigation:** The safe-action wrapper (TASK-025) creates a pattern for ownership verification. Security E2E tests (TASK-041) catch regressions. Consider a focused IDOR audit after TASK-041.
**Task:** TASK-004, TASK-041

## Rollback Plan

All changes are backward-compatible and can be reverted via `git revert`:
- **Security fixes:** Reverting removes protection, so avoid reverting unless the fix itself causes issues. Prefer hotfix.
- **Performance fixes:** Reverting restores previous (slow but correct) behavior.
- **Test additions:** Tests are additive; reverting is harmless.
- **Schema migrations:** Adding columns/indexes is safe to revert. Soft-delete (TASK-018) requires more care — ensure no records have been soft-deleted before reverting.
