# Dependencies — Task Dependency Graph

Last updated: 2026-06-02 23:55

## Dependency Graph (DAG)

### EPIC-SEC
```
TASK-001 (accountStatus check)        → no deps (start here)
TASK-002 (rate limiting)              → no deps
TASK-003 (JWT refresh + maxAge)       → TASK-001
TASK-004 (IDOR fixes)                 → no deps
TASK-005 (remove token log)           → no deps (start here)
TASK-006 (moderator ownership)        → no deps
TASK-007 (auth middleware)            → TASK-001
TASK-008 (account lockout)            → TASK-002
TASK-009 (env validation)             → no deps
TASK-010 (token cleanup)              → no deps
TASK-011 (session invalidation)       → TASK-003
```

### EPIC-DATA
```
TASK-012 (exam grading tx)            → no deps
TASK-013 (unbounded query fix)        → no deps (start here)
TASK-014 (confirmListening race)      → no deps
TASK-015 (service transactions)       → no deps
TASK-016 (Zod validation)             → no deps
TASK-017 (JSON.parse safety)          → no deps
TASK-018 (soft-delete)                → no deps
TASK-019 (cascade declarations)       → no deps
TASK-020 (exam race conditions)       → TASK-012
TASK-021 (DB indexes)                 → no deps
```

### EPIC-I18N
```
TASK-022 (revalidatePath fix)         → no deps (start here)
TASK-023 (redirect locale fix)        → no deps
TASK-024 (hardcoded strings)          → no deps
```

### EPIC-OBS
```
TASK-025 (safe-action wrapper)        → no deps (start here)
TASK-026 (structured logging)         → no deps
TASK-027 (error logging)              → TASK-025, TASK-026
TASK-028 (error boundaries)           → no deps
TASK-029 (loading.tsx)                → no deps
TASK-030 (fire-and-forget fix)        → TASK-026
TASK-031 (notFound in pages)          → no deps
TASK-032 (health check)               → no deps
```

### EPIC-PERF
```
TASK-033 (permission caching)         → no deps
TASK-034 (N+1 fixes)                  → no deps
TASK-035 (pagination)                 → no deps
TASK-036 (batch exam operations)      → TASK-012
TASK-037 (connection pooling)         → no deps
TASK-038 (i18n bundle split)          → no deps
TASK-039 (revalidateTag)              → TASK-022
```

### EPIC-TEST
```
TASK-040 (auth guard tests)           → TASK-001
TASK-041 (security E2E)              → TASK-001, TASK-007
TASK-042 (enrollment tests)           → no deps
TASK-043 (exam tests)                 → TASK-012
TASK-044 (session tests)              → no deps
TASK-045 (memorization tests)         → no deps
TASK-046 (moderator E2E)             → TASK-029
TASK-047 (student E2E)               → TASK-029
TASK-048 (CI pipeline)               → TASK-040, TASK-042
```

### EPIC-UX
```
TASK-049 (confirmation dialogs)       → no deps
TASK-050 (search/filter)              → TASK-035
TASK-051 (password change)            → no deps
TASK-052 (CSV export)                 → TASK-035
TASK-053 (org CRUD)                   → no deps
TASK-054 (dark mode fixes)            → no deps
```

### EPIC-OPS
```
TASK-055 (env validation)             → no deps
TASK-056 (dead dependency)            → no deps
TASK-057 (CI/CD pipeline)             → TASK-048
```

## Critical Path

The longest dependency chain:

```
TASK-001 → TASK-003 → TASK-011 (security chain: 3 steps)
TASK-001 → TASK-007 → TASK-041 (auth middleware → security E2E: 3 steps)
TASK-025 → TASK-027 (safe wrapper → error logging: 2 steps)
TASK-012 → TASK-020 → TASK-036 → TASK-043 (exam fixes → tests: 4 steps)
TASK-040 → TASK-048 → TASK-057 (tests → CI → CD: 3 steps)
```

**Critical path:** TASK-012 → TASK-020 → TASK-036 → TASK-043 (exam integrity chain, 4 steps)

## Parallelization Opportunities

These groups can run concurrently:

**Batch 1 (NOW, no deps):**
- TASK-001, TASK-002, TASK-004, TASK-005, TASK-006, TASK-009
- TASK-012, TASK-013, TASK-014, TASK-015, TASK-016, TASK-017
- TASK-022, TASK-023, TASK-024

**Batch 2 (NOW, after Batch 1):**
- TASK-003, TASK-007, TASK-008
- TASK-018, TASK-019, TASK-020, TASK-021
- TASK-010, TASK-011

**Batch 3 (NEXT, no deps):**
- TASK-025, TASK-026, TASK-028, TASK-029, TASK-031, TASK-032
- TASK-033, TASK-034, TASK-035, TASK-037, TASK-038

**Batch 4 (NEXT, after Batch 3):**
- TASK-027, TASK-030, TASK-036, TASK-039
- TASK-040, TASK-041, TASK-042, TASK-043, TASK-044, TASK-045, TASK-046, TASK-047

**Batch 5 (LATER):**
- All EPIC-UX and EPIC-OPS tasks (mostly independent)
