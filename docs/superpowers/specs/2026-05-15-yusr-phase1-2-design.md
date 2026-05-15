# Yusr Academy — Phase 1+2 Design Spec

**Scope**: Foundation + Enrollment & User Management
**First vertical slice**: Admin opens enrollment → student registers → admin approves → assigns to level/class/group → student sees dashboard

---

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + tailwindcss-rtl |
| Components | shadcn/ui |
| Database | PostgreSQL 16 (Docker Compose) |
| ORM | Prisma |
| Auth | Auth.js v5 (Credentials provider, email+password) |
| i18n | next-intl |
| Validation | Zod |
| Testing | Vitest |
| Package manager | pnpm |
| File storage | Local filesystem with S3-compatible interface abstraction |

---

## 2. Project Structure

```
yusr/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/[token]/page.tsx
│   │   │   └── layout.tsx              # centered card, no sidebar
│   │   ├── (dashboard)/
│   │   │   ├── student/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   └── profile/page.tsx
│   │   │   ├── moderator/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── groups/page.tsx
│   │   │   │   └── students/
│   │   │   │       ├── page.tsx
│   │   │   │       └── [id]/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── enrollment/page.tsx
│   │   │   │   ├── users/page.tsx
│   │   │   │   ├── levels/page.tsx
│   │   │   │   ├── classes/page.tsx
│   │   │   │   ├── groups/page.tsx
│   │   │   │   ├── feature-flags/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   └── audit-logs/page.tsx
│   │   │   ├── support/
│   │   │   │   └── dashboard/page.tsx
│   │   │   └── layout.tsx              # sidebar + header shell
│   │   ├── page.tsx                    # public landing page
│   │   ├── enrollment-closed/page.tsx
│   │   └── layout.tsx                  # locale root (fonts, direction)
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   └── layout.tsx                      # root (providers)
├── components/
│   ├── ui/                             # shadcn/ui (installed incrementally)
│   ├── forms/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── forgot-password-form.tsx
│   ├── layout/
│   │   ├── app-shell.tsx               # sidebar + header + main area
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── locale-switcher.tsx
│   │   └── mobile-nav.tsx
│   ├── landing/
│   │   ├── hero.tsx
│   │   ├── features.tsx
│   │   ├── how-it-works.tsx
│   │   ├── contact.tsx
│   │   └── footer.tsx
│   └── shared/
│       ├── data-table.tsx
│       ├── status-badge.tsx
│       └── confirm-dialog.tsx
├── server/
│   ├── auth/
│   │   ├── config.ts                   # Auth.js configuration
│   │   ├── session.ts                  # getSession, requireAuth helpers
│   │   └── password.ts                 # hash, verify, reset token
│   ├── permissions/
│   │   ├── check.ts                    # hasPermission(userId, key)
│   │   ├── require.ts                  # requirePermission(key) — throws
│   │   └── constants.ts                # all permission key constants
│   ├── services/
│   │   ├── enrollment.ts               # registration, approval, rejection
│   │   ├── user.ts                     # user CRUD, ban, deactivate
│   │   ├── organization.ts            # levels, classes, groups
│   │   ├── student.ts                  # student profile, assignment to group
│   │   ├── moderator.ts               # moderator profile, assignment
│   │   ├── feature-flag.ts
│   │   ├── audit-log.ts
│   │   └── notification.ts
│   ├── db/
│   │   └── client.ts                   # Prisma client singleton
│   └── actions/
│       ├── auth.ts                     # login, register, forgot-password
│       ├── enrollment.ts               # approve, reject, waitlist
│       ├── user.ts                     # ban, deactivate, reactivate
│       ├── organization.ts            # CRUD levels, classes, groups
│       └── admin.ts                    # feature flags, settings
├── lib/
│   ├── validations/
│   │   ├── auth.ts                     # login, register schemas
│   │   ├── enrollment.ts
│   │   ├── user.ts
│   │   └── organization.ts
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   └── enrollment.ts               # status enums
│   └── utils/
│       ├── date.ts                     # date formatting abstraction
│       └── cn.ts                       # classname helper
├── messages/
│   ├── ar.json
│   └── en.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── fonts/
├── docker-compose.yml
├── .env.example
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Database Schema

### 3.1 Auth & RBAC

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  name           String
  nameAr         String?
  roleId         String
  role           Role     @relation(fields: [roleId], references: [id])
  accountStatus  AccountStatus?
  locale         String   @default("ar")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  studentProfile       StudentProfile?
  moderatorProfile     ModeratorProfile?
  enrollmentApplication EnrollmentApplication?
  permissionOverrides  UserPermissionOverride[]
  notifications        Notification[]
  auditLogs           AuditLog[]   @relation("actor")
  passwordResetTokens  PasswordResetToken[]

  @@index([email])
  @@index([roleId])
  @@index([accountStatus])
}

enum AccountStatus {
  ACTIVE
  DEACTIVATED
  BANNED
  EXPELLED
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique   // admin, moderator, student, support
  nameAr      String
  description String?
  users       User[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  key         String   @unique   // e.g. "users.approve"
  description String?
  rolePermissions     RolePermission[]
  userOverrides       UserPermissionOverride[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model UserPermissionOverride {
  userId       String
  permissionId String
  granted      Boolean
  user         User       @relation(fields: [userId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([userId, permissionId])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User     @relation(fields: [userId], references: [id])

  @@index([token])
  @@index([userId, expiresAt])
}
```

### 3.2 Student & Enrollment

```prisma
model StudentProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])
  dateOfBirth           DateTime?
  gender                String?
  phone                 String?
  country               String?
  timezone              String?  @default("UTC")
  currentQuranLevel     String?
  currentTajweedLevel   String?
  previousBackground    String?
  parentContact         String?
  preferredDay          String?
  availabilityNotes     String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  groupStudents         GroupStudent[]
}

model EnrollmentApplication {
  id                 String             @id @default(cuid())
  userId             String             @unique
  user               User               @relation(fields: [userId], references: [id])
  registrationStatus RegistrationStatus @default(DRAFT)
  submittedAt        DateTime?
  reviewedById       String?
  reviewedAt         DateTime?
  reviewNote         String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([registrationStatus])
}

enum RegistrationStatus {
  DRAFT
  SUBMITTED
  PENDING_REVIEW
  APPROVED
  REJECTED
  WAITLISTED
}
```

### 3.3 Organizational

```prisma
model Level {
  id          String   @id @default(cuid())
  nameAr      String
  nameEn      String?
  description String?
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  classes     Class[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Class {
  id            String   @id @default(cuid())
  name          String
  levelId       String
  level         Level    @relation(fields: [levelId], references: [id])
  defaultDay    String?
  timezone      String   @default("UTC")
  sessionTime   String?
  capacity      Int?
  genderPolicy  String?
  active        Boolean  @default(true)
  groups        Group[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([levelId])
}

model Group {
  id                String   @id @default(cuid())
  name              String
  classId           String
  class             Class    @relation(fields: [classId], references: [id])
  moderatorId       String?
  moderator         ModeratorProfile? @relation(fields: [moderatorId], references: [id])
  weeklyDay         String?
  weeklyTime        String?
  meetingLinkPolicy String?
  active            Boolean  @default(true)
  students          GroupStudent[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([classId])
  @@index([moderatorId])
}

model GroupStudent {
  groupId   String
  studentId String
  group     Group          @relation(fields: [groupId], references: [id])
  student   StudentProfile @relation(fields: [studentId], references: [id])
  assignedAt DateTime      @default(now())

  @@id([groupId, studentId])
}

model ModeratorProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  groups    Group[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3.4 Quran Reference (read-only, seeded)

```prisma
model QuranSurah {
  number         Int      @id
  nameAr         String
  nameEn         String
  revelationType String   // meccan, medinan
  ayahCount      Int
  ayahs          QuranAyah[]
}

model QuranAyah {
  id            Int        @id @default(autoincrement())
  surahNumber   Int
  ayahNumber    Int
  juzNumber     Int
  hizbNumber    Int
  quarterNumber Int
  pageNumber    Int?
  surah         QuranSurah @relation(fields: [surahNumber], references: [number])

  @@unique([surahNumber, ayahNumber])
  @@index([juzNumber])
  @@index([hizbNumber])
  @@index([quarterNumber])
}

model QuranJuz {
  number  Int    @id
  nameAr  String?
}

model QuranHizb {
  number    Int @id
  juzNumber Int
}

model QuranQuarter {
  number     Int @id
  hizbNumber Int
}
```

### 3.5 System

```prisma
model FeatureFlag {
  key         String  @id
  enabled     Boolean @default(false)
  description String?
}

model SystemSetting {
  key         String  @id
  value       String
  description String?
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation("actor", fields: [actorId], references: [id])
  action     String   // e.g. "user.approved", "role.changed"
  entityType String   // e.g. "User", "EnrollmentApplication"
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}

model Notification {
  id          String   @id @default(cuid())
  recipientId String
  recipient   User     @relation(fields: [recipientId], references: [id])
  type        String   // e.g. "enrollment_approved"
  title       String
  body        String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([recipientId, read])
  @@index([createdAt])
}

model Announcement {
  id          String   @id @default(cuid())
  title       String
  body        String
  priority    String   @default("normal") // normal, important, urgent
  targetType  String?  // all, students, moderators, level, class, group, student
  targetId    String?
  publishDate DateTime @default(now())
  expiryDate  DateTime?
  createdById String
  createdAt   DateTime @default(now())
}
```

---

## 4. Authentication

### 4.1 Auth.js Configuration

- **Provider**: Credentials (email + password)
- **Session strategy**: JWT
- **JWT payload**: userId, email, role, locale
- **Pages**: custom login at `/[locale]/login`

### 4.2 Password handling

- Hash with bcryptjs (salt rounds: 12)
- Password reset: generate random token → store in PasswordResetToken with 1-hour expiry → log reset link to console in dev (email provider abstraction ready but not wired)
- Rate limit: max 5 reset requests per email per hour (in-memory counter for MVP)

### 4.3 Route protection

- Next.js middleware checks JWT on all `(dashboard)` routes
- Redirects unauthenticated users to `/[locale]/login`
- No role check in middleware — role-based access enforced at page/action level via `requirePermission()`

---

## 5. RBAC

### 5.1 Permission check flow

```
requirePermission("users.approve")
  → getSession() → userId, roleId
  → cache: lookup RolePermission for roleId
  → cache: lookup UserPermissionOverride for userId
  → override.granted takes precedence over role permission
  → if denied: throw 403
```

### 5.2 Seed permissions

4 roles seeded: `admin`, `moderator`, `student`, `support`

Admin gets all permissions. Other roles get subsets per spec section 15.

### 5.3 UI integration

Server Components use `hasPermission()` to conditionally render. Sidebar items filtered by permission. Buttons/actions hidden when user lacks permission.

---

## 6. i18n & RTL

### 6.1 next-intl setup

- Locales: `ar` (default), `en`
- URL: `/ar/...`, `/en/...`
- Middleware: detect locale from URL path segment
- Translation files: `messages/ar.json`, `messages/en.json`
- Namespaced: `auth.*`, `dashboard.*`, `admin.*`, `student.*`, `moderator.*`, `common.*`

### 6.2 RTL

- `<html dir="rtl" lang="ar">` for Arabic, `<html dir="ltr" lang="en">` for English
- Tailwind logical properties via `tailwindcss-rtl`
- Fonts: Cairo (Arabic), Inter (English) via `next/font/google`

---

## 7. Enrollment Flow

### 7.1 States

**System enrollment**: `closed` | `open` | `paused` | `waitlist_only` (stored in SystemSetting)

**Application**: `DRAFT` → `SUBMITTED` → `PENDING_REVIEW` → `APPROVED` | `REJECTED` | `WAITLISTED`

**Account**: `ACTIVE` | `DEACTIVATED` | `BANNED` | `EXPELLED` (on User)

### 7.2 Registration flow

1. Student visits `/register` — if enrollment closed, redirect to `/enrollment-closed`
2. Student fills form (validated by Zod schema)
3. On submit: create User (passwordHash, role=student, accountStatus=NULL/unset — user cannot access dashboard until approved) + StudentProfile + EnrollmentApplication (status=PENDING_REVIEW). MVP skips DRAFT/SUBMITTED — registration goes directly to PENDING_REVIEW.
4. Admin sees pending applications on `/admin/enrollment`
5. Admin approves → application status=APPROVED → user accountStatus=ACTIVE → admin assigns level + class + group
6. Admin rejects → application status=REJECTED, optional note
7. Student logs in → if not approved, sees "pending review" message → if approved, sees full dashboard

### 7.3 Moderator onboarding

Admin creates moderator account directly via `/admin/users` → creates User with role=moderator + ModeratorProfile → assigns to groups.

---

## 8. Public Landing Page

**Route**: `/[locale]/` (no auth)

**Sections:**
1. **Hero**: Academy name (أكاديمية يُسر لحفظ القرآن الكريم), Quranic verse (54:17), CTA based on enrollment state
2. **About**: Free online Quran memorization with qualified moderators
3. **Features**: 4-6 cards (weekly sessions, qualified moderators, progress tracking, AI feedback, structured curriculum, free)
4. **How it works**: Register → Get assigned → Start memorizing
5. **Contact**: quranonlinezoom@gmail.com, Facebook link
6. **Footer**: Academy name, login/register links, locale switcher

Design: Arabic-first, Islamic-inspired (geometric patterns, clean typography), responsive.

---

## 9. Admin Pages (Phase 1+2)

| Page | Purpose |
|---|---|
| `/admin/dashboard` | Summary cards: pending registrations, active students/moderators, enrollment status |
| `/admin/enrollment` | Data table of applications, filter by status, approve/reject/waitlist actions |
| `/admin/users` | All users, create moderator, ban/deactivate/reactivate |
| `/admin/levels` | CRUD levels |
| `/admin/classes` | CRUD classes (linked to level) |
| `/admin/groups` | CRUD groups (linked to class), assign moderator |
| `/admin/feature-flags` | Toggle feature flags |
| `/admin/settings` | System settings (enrollment state, etc.) |
| `/admin/audit-logs` | Searchable log of admin/moderator actions |

---

## 10. Student Pages (Phase 1+2)

| Page | Purpose |
|---|---|
| `/student/dashboard` | Level/class/group info, next session, announcements |
| `/student/profile` | View/edit profile info |

Remaining student pages (assignments, sessions, grades, etc.) are Phase 3+.

---

## 11. Testing

- **Framework**: Vitest
- **Unit tests**: permission checks, enrollment state machine, Zod schemas
- **Integration tests**: server actions (register → approve → assign flow)
- Co-located: `server/services/__tests__/*.test.ts`
- No E2E in Phase 1+2

---

## 12. Dev Setup

### docker-compose.yml

PostgreSQL 16, exposed on port 5432, volume for persistence.

### .env.example

```
DATABASE_URL=postgresql://yusr:yusr@localhost:5432/yusr
NEXTAUTH_SECRET=change-me
NEXTAUTH_URL=http://localhost:3000
```

### Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:push": "prisma db push",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "db:migrate": "prisma migrate dev",
  "test": "vitest",
  "test:run": "vitest run"
}
```

---

## 13. Quran Seed Data

- Source: [quran-json by tanzil.net](https://github.com/risan/quran-json) or equivalent verified dataset based on the Tanzil.net corpus (Hafs an Asim, Uthmani script). Exact dataset will be verified before seeding.
- Seed script populates: 114 surahs, 6236 ayahs with juz/hizb/quarter mappings, 30 juz, 60 hizb, 240 quarter-hizb
- Juz/Hizb/Quarter boundary mappings sourced from the same dataset or cross-referenced with tanzil.net metadata
- Source metadata stored in SystemSetting (dataset name, version, import date)
- Tables are read-only at runtime — no user-facing CRUD

---

## 14. Risks & Assumptions

1. **Quran dataset accuracy**: Must verify before seeding. Wrong mappings break future assignment features.
2. **Auth.js Credentials security**: No built-in brute-force protection. MVP adds basic rate limiting via in-memory counter.
3. **No email in MVP**: Password reset links logged to console. Email provider interface is abstracted but not connected.
4. **Single-tenant**: One academy instance. Multi-tenancy not in scope.
5. **No file uploads in Phase 1+2**: Storage abstraction is defined but audio upload features come in Phase 3+.

---

## 15. Files to Create

See project structure in Section 2 for the complete file list. Key counts:
- ~15 page files (app router)
- ~15 component files
- ~12 server files (auth, permissions, services, actions)
- ~5 lib files (validations, constants, utils)
- 1 Prisma schema + 1 seed file
- 2 i18n message files
- Config files (next.config, tailwind, tsconfig, docker-compose, .env.example)
