# Observability Plan — Yusr Implementation Plan

Last updated: 2026-06-03 00:00

## Current State

- **Logging:** 1 console.log (password reset token — a security issue, not observability)
- **Metrics:** None
- **Traces:** None
- **Error tracking:** None (errors returned as "unknownError" without server-side record)
- **Health checks:** None
- **Alerting:** None

## Target State (After NEXT Milestone)

### Logging (TASK-026)
- **Library:** pino (JSON structured logging)
- **Log levels:** error, warn, info, debug (configurable via LOG_LEVEL env var)
- **What to log:**
  - All server action errors (error level) — via safe-action wrapper (TASK-025)
  - Failed push notifications (warn level) — TASK-030
  - Failed milestone/badge checks (warn level) — TASK-030
  - Auth failures: login attempts, permission denials (info level)
  - Rate limit triggers (warn level) — TASK-002
  - Startup validation results (info level) — TASK-009
- **Context fields:** timestamp, level, userId, actionName, error message, error stack

### Error Boundaries (TASK-028)
- **Dashboard root:** existing error.tsx (catch-all)
- **Admin section:** admin/error.tsx (preserves sidebar)
- **Moderator section:** moderator/error.tsx (preserves sidebar)
- **Student section:** student/error.tsx (preserves sidebar)
- **Error display:** Show error digest in production for support reference

### Loading States (TASK-029)
- **Coverage:** All moderator and admin pages (43 pages)
- **Pattern:** Skeleton UI matching page layout

### Health Check (TASK-032)
- **Endpoint:** GET /api/health
- **Response:** `{ status: "ok"|"degraded"|"down", timestamp, database: "ok"|"down" }`
- **Checks:** Database connectivity via `SELECT 1`

## Observability per Epic

### EPIC-SEC
| What | Type | When |
|------|------|------|
| Failed login attempts | Log (info) | On every failed auth |
| Rate limit triggers | Log (warn) | On rate limit hit |
| Permission denials | Log (info) | On requirePermission failure |
| Account lockout events | Log (warn) | On account lock |

### EPIC-DATA
| What | Type | When |
|------|------|------|
| Transaction failures | Log (error) | On $transaction rollback |
| Race condition retries | Log (warn) | On P2002 retry |
| Validation failures | Log (info) | On Zod safeParse failure |

### EPIC-OBS
| What | Type | When |
|------|------|------|
| Server action errors | Log (error) | On any catch in safe-action |
| Push notification failures | Log (warn) | On sendPush error |
| Milestone check failures | Log (warn) | On checkMilestones error |

### EPIC-PERF
| What | Type | When |
|------|------|------|
| Slow queries (>1s) | Log (warn) | Via Prisma query logging in development |
| Connection pool exhaustion | Log (error) | On pool timeout |

## Future Considerations (Not in Current Plan)

- **APM integration:** Datadog, New Relic, or Sentry for production error tracking
- **Distributed tracing:** OpenTelemetry for request tracing across services
- **Metrics dashboard:** Grafana/Prometheus for request rates, error rates, latency
- **Log aggregation:** CloudWatch, Loki, or ELK for centralized log search
- **SLO/SLA candidates:**
  - Page load time: P95 < 3s
  - Server action success rate: > 99.5%
  - Push notification delivery rate: > 95%
