# Bugs — Yusr Gap Analysis

Last updated: 2026-06-02 23:51

## BUG-001: Banned users can call server actions via requirePermission

**Severity:** Blocker
**File:** server/permissions/require.ts:11-23
**Evidence:** `requirePermission()` only checks `hasPermission()` (role + override). It does NOT check `user.accountStatus`. Actions using `requirePermission` instead of `requireApprovedUser` allow banned/deactivated users with valid JWTs to continue mutating data.
**Impact:** A banned user can create sessions, grade students, manage groups, and perform all moderator/admin actions until their JWT expires.
**Fix:** Add `accountStatus === 'ACTIVE'` check inside `requirePermission()`, or call `requireApprovedUser()` first in all actions that currently only use `requirePermission`.

## BUG-002: JWT token contains stale accountStatus after admin changes

**Severity:** Critical
**File:** server/auth/config.ts:47-53
**Evidence:** JWT callback only sets user data on initial sign-in (`if (user)`). When an admin bans or deactivates a user via `updateAccountStatus`, the JWT retains the old `accountStatus: "ACTIVE"` until the token naturally expires.
**Impact:** Banned users remain active for the full JWT lifetime (could be hours or days depending on config). Combined with BUG-001, this means a ban has no immediate effect.
**Fix:** Either reduce JWT maxAge significantly and add DB-side session validation, or maintain a revocation list checked on each request.

## BUG-003: 68 revalidatePath calls only invalidate Arabic locale

**Severity:** Critical
**File:** server/actions/leave-request.ts:35-37, server/actions/admin.ts:21,47, server/actions/organization.ts:34,52,70 (and 60+ more)
**Evidence:** 68 of 153 `revalidatePath` calls only use `/ar/` prefix without a matching `/en/` call. Examples: `revalidatePath("/ar/admin/feature-flags")`, `revalidatePath("/ar/admin/settings")`, `revalidatePath("/ar/moderator/leave-requests")`.
**Impact:** English-locale users see stale data after mutations. They must hard-refresh to see updates. Affects all admin settings, feature flags, leave requests, organization management, and some session paths.
**Fix:** Replace all hardcoded locale paths with locale-agnostic revalidation: `revalidatePath("/[locale]/admin/settings", "page")` or call both `/ar/` and `/en/` variants.

## BUG-004: hasPermission makes 3 uncached DB queries per call

**Severity:** High
**File:** server/permissions/check.ts:4-34
**Evidence:** `hasPermission()` is NOT wrapped in `cache()` (unlike `getPermissionsForUser`). Each call makes 3 sequential queries: `findUnique(User)`, `findFirst(UserPermissionOverride)`, `findMany(RolePermission)`. When a single page or action calls `hasPermission` multiple times, this multiplies.
**Impact:** Performance degradation on pages that check multiple permissions. Each server action that calls `requirePermission` followed by additional `hasPermission` checks triggers 6+ DB roundtrips for authorization alone.
**Fix:** Wrap `hasPermission` in `cache()`, or refactor to use `getPermissionsForUser` (already cached) and check against the returned set.

## BUG-005: No rate limiting on authentication endpoints

**Severity:** Blocker
**File:** server/actions/auth.ts (login), server/actions/auth.ts (register), server/actions/auth.ts (password reset)
**Evidence:** No rate limiting middleware or logic found anywhere in the codebase. `grep -rn 'rateLimit\|throttle'` returns zero results.
**Impact:** Login endpoint is vulnerable to credential stuffing and brute-force attacks. Registration is vulnerable to spam account creation. Password reset is vulnerable to email bombing.
**Fix:** Add rate limiting middleware. Options: `next-rate-limit`, custom middleware with Redis/memory store, or Cloudflare/Vercel rate limiting at edge.

## BUG-006: No account lockout after failed login attempts

**Severity:** Critical
**File:** server/auth/config.ts:18-43
**Evidence:** The `authorize()` callback returns `null` on failure but does not track failed attempts. No counter, no lockout mechanism.
**Impact:** Unlimited login attempts per account. Combined with BUG-005 (no rate limiting), an attacker can brute-force passwords indefinitely.
**Fix:** Add a `failedLoginAttempts` counter and `lockedUntil` timestamp to the User model. Lock account after N failures. Auto-unlock after a cooldown period.

## BUG-007: Hardcoded /ar/login redirect ignores user locale

**Severity:** High
**File:** server/auth/session.ts:11, server/auth/config.ts:10
**Evidence:** `requireAuth()` redirects to `"/ar/login"` regardless of the user's locale preference. `NextAuth` config also hardcodes `signIn: "/ar/login"`.
**Impact:** English-speaking users are always redirected to the Arabic login page when their session expires.
**Fix:** Use the locale from the request (middleware or cookie) to construct the redirect URL dynamically.

## BUG-008: console.log left in production auth code

**Severity:** Low
**File:** server/actions/auth.ts:99
**Evidence:** `console.log(` found in the auth action file. Debug logging leaking to production stdout.
**Impact:** Minor — clutters logs, potential info leak if logging sensitive data.
**Fix:** Remove the console.log or replace with structured logging.

## BUG-009: Missing transaction in enrollment approval flow

**Severity:** High
**File:** server/services/enrollment.ts:135
**Evidence:** While enrollment approval uses `$transaction`, the `updateAccountStatus` in `server/services/user.ts` and the promote-to-moderator flow do multi-step operations (update user role + create moderator profile) inside a transaction. However, several organization operations (createLevel, createClass, createGroup in `server/actions/organization.ts`) don't wrap their revalidation in error handling — if the service call succeeds but revalidation throws, the action returns undefined instead of success.
**Impact:** Potential inconsistent state if revalidation fails after a successful mutation.
**Fix:** Wrap all action bodies in try/catch and always return either `{ success: true }` or `{ error: ... }`.

## BUG-010: API routes lack CSRF protection

**Severity:** Medium
**File:** app/api/push/subscribe/route.ts, app/api/push/unsubscribe/route.ts
**Evidence:** These API routes use standard POST handlers without explicit CSRF token validation. While Next.js server actions have built-in CSRF protection, API routes do not.
**Impact:** A malicious site could forge requests to subscribe/unsubscribe push notifications for a logged-in user.
**Fix:** Add CSRF token validation to API routes, or convert them to server actions.
