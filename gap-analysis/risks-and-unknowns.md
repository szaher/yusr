# Risks and Unknowns — Yusr Gap Analysis

Last updated: 2026-06-02 23:52

## Confirmed Risks

### R1: Banned user access (CONFIRMED — code verified)
A banned user with an active JWT can call any server action that uses `requirePermission()` instead of `requireApprovedUser()`. This is the #1 security risk.
**Probability:** Certain (structural flaw)
**Impact:** Critical

### R2: Credential brute-force (CONFIRMED — no rate limiting found)
Login, registration, and password reset endpoints have zero rate limiting. No account lockout mechanism exists.
**Probability:** High in production
**Impact:** Critical

### R3: Data staleness for English users (CONFIRMED — 68 paths)
English-locale users will see stale data after mutations due to missing revalidatePath calls. This is not hypothetical — it is a confirmed bug affecting 44% of all cache invalidation calls.
**Probability:** Certain
**Impact:** High (data integrity perception)

### R4: N+1 query explosion at scale (CONFIRMED — 9 patterns)
Leaderboard, progress, and attendance pages issue O(N) queries per student. A school with 200 students would generate 400-800 queries per page load.
**Probability:** Certain at >50 students
**Impact:** High (performance degradation → timeout)

### R5: Unbounded memory consumption (CONFIRMED — 3 queries)
`getSchoolAttendanceStats`, `getAttendanceGroupComparison`, and `getAdminKPIs` fetch entire tables into memory without filters.
**Probability:** Certain as data grows
**Impact:** Critical (OOM crash)

## Unconfirmed / Requires Investigation

### U1: JWT expiry configuration
NextAuth defaults to 30-day JWT. Need to verify if this is acceptable for the deployment context, or if shorter TTL is needed.

### U2: Push notification delivery reliability
Fire-and-forget pattern means delivery success/failure is unknown. Need to instrument to measure actual delivery rate.

### U3: Concurrent user load profile
Unknown: how many concurrent moderators will be grading simultaneously? This affects whether race conditions in exam grading are theoretical or practical.

### U4: Database connection pool sizing
Using default PrismaPg adapter settings. Unknown if these are appropriate for the expected concurrent connection count.

### U5: File/media storage strategy
voiceNoteUrl fields exist in schema but no file upload/storage infrastructure found. Unknown if this is planned or deferred.

## Blockers

None identified. All fixes can proceed with current infrastructure and access.
