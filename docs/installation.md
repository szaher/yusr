---
title: Installation
nav_order: 3
---

# Installation & Deployment

## Docker (Recommended)

The fastest way to get started:

```bash
git clone https://github.com/szaher/yusr.git
cd yusr
docker-compose up -d
```

The app will be available at `http://localhost:3000`.

Default admin credentials: `admin@yusr.academy` / `admin123456`

### Production Docker

Update `docker-compose.yml`:
- Change `AUTH_SECRET` to a strong random value
- Change PostgreSQL password
- Add VAPID keys for push notifications
- Mount a volume for `./uploads` if using audio recording

## Manual Setup

### 1. Prerequisites

```bash
# Install Node.js 22
# Install PostgreSQL 16
# Install pnpm
npm install -g pnpm
```

### 2. Clone and install

```bash
git clone https://github.com/szaher/yusr.git
cd yusr
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

### 4. Set up database

```bash
pnpm prisma generate
pnpm prisma db push
pnpm prisma db seed
```

### 5. Run

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Health Check

The app exposes a health check endpoint:

```
GET /api/health
→ { "status": "ok", "timestamp": "..." }
```

Returns 503 if the database is unreachable.
