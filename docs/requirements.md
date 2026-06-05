---
title: Requirements
nav_order: 2
---

# System Requirements

## Server Specifications

| Tier | CPU | RAM | Storage | Users |
|------|-----|-----|---------|-------|
| Minimum | 1 vCPU | 1 GB | 10 GB | ~50 concurrent |
| Recommended | 2 vCPU | 2 GB | 20 GB | ~200 concurrent |
| Comfortable | 2 vCPU | 4 GB | 50 GB | 500+ users |

## Software Dependencies

| Software | Version | Required |
|----------|---------|----------|
| Node.js | 22.x | Yes |
| PostgreSQL | 16.x | Yes |
| pnpm | 9.x+ | Yes |
| Docker | 24.x+ | Optional (for containerized deployment) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (min 32 chars, no "dev-secret" in production) |
| `VAPID_PUBLIC_KEY` | No | Web Push public key |
| `VAPID_PRIVATE_KEY` | No | Web Push private key (required if public key is set) |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `UPLOAD_DIR` | No | Local upload directory (default: `./uploads`) |
| `S3_BUCKET` | No | S3 bucket name (required if STORAGE_PROVIDER=s3) |
| `S3_REGION` | No | S3 region (required if STORAGE_PROVIDER=s3) |
| `S3_ACCESS_KEY` | No | S3 access key |
| `S3_SECRET_KEY` | No | S3 secret key |
| `DATABASE_POOL_SIZE` | No | Connection pool size (default: 20) |
| `LOG_LEVEL` | No | Logging level: error, warn, info, debug (default: info) |

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- Mobile: iOS Safari 15+, Chrome Android 90+

## Ports

| Port | Service |
|------|---------|
| 3000 | Next.js application |
| 5432 | PostgreSQL database |
