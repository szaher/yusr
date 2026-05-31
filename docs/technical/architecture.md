# System Architecture

## Overview

Yusr Academy is a Next.js 16 Quran memorization platform built with a modern, server-first architecture leveraging React Server Components, Server Actions, and progressive web app capabilities.

## Technology Stack

### Core Framework
- **Next.js 16.2.6** - App Router architecture
  - Development: Turbopack (via `--turbopack` flag)
  - Production: Webpack (via `--webpack` flag, required for Serwist)
  - Output mode: `standalone` for Docker deployment
- **React 19.2.4** - Server Components + Client Components
- **TypeScript 5** - Full type safety

### Database & ORM
- **PostgreSQL 16** - Primary database
- **Prisma 7.8.0** - ORM with custom output path (`./generated/prisma`)
- **@prisma/adapter-pg** - PrismaPg adapter for connection pooling
- **pg 8.20.0** - PostgreSQL driver

### Authentication & Authorization
- **NextAuth 5.0.0-beta.31** - JWT-based session management
- **bcryptjs 3.0.3** - Password hashing (12 salt rounds)
- Custom RBAC system with 37 permissions and 4 roles

### Internationalization
- **next-intl 4.12.0** - Server-side i18n
- Supported locales: Arabic (default), English
- Message files: `messages/ar.json`, `messages/en.json`

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component library based on @base-ui/react (NOT Radix)
- **lucide-react 1.16.0** - Icon library
- **next-themes 0.4.6** - Dark mode support
- **class-variance-authority** - Component variant management
- **recharts 3.8.1** - Charts and analytics

### PWA & Service Worker
- **Serwist 9.5.11** - Service worker toolkit
- **@serwist/next** - Next.js integration
- **web-push 3.6.7** - Push notification server

### Validation & Type Safety
- **Zod 4.4.3** - Schema validation for forms and Server Actions

### Development Tools
- **pnpm** - Package manager
- **tsx** - TypeScript execution (for seed scripts)
- **Playwright 1.60.0** - E2E testing
- **Vitest 4.1.6** - Unit testing
- **ESLint 9** - Linting

## Directory Structure

```
yusr/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Locale-based routing (ar, en)
│   │   ├── (auth)/              # Auth layout group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── admin/           # Admin pages
│   │   │   ├── moderator/       # Moderator pages
│   │   │   ├── student/         # Student pages
│   │   │   ├── support/         # Support pages
│   │   │   └── quran/           # Quran explorer
│   │   └── enrollment-closed/
│   ├── api/                     # API routes
│   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   └── push/                # Push notification endpoints
│   ├── manifest.ts              # PWA manifest
│   └── sw.ts                    # Service worker
├── server/                      # Server-side code
│   ├── actions/                 # Server Actions (17 files)
│   ├── services/                # Business logic (22 files)
│   ├── auth/                    # Auth utilities
│   └── db/                      # Database client
├── prisma/                      # Database schema & migrations
│   ├── schema.prisma
│   ├── seed.ts
│   ├── demo-seed.ts
│   └── data/                    # Quran reference data
├── lib/                         # Shared utilities
│   ├── validations/             # Zod schemas
│   ├── constants/               # Permissions, enums
│   └── utils.ts
├── components/                  # React components
│   ├── ui/                      # shadcn/ui components
│   └── ...                      # Domain components
├── messages/                    # i18n message files
│   ├── ar.json
│   └── en.json
├── i18n/                        # i18n configuration
│   ├── routing.ts
│   └── request.ts
├── public/                      # Static assets
│   ├── icons/                   # PWA icons
│   └── sw.js                    # Compiled service worker
├── types/                       # TypeScript type definitions
├── middleware.ts                # next-intl middleware
├── next.config.ts               # Next.js configuration
├── Dockerfile
└── docker-compose.yml
```

## Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HTTP Request                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. middleware.ts (next-intl)                                │
│    - Locale detection (ar/en)                               │
│    - Redirect to default locale if missing                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. app/[locale]/layout.tsx                                  │
│    - Load locale messages via request.ts                    │
│    - Set up NextIntlClientProvider                          │
│    - Apply RTL/LTR direction                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Route-specific layout (auth or dashboard)                │
│    - Check authentication (auth())                          │
│    - Verify permissions (requirePermission())               │
│    - Render role-specific navigation                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Page Component (Server Component)                        │
│    - Fetch data directly from database                      │
│    - Pass to client components via props                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. User Interaction (Client Component)                      │
│    - Form submission → Server Action                        │
│    - Button click → Server Action                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Server Action (server/actions/*.ts)                      │
│    - Validate input (Zod schema)                            │
│    - Check permissions (requirePermission())                │
│    - Call service layer                                     │
│    - Create audit log (fire-and-forget)                     │
│    - Send notifications (fire-and-forget)                   │
│    - Revalidate cache (revalidatePath)                      │
│    - Return result or redirect                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Pattern

### Server Components → Client Components → Server Actions

```typescript
// page.tsx (Server Component)
async function Page() {
  const data = await db.model.findMany(); // Direct DB access
  return <ClientComponent data={data} />;
}

// client-component.tsx (Client Component)
"use client";
function ClientComponent({ data }) {
  return <form action={serverAction}>...</form>;
}

// server/actions/domain.ts (Server Action)
"use server";
export async function serverAction(formData: FormData) {
  const session = await requirePermission("permission.key");
  const parsed = schema.safeParse(formData);
  const result = await serviceFunction(parsed.data);
  
  // Fire-and-forget side effects
  createAuditLog(...).catch(console.error);
  sendNotification(...).catch(console.error);
  
  revalidatePath("/path");
  return { success: true };
}
```

## Architecture Principles

### No REST API Layer
- All mutations via Server Actions
- Direct database access in Server Components
- Service layer for business logic, not HTTP endpoints

### Fire-and-Forget Side Effects
- Audit logs created asynchronously (`.catch(console.error)`)
- Notifications sent asynchronously
- Main flow not blocked by logging/notifications

### Permission Guards
- `requireAuth()` - Ensures user is logged in
- `requireApprovedUser()` - Ensures account status is ACTIVE
- `requirePermission(key)` - Checks RBAC permissions

### Transaction Usage
- Complex operations wrapped in `db.$transaction()`
- Multiple related writes executed atomically
- Example: Creating a review + updating plan position

### Cache Management
- `revalidatePath()` after mutations
- `revalidateTag()` for granular invalidation
- No manual cache keys - Next.js handles it

## Build & Deployment

### Development
```bash
pnpm dev  # Runs with Turbopack
```

### Production Build
```bash
pnpm build  # Uses --webpack flag for Serwist compatibility
```

### Docker Deployment
- Multi-stage build (deps → build → runner)
- Standalone output mode (all dependencies bundled)
- Prisma generation during build
- Database migrations via entrypoint script
- Node 22 Alpine base image
- Non-root user (nextjs:nodejs)

## Configuration Files

### next.config.ts
- `output: "standalone"` for Docker
- Serwist plugin (disabled in dev)
- next-intl plugin

### middleware.ts
- next-intl middleware only
- Locale detection and routing
- No auth checks (handled in layouts)

### prisma.config.ts
- Custom Prisma client output path
- PrismaPg adapter configuration

## Performance Considerations

- Server Components by default (minimize JavaScript bundle)
- Turbopack in development (fast HMR)
- Standalone build reduces Docker image size
- Push notifications for real-time updates
- Service worker for offline support and caching
- Database connection pooling via PrismaPg adapter
