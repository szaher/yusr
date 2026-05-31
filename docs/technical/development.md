# Development Guide

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | 20+ | https://nodejs.org/ |
| pnpm | Latest | `corepack enable && corepack prepare pnpm@latest --activate` |
| PostgreSQL | 16 | https://www.postgresql.org/download/ or Docker |
| Git | Latest | https://git-scm.com/ |

### Optional Tools

| Tool | Purpose |
|------|---------|
| Docker Desktop | Run PostgreSQL in container |
| VS Code | Recommended editor |
| Prisma Extension | VS Code extension for `.prisma` files |
| Thunder Client | API testing (VS Code extension) |

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/szaher/yusr.git
cd yusr
```

### 2. Install Dependencies

```bash
pnpm install
```

**Note**: Uses pnpm workspace. Do NOT use npm or yarn.

### 3. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://yusr:yusr@localhost:5432/yusr"
AUTH_SECRET="dev-secret-for-local-testing-only"
AUTH_URL="http://localhost:3000"

# Optional: Push notifications (leave empty for local dev)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yusr.academy
```

### 4. Start PostgreSQL

**Option A: Docker** (recommended)

```bash
docker run --name yusr-postgres \
  -e POSTGRES_USER=yusr \
  -e POSTGRES_PASSWORD=yusr \
  -e POSTGRES_DB=yusr \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Option B: Local PostgreSQL**

```bash
createdb yusr
psql yusr -c "CREATE USER yusr WITH PASSWORD 'yusr';"
psql yusr -c "GRANT ALL PRIVILEGES ON DATABASE yusr TO yusr;"
```

### 5. Generate Prisma Client

```bash
pnpm db:generate
```

### 6. Run Migrations

```bash
pnpm db:push
```

**Note**: For development, `db:push` is faster than `db:migrate`. Use `db:migrate` when creating migration files for production.

### 7. Seed Database

**Base seed only**:
```bash
pnpm db:seed
```

**With demo data**:
```bash
SEED_DEMO_DATA=true pnpm db:seed
```

### 8. Start Development Server

```bash
pnpm dev
```

Visit **http://localhost:3000**

---

## Project Structure

```
yusr/
├── app/                         # Next.js App Router
│   ├── [locale]/                # Locale routing (ar, en)
│   │   ├── (auth)/             # Auth pages (login, register, etc.)
│   │   ├── (dashboard)/        # Dashboard pages (admin, moderator, student, support)
│   │   └── layout.tsx          # Root layout (locale provider)
│   ├── api/                    # API routes
│   ├── manifest.ts             # PWA manifest
│   └── sw.ts                   # Service worker
│
├── server/                      # Server-side code
│   ├── actions/                # Server Actions (17 files)
│   │   ├── admin.ts
│   │   ├── announcement.ts
│   │   ├── assignment.ts
│   │   ├── attendance.ts
│   │   ├── auth.ts
│   │   ├── enrollment.ts
│   │   ├── exam.ts
│   │   ├── gamification.ts
│   │   ├── leave-request.ts
│   │   ├── memorization.ts
│   │   ├── notification.ts
│   │   ├── organization.ts
│   │   ├── progress.ts
│   │   ├── session.ts
│   │   ├── student.ts
│   │   ├── support-ticket.ts
│   │   └── user.ts
│   │
│   ├── services/               # Business logic (22 files)
│   │   ├── analytics.ts
│   │   ├── announcement.ts
│   │   ├── assignment.ts
│   │   ├── attendance.ts
│   │   ├── audit-log.ts
│   │   ├── enrollment.ts
│   │   ├── exam.ts
│   │   ├── feature-flag.ts
│   │   ├── gamification.ts
│   │   ├── leave-request.ts
│   │   ├── memorization-plan-template.ts
│   │   ├── memorization-plan.ts
│   │   ├── memorization-review.ts
│   │   ├── notification.ts
│   │   ├── organization.ts
│   │   ├── progress.ts
│   │   ├── push-notification.ts
│   │   ├── quran.ts
│   │   ├── session.ts
│   │   ├── support-ticket.ts
│   │   ├── tajweed-category.ts
│   │   └── user.ts
│   │
│   ├── auth/                   # Authentication utilities
│   │   ├── config.ts           # NextAuth configuration
│   │   ├── password.ts         # Password hashing
│   │   └── session.ts          # Session guards
│   │
│   └── db/                     # Database client
│       └── client.ts           # Prisma client instance
│
├── lib/                        # Shared utilities
│   ├── validations/            # Zod validation schemas
│   ├── constants/              # Permissions, enums
│   └── utils.ts                # Utility functions
│
├── components/                 # React components
│   ├── ui/                     # shadcn/ui components (Button, Input, etc.)
│   └── ...                     # Domain components
│
├── prisma/                     # Database
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Base seed script
│   ├── demo-seed.ts            # Demo data seed
│   ├── data/                   # Quran reference data
│   │   ├── quran-surahs.ts
│   │   ├── quran-juz-boundaries.ts
│   │   ├── quran-hizb-boundaries.ts
│   │   ├── quran-quarter-boundaries.ts
│   │   └── quran-ayah-text.json
│   └── migrations/             # Migration files
│
├── messages/                   # i18n message files
│   ├── ar.json                 # Arabic translations
│   └── en.json                 # English translations
│
├── i18n/                       # i18n configuration
│   ├── routing.ts              # Locale routing config
│   └── request.ts              # Message loading
│
├── public/                     # Static assets
│   ├── icons/                  # PWA icons
│   └── ...
│
├── types/                      # TypeScript type definitions
│   └── next-auth.d.ts          # NextAuth type extensions
│
├── .env.example                # Environment variable template
├── .env                        # Local environment variables (git-ignored)
├── next.config.ts              # Next.js configuration
├── middleware.ts               # next-intl middleware
├── tsconfig.json               # TypeScript configuration
├── Dockerfile                  # Docker image
├── docker-compose.yml          # Docker Compose config
└── package.json                # Dependencies and scripts
```

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| dev | `next dev --turbopack` | Start development server with Turbopack |
| build | `next build --webpack` | Build for production (uses Webpack for Serwist) |
| start | `next start` | Start production server |
| lint | `next lint` | Run ESLint |
| db:push | `prisma db push` | Sync schema to database (no migration files) |
| db:seed | `prisma db seed` | Seed database |
| db:studio | `prisma studio` | Open Prisma Studio (GUI for database) |
| db:migrate | `prisma migrate dev` | Create and apply migration |
| db:generate | `prisma generate` | Generate Prisma Client |
| test | `vitest` | Run unit tests (watch mode) |
| test:run | `vitest run` | Run unit tests (once) |
| test:e2e | `playwright test` | Run E2E tests |
| test:e2e:ui | `playwright test --ui` | Run E2E tests with UI |
| test:e2e:headed | `playwright test --headed` | Run E2E tests in browser |

---

## Development Workflow

### Adding a New Feature

#### 1. Plan the Feature

- Identify required database models
- Define permissions needed
- List affected pages and components
- Sketch UI wireframes

#### 2. Update Database Schema

Edit `prisma/schema.prisma`:

```prisma
model NewFeature {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Generate migration:
```bash
pnpm db:migrate
```

Name the migration: `add_new_feature`

#### 3. Create Service Layer

**File**: `server/services/new-feature.ts`

```typescript
import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";

export async function createNewFeature(input: { name: string }, actorId: string) {
  const feature = await db.newFeature.create({
    data: { name: input.name },
  });

  // Audit log (fire-and-forget)
  createAuditLog({
    actorId,
    action: "new_feature.created",
    entityType: "NewFeature",
    entityId: feature.id,
  }).catch(console.error);

  return feature;
}

export async function getNewFeatures() {
  return db.newFeature.findMany({ orderBy: { createdAt: "desc" } });
}
```

#### 4. Create Validation Schema

**File**: `lib/validations/new-feature.ts`

```typescript
import { z } from "zod";

export const createNewFeatureSchema = z.object({
  name: z.string().min(3).max(100),
});

export type CreateNewFeatureInput = z.infer<typeof createNewFeatureSchema>;
```

#### 5. Create Server Action

**File**: `server/actions/new-feature.ts`

```typescript
"use server";

import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNewFeatureSchema } from "@/lib/validations/new-feature";
import { createNewFeature } from "@/server/services/new-feature";
import { revalidatePath } from "next/cache";

export async function createNewFeatureAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SOME_PERMISSION);

  const parsed = createNewFeatureSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return { error: "validationError" };
  }

  await createNewFeature(parsed.data, session.user.id);

  revalidatePath("/admin/new-features");
  return { success: true };
}
```

#### 6. Create Page

**File**: `app/[locale]/(dashboard)/admin/new-features/page.tsx`

```typescript
import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getNewFeatures } from "@/server/services/new-feature";
import { CreateNewFeatureForm } from "./create-form";

export default async function NewFeaturesPage() {
  await requirePermission(PERMISSIONS.SOME_PERMISSION);

  const features = await getNewFeatures();

  return (
    <div>
      <h1>New Features</h1>
      <CreateNewFeatureForm />
      <ul>
        {features.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### 7. Create Client Component (if needed)

**File**: `app/[locale]/(dashboard)/admin/new-features/create-form.tsx`

```typescript
"use client";

import { useActionState } from "react";
import { createNewFeatureAction } from "@/server/actions/new-feature";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateNewFeatureForm() {
  const [state, formAction, isPending] = useActionState(
    createNewFeatureAction,
    null
  );

  return (
    <form action={formAction}>
      <Input name="name" required placeholder="Feature name" />
      <Button disabled={isPending}>Create</Button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

#### 8. Add Translations

**File**: `messages/ar.json`

```json
{
  "admin": {
    "newFeatures": {
      "title": "الميزات الجديدة",
      "create": "إنشاء ميزة"
    }
  }
}
```

**File**: `messages/en.json`

```json
{
  "admin": {
    "newFeatures": {
      "title": "New Features",
      "create": "Create Feature"
    }
  }
}
```

#### 9. Add to Navigation (if applicable)

**File**: `components/admin-sidebar.tsx`

```typescript
{
  href: "/admin/new-features",
  label: t("nav.newFeatures"),
  icon: StarIcon,
  permission: PERMISSIONS.SOME_PERMISSION,
}
```

#### 10. Test

- Manual testing in browser
- Write unit tests (optional)
- Write E2E tests (recommended for critical flows)

---

## Code Conventions

### Server Components (Default)

```typescript
// No "use client" directive = Server Component
export default async function Page() {
  const data = await db.model.findMany(); // Direct DB access
  return <div>{data.map(...)}</div>;
}
```

### Client Components

```typescript
"use client";

import { useState } from "react";

export function Component() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}
```

### Server Actions

```typescript
"use server";

export async function actionName(formData: FormData) {
  // 1. Auth check
  const session = await requirePermission(PERMISSIONS.KEY);

  // 2. Validation
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "validationError" };
  }

  // 3. Business logic
  const result = await serviceFunction(parsed.data, session.user.id);

  // 4. Side effects (fire-and-forget)
  createAuditLog(...).catch(console.error);

  // 5. Cache invalidation
  revalidatePath("/path");

  // 6. Return
  return { success: true };
}
```

### Zod Validation

```typescript
import { z } from "zod";

export const schema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
});

export type Input = z.infer<typeof schema>;
```

### Audit Logging

Always log mutations (create, update, delete):

```typescript
createAuditLog({
  actorId: session.user.id,
  action: "entity.created", // or updated, deleted
  entityType: "EntityName",
  entityId: entity.id,
  metadata: { additionalContext: "value" },
}).catch(console.error);
```

### Error Handling

Server Actions return `{ error: string }` instead of throwing:

```typescript
if (!entity) {
  return { error: "notFound" };
}

if (unauthorized) {
  return { error: "unauthorized" };
}

// Success
return { success: true, data: entity };
```

---

## Testing

### Unit Tests (Vitest)

**File**: `lib/utils.test.ts`

```typescript
import { describe, test, expect } from "vitest";
import { utilFunction } from "./utils";

describe("utilFunction", () => {
  test("should return expected result", () => {
    expect(utilFunction(5)).toBe(10);
  });
});
```

Run:
```bash
pnpm test
```

### E2E Tests (Playwright)

**File**: `e2e/auth/login.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test("admin can log in", async ({ page }) => {
  await page.goto("/ar/login");
  await page.fill('input[name="email"]', "admin@yusr.academy");
  await page.fill('input[name="password"]', "admin123456");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/ar\/admin\/dashboard/);
  await expect(page.getByText("لوحة المدير")).toBeVisible();
});
```

Run:
```bash
pnpm test:e2e
```

---

## Debugging

### Server Components

```typescript
export default async function Page() {
  const data = await db.model.findMany();
  console.log("Data:", data); // Logs in terminal
  return <div>...</div>;
}
```

### Client Components

```typescript
"use client";

export function Component() {
  console.log("Data:", data); // Logs in browser console
  return <div>...</div>;
}
```

### Database Queries

Enable Prisma query logging:

```typescript
// server/db/client.ts
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

### Prisma Studio

Visual database browser:

```bash
pnpm db:studio
```

Opens at **http://localhost:5555**

---

## Demo Credentials

### Admin
- **Email**: admin@yusr.academy
- **Password**: admin123456
- **Role**: admin (all permissions)

### Moderator
- **Email**: moderator@yusr.academy
- **Password**: demo123456
- **Role**: moderator (13 permissions)

### Student
- **Email**: student@yusr.academy
- **Password**: demo123456
- **Role**: student (no permissions)
- **Group**: مجموعة النور (Group 1)

### Support
- **Email**: support@yusr.academy
- **Password**: demo123456
- **Role**: support (3 permissions)

### Pending Student
- **Email**: pending@yusr.academy
- **Password**: demo123456
- **Status**: Pending approval (cannot log in)

---

## Common Tasks

### Reset Database

```bash
pnpm db:push --force-reset
pnpm db:seed
```

**Warning**: Deletes all data.

### Add Permission

1. Edit `lib/constants/permissions.ts`:
   ```typescript
   NEW_PERMISSION: "new_permission.key",
   ```

2. Add to role mapping:
   ```typescript
   admin: [..., PERMISSIONS.NEW_PERMISSION],
   ```

3. Seed (upserts permissions):
   ```bash
   pnpm db:seed
   ```

### Toggle Feature Flag

Via admin UI:
1. Log in as admin
2. Go to `/ar/admin/settings`
3. Toggle feature flag

Via Prisma Studio:
1. `pnpm db:studio`
2. Navigate to `FeatureFlag` table
3. Edit `enabled` field

### Generate TypeScript Types from Prisma

```bash
pnpm db:generate
```

This regenerates `prisma/generated/prisma/client/` with updated types.

---

## Performance Tips

### Optimize Database Queries

**Bad** (N+1 query):
```typescript
const users = await db.user.findMany();
for (const user of users) {
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
  });
}
```

**Good** (single query with `include`):
```typescript
const users = await db.user.findMany({
  include: { studentProfile: true },
});
```

### Cache Static Data

```typescript
import { unstable_cache } from "next/cache";

export const getSurahs = unstable_cache(
  async () => db.quranSurah.findMany(),
  ["quran-surahs"],
  { revalidate: false } // Never revalidate (static data)
);
```

### Minimize Client-Side JavaScript

- Prefer Server Components
- Use Client Components only when necessary (interactivity)
- Lazy-load heavy components

---

## IDE Setup (VS Code)

### Recommended Extensions

- **Prisma** (`Prisma.prisma`) - Syntax highlighting for `.prisma` files
- **ESLint** (`dbaeumer.vscode-eslint`) - Linting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - Tailwind autocomplete
- **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`) - Better type errors
- **Error Lens** (`usernamehw.errorlens`) - Inline error messages

### Settings

**File**: `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Git Workflow

### Branch Naming

- `feature/short-description` - New features
- `fix/short-description` - Bug fixes
- `refactor/short-description` - Refactoring
- `docs/short-description` - Documentation

### Commit Messages

Follow conventional commits:

```
feat: add exam grading interface
fix: resolve session date timezone issue
refactor: extract badge checking logic to service
docs: update API reference for new actions
```

### Pull Request Process

1. Create feature branch
2. Implement feature with tests
3. Run linter: `pnpm lint`
4. Run tests: `pnpm test:run && pnpm test:e2e`
5. Push branch
6. Create PR with description
7. Request review
8. Merge after approval

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

### Prisma Client Out of Sync

```bash
pnpm db:generate
```

### Type Errors After Schema Change

1. `pnpm db:generate`
2. Restart TypeScript server in VS Code (Cmd+Shift+P → "Restart TS Server")

### Build Fails with Serwist

Ensure using `--webpack` flag:

```bash
pnpm build  # Already has --webpack in package.json
```

---

## Resources

- **Next.js 16 Docs**: https://nextjs.org/docs (check `node_modules/next/dist/docs/`)
- **Prisma Docs**: https://www.prisma.io/docs
- **next-intl Docs**: https://next-intl.dev/
- **shadcn/ui Docs**: https://ui.shadcn.com/
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Serwist Docs**: https://serwist.pages.dev/

---

## Getting Help

1. Check this documentation
2. Search existing issues on GitHub
3. Ask in team Slack/Discord
4. Create GitHub issue with reproduction steps
