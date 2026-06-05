---
title: Deployment
parent: Technical Documentation
nav_order: 10
---

# Deployment Guide

## Overview

Yusr Academy is designed for containerized deployment using Docker. The application uses a multi-stage build process with standalone output mode for optimized production bundles.

---

## Environment Variables

**File**: `.env.example`

```bash
DATABASE_URL="postgresql://yusr:yusr@localhost:5432/yusr"
AUTH_SECRET="generate-a-secret-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Push Notifications (VAPID)
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yusr.academy
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| AUTH_SECRET | NextAuth session encryption secret | Generate with `openssl rand -base64 32` |
| AUTH_URL | Public URL of the application | `https://yusr.academy` or `http://localhost:3000` |

### Optional Variables (PWA)

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| VAPID_PUBLIC_KEY | Web push public key | `npx web-push generate-vapid-keys` |
| VAPID_PRIVATE_KEY | Web push private key | `npx web-push generate-vapid-keys` |
| VAPID_SUBJECT | Contact email for push service | `mailto:admin@yusr.academy` |

**Note**: If VAPID keys are not set, push notifications will be disabled but the app will still run.

---

## Docker Setup

### Dockerfile

**File**: `Dockerfile`

```dockerfile
FROM node:22-alpine AS base

# --- deps ---
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build ---
FROM base AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm prisma generate
RUN pnpm build

# --- runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/messages ./messages
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma CLI + seed deps for entrypoint migrations
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/lib ./lib
COPY --from=build /app/server ./server
COPY --from=build /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
```

### Docker Entrypoint

**File**: `docker-entrypoint.sh`

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed || echo "Seed skipped or failed (non-fatal)"

echo "Starting Next.js server..."
exec node server.js
```

**What it does**:
1. Runs Prisma migrations (non-destructive, production-safe)
2. Seeds database (idempotent upserts, safe to run multiple times)
3. Starts Next.js server

---

## Docker Compose

**File**: `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: yusr
      POSTGRES_PASSWORD: yusr
      POSTGRES_DB: yusr
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yusr"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://yusr:yusr@db:5432/yusr"
      AUTH_SECRET: "dev-secret-change-in-production"
      AUTH_TRUST_HOST: "true"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

### Running with Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## Database Setup

### PostgreSQL 16

**Minimum Requirements**:
- PostgreSQL 16 or higher
- UTF-8 encoding
- Timezone support
- 2GB RAM (recommended)
- 10GB disk space (for production data)

### Connection Pooling

Yusr uses **PrismaPg adapter** for connection pooling:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
```

**Benefits**:
- Automatic connection pooling
- Better performance under high concurrency
- Prevents "too many connections" errors

---

## Prisma Migrations

### Development

Use `prisma migrate dev` for schema changes during development:

```bash
pnpm db:migrate
```

**What it does**:
1. Applies pending migrations
2. Generates Prisma Client
3. Asks for migration name if schema changed

### Production

Use `prisma migrate deploy` for production deployments:

```bash
npx prisma migrate deploy
```

**What it does**:
1. Applies pending migrations (non-interactive)
2. Does NOT generate Prisma Client (assumes already generated during build)
3. Safe to run multiple times (idempotent)

### Database Push (Development Only)

For rapid prototyping without migration files:

```bash
pnpm db:push
```

**Warning**: DO NOT use in production. Skips migration history and can cause data loss.

---

## Seeding

### Base Seed

**File**: `prisma/seed.ts`

Includes:
- Roles (4)
- Permissions (37)
- Feature flags (18)
- Tajweed categories (6)
- System settings (6)
- Attendance alert config (1 global default)
- Admin user (admin@yusr.academy / admin123456)
- Quran data (114 surahs, 6236 ayahs, juz/hizb/quarter boundaries)
- Demo users (7: admin, moderators, students, support, pending student)
- Demo organization (2 levels, 2 classes, 2 groups)
- Badge definitions (22)
- Memorization plan templates (2)

**Run**:
```bash
pnpm db:seed
```

**Safe to run multiple times** (uses upserts).

### Demo Seed

**File**: `prisma/demo-seed.ts`

**Opt-in**: Set `SEED_DEMO_DATA=true` in `.env`

Includes:
- Full demo sessions with attendance and grades
- Memorization plans and reviews
- Assignments and confirmations
- Announcements
- Support tickets
- Exam templates, instances, and submissions
- Student badges and milestones

**Run**:
```bash
SEED_DEMO_DATA=true pnpm db:seed
```

**Warning**: Adds significant data (100+ records). Use for demo/testing only.

---

## Production Build

### Build Command

```bash
pnpm build
```

**Equivalent to**:
```bash
next build --webpack
```

**Why `--webpack`?**
- Serwist (PWA service worker) requires Webpack
- Turbopack does not support Serwist yet
- Development uses Turbopack (`pnpm dev --turbopack`)
- Production must use Webpack

### Build Output

**Mode**: `standalone`

```
.next/
├── standalone/        # Self-contained server
│   ├── server.js      # Entry point
│   ├── node_modules/  # Production dependencies
│   └── ...
├── static/            # Static assets
└── ...
```

**Standalone mode** bundles:
- Next.js server
- All production dependencies
- Required node_modules

**Does NOT bundle**:
- `public/` directory (must be copied separately)
- `.next/static/` directory (must be copied separately)

**Dockerfile handles this**:
```dockerfile
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
```

---

## Deployment Platforms

### Docker-Based

**Recommended platforms**:
- **AWS ECS/Fargate** - Managed container service
- **Google Cloud Run** - Serverless containers
- **Azure Container Instances** - Serverless containers
- **DigitalOcean App Platform** - PaaS with Docker support
- **Railway** - Simple Docker deployment
- **Render** - Docker + managed PostgreSQL

### Configuration Example (Railway)

1. Create new project
2. Add PostgreSQL service
3. Add web service (Docker)
4. Set environment variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   AUTH_SECRET=<generate with openssl>
   AUTH_URL=https://yusr.railway.app
   ```
5. Deploy (Railway auto-builds from Dockerfile)

### Configuration Example (Vercel)

**Limitation**: Vercel does not support long-running database migrations in serverless functions.

**Workaround**:
1. Run migrations separately (not in build step)
2. Use Vercel Postgres or external PostgreSQL
3. Disable service worker (Serwist requires server runtime)

**Not recommended** due to Serwist incompatibility.

---

## Database Backups

### PostgreSQL Backup

```bash
# Backup
docker exec yusr-db pg_dump -U yusr yusr > backup.sql

# Restore
docker exec -i yusr-db psql -U yusr yusr < backup.sql
```

### Automated Backups (Production)

**Recommended tools**:
- **AWS RDS Automated Backups**
- **Google Cloud SQL Automated Backups**
- **pg_dump cron job** (self-hosted)
- **Backup service** (e.g., BackupNinja, Wal-E)

**Schedule**: Daily at 2 AM UTC

**Retention**: 7 days (minimum), 30 days (recommended)

---

## Monitoring & Logging

### Application Logs

Docker Compose logs:
```bash
docker-compose logs -f app
```

Production logging (structured JSON):
```typescript
console.log(JSON.stringify({
  level: "info",
  message: "User logged in",
  userId: "...",
  timestamp: new Date().toISOString(),
}));
```

**Log aggregation**:
- **AWS CloudWatch Logs**
- **Google Cloud Logging**
- **Datadog**
- **Sentry** (for errors)

### Health Checks

**Endpoint**: `/api/health` (to be implemented)

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 500 });
  }
}
```

**Docker health check**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Performance Monitoring

**Recommended tools**:
- **Vercel Analytics** (if using Vercel)
- **New Relic** (APM)
- **Datadog** (APM + logs)
- **Sentry Performance** (errors + performance)

---

## Security Considerations

### Environment Variables

**DO NOT**:
- Commit `.env` to version control
- Use default/weak secrets in production
- Share production secrets via Slack/email

**DO**:
- Use secret management (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets per environment (dev, staging, prod)

### Database

**DO**:
- Use strong passwords (20+ chars, random)
- Restrict network access (firewall, VPC)
- Enable SSL/TLS connections
- Regular backups

### Application

**DO**:
- Keep dependencies updated (`pnpm update`)
- Use non-root user in Docker (already configured)
- Enable HTTPS (reverse proxy or platform-managed)
- Set secure headers (CSP, HSTS, etc.)

---

## Scaling

### Horizontal Scaling

Yusr is **stateless** and can be scaled horizontally:

```yaml
# docker-compose.yml (multiple app instances)
services:
  app:
    deploy:
      replicas: 3
```

**Load balancer** required (nginx, HAProxy, cloud-managed).

### Database Scaling

**Vertical scaling** (recommended for most use cases):
- Increase PostgreSQL instance size (CPU, RAM)
- Upgrade to larger RDS/Cloud SQL instance

**Read replicas** (for high read traffic):
- Configure Prisma read replicas
- Route read-only queries to replicas

**Connection pooling**:
- Already handled by PrismaPg adapter
- For very high concurrency, consider PgBouncer

---

## Rollback Procedure

### Application Rollback

```bash
# Docker tag-based deployment
docker pull yusr:v1.2.3  # Previous version
docker-compose up -d
```

### Database Rollback

**Caution**: Database migrations are harder to rollback.

**Forward-only migrations** (recommended):
- Avoid destructive changes (dropping columns, tables)
- Use feature flags to disable new features
- Fix issues with new migrations, not rollbacks

**If rollback required**:
1. Restore database from backup
2. Redeploy previous application version
3. Verify data integrity

---

## Troubleshooting

### Build Fails

**Error**: `Cannot find module './generated/prisma/client'`

**Fix**: Run `pnpm prisma generate` before build.

### Migration Fails

**Error**: `Migration failed: relation "User" already exists`

**Fix**: Database is out of sync. Reset development database:
```bash
pnpm prisma migrate reset  # CAUTION: Deletes all data
```

### Connection Timeout

**Error**: `Can't reach database server at db:5432`

**Fix**:
1. Check `DATABASE_URL` is correct
2. Ensure database container is healthy: `docker-compose ps`
3. Check network connectivity

### Service Worker Not Loading

**Error**: `Failed to register service worker`

**Fix**:
1. Ensure app is served over HTTPS (or localhost)
2. Check `public/sw.js` exists
3. Verify Serwist built correctly (check build logs)

---

## Maintenance Windows

**Recommended schedule**:
- **Database migrations**: Tuesday 2-3 AM UTC (low traffic)
- **Dependency updates**: Monthly
- **Security patches**: As needed (within 24-48 hours)

**Communication**:
- Notify users 24 hours in advance
- Display banner during maintenance window
- Post-maintenance verification (smoke tests)

---

## Production Checklist

- [ ] Environment variables set (no defaults)
- [ ] `AUTH_SECRET` generated with `openssl rand -base64 32`
- [ ] Database backed up before migration
- [ ] Migrations tested in staging environment
- [ ] Service worker icons exist (`public/icons/`)
- [ ] VAPID keys generated for push notifications
- [ ] Health check endpoint implemented and tested
- [ ] Monitoring/logging configured
- [ ] SSL/TLS enabled
- [ ] Database connection pooling verified
- [ ] Feature flags configured per environment
- [ ] Admin user password changed from default
- [ ] Demo data disabled (`SEED_DEMO_DATA` unset)

---

## Cost Estimation (Monthly)

**Small deployment** (100-500 users):
- **Database**: $25 (DigitalOcean Managed PostgreSQL, 1GB RAM)
- **App**: $10 (DigitalOcean App Platform, 512MB)
- **Total**: ~$35/month

**Medium deployment** (500-2000 users):
- **Database**: $50 (2GB RAM)
- **App**: $20 (1GB RAM, 2 instances)
- **Total**: ~$70/month

**Large deployment** (2000+ users):
- **Database**: $100+ (4GB+ RAM, read replicas)
- **App**: $50+ (multiple instances, load balancer)
- **Total**: ~$150+/month
