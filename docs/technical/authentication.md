# Authentication & Authorization

## Overview

Yusr Academy uses **NextAuth 5.0.0-beta.31** with JWT-based sessions and a custom role-based access control (RBAC) system. Authentication is handled via credentials (email + password), with passwords hashed using bcryptjs.

---

## NextAuth Configuration

### File: `server/auth/config.ts`

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/ar/login" },
  providers: [Credentials({ ... })],
  callbacks: { jwt, session }
});
```

### Session Strategy
- **Type**: JWT (JSON Web Token)
- **Storage**: HTTP-only cookie
- **No database sessions** - stateless authentication

### Sign-In Page
- Default: `/ar/login`
- Hardcoded to Arabic locale
- Redirects handled by Server Actions, not NextAuth

### Providers

#### Credentials Provider
- **Type**: Email + Password
- **Validation**: Uses Zod schema (`loginSchema`)
- **Process**:
  1. Parse credentials with `loginSchema.safeParse()`
  2. Query user by email from database
  3. Verify password with `verifyPassword()`
  4. Return user object if valid, `null` if invalid

### Callbacks

#### JWT Callback
Enriches JWT token with user data on sign-in:

```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.locale = user.locale;
    token.accountStatus = user.accountStatus;
  }
  return token;
}
```

#### Session Callback
Exposes JWT data to session object:

```typescript
async session({ session, token }) {
  session.user.id = token.id as string;
  session.user.role = token.role as string;
  session.user.locale = token.locale as string;
  session.user.accountStatus = token.accountStatus as string | null;
  return session;
}
```

### Session Shape

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "moderator" | "student" | "support";
    locale: "ar" | "en";
    accountStatus: "ACTIVE" | "DEACTIVATED" | "BANNED" | "EXPELLED" | null;
  }
}
```

---

## Password Hashing

### File: `server/auth/password.ts`

#### hashPassword()
```typescript
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS); // SALT_ROUNDS = 12
}
```

#### verifyPassword()
```typescript
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### generateResetToken()
```typescript
export function generateResetToken(): string {
  return randomBytes(32).toString("hex"); // 64 hex characters
}
```

---

## Session Management

### File: `server/auth/session.ts`

#### getSession()
Returns current session (nullable).

```typescript
export async function getSession() {
  return auth();
}
```

#### requireAuth()
Redirects to login if no session exists.

```typescript
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/ar/login");
  }
  return session;
}
```

#### requireApprovedUser()
Redirects to login if account status is not ACTIVE.

```typescript
export async function requireApprovedUser() {
  const session = await requireAuth();
  if (session.user.accountStatus !== "ACTIVE") {
    redirect("/ar/login");
  }
  return session;
}
```

---

## Role-Based Access Control (RBAC)

### Roles

Yusr has 4 predefined roles:

| Role | Name (AR) | Description |
|------|-----------|-------------|
| admin | مدير النظام | Full system access (all 37 permissions) |
| moderator | مشرف | Manages assigned students and sessions (13 permissions) |
| student | طالب | Enrolled student (0 permissions) |
| support | دعم | Support ticket management (3 permissions) |

### Permissions

#### File: `lib/constants/permissions.ts`

**Total**: 37 permissions

```typescript
export const PERMISSIONS = {
  // User Management
  USERS_APPROVE: "users.approve",
  USERS_BAN: "users.ban",
  USERS_DEACTIVATE: "users.deactivate",
  
  // Student Management
  STUDENTS_VIEW_ASSIGNED: "students.view_assigned",
  STUDENTS_VIEW_ALL: "students.view_all",
  STUDENTS_ASSIGN_GROUP: "students.assign_group",
  
  // Organization
  GROUPS_CREATE: "groups.create",
  GROUPS_UPDATE: "groups.update",
  LEVELS_CREATE: "levels.create",
  LEVELS_UPDATE: "levels.update",
  CLASSES_CREATE: "classes.create",
  CLASSES_UPDATE: "classes.update",
  MODERATORS_ASSIGN: "moderators.assign",
  
  // Sessions
  SESSIONS_CREATE: "sessions.create",
  SESSIONS_START: "sessions.start",
  SESSIONS_GRADE: "sessions.grade",
  
  // Assignments
  ASSIGNMENTS_CREATE: "assignments.create",
  ASSIGNMENTS_UPDATE: "assignments.update",
  
  // Exams
  EXAMS_CREATE: "exams.create",
  EXAMS_GRADE: "exams.grade",
  EXAMS_VIEW_ALL: "exams.view_all",
  EXAMS_VIEW_ASSIGNED: "exams.view_assigned",
  
  // Leave Requests
  LEAVE_REQUESTS_REVIEW: "leave_requests.review",
  
  // Announcements & Notifications
  ANNOUNCEMENTS_CREATE: "announcements.create",
  NOTIFICATIONS_SEND: "notifications.send",
  
  // Support Tickets
  SUPPORT_TICKETS_VIEW_ASSIGNED: "support_tickets.view_assigned",
  SUPPORT_TICKETS_VIEW_ALL: "support_tickets.view_all",
  SUPPORT_TICKETS_REPLY: "support_tickets.reply",
  SUPPORT_TICKETS_ESCALATE: "support_tickets.escalate",
  
  // System
  SYSTEM_SETTINGS_UPDATE: "system_settings.update",
  FEATURE_FLAGS_UPDATE: "feature_flags.update",
  AUDIT_LOGS_VIEW: "audit_logs.view",
  
  // Memorization
  MEMORIZATION_VIEW: "memorization.view",
  MEMORIZATION_MANAGE: "memorization.manage",
  MEMORIZATION_REVIEW: "memorization.review",
  
  // Tajweed
  TAJWEED_CATEGORIES_MANAGE: "tajweed_categories.manage",
} as const;
```

### Permission-to-Role Mapping

```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PERMISSIONS), // All 37 permissions
  
  moderator: [
    PERMISSIONS.STUDENTS_VIEW_ASSIGNED,
    PERMISSIONS.SESSIONS_CREATE,
    PERMISSIONS.SESSIONS_START,
    PERMISSIONS.SESSIONS_GRADE,
    PERMISSIONS.ASSIGNMENTS_CREATE,
    PERMISSIONS.ASSIGNMENTS_UPDATE,
    PERMISSIONS.EXAMS_CREATE,
    PERMISSIONS.EXAMS_GRADE,
    PERMISSIONS.EXAMS_VIEW_ASSIGNED,
    PERMISSIONS.LEAVE_REQUESTS_REVIEW,
    PERMISSIONS.MEMORIZATION_VIEW,
    PERMISSIONS.MEMORIZATION_MANAGE,
    PERMISSIONS.MEMORIZATION_REVIEW,
    PERMISSIONS.GROUPS_UPDATE, // Added in production
  ],
  
  student: [], // No permissions
  
  support: [
    PERMISSIONS.SUPPORT_TICKETS_VIEW_ASSIGNED,
    PERMISSIONS.SUPPORT_TICKETS_REPLY,
    PERMISSIONS.SUPPORT_TICKETS_ESCALATE,
  ],
};
```

### Permission Overrides

Individual users can have permission overrides via the `UserPermissionOverride` model:

- **granted: true** - User has this permission regardless of role
- **granted: false** - User explicitly does NOT have this permission (revoke)

---

## Permission Guards

### requirePermission()

**Location**: `server/auth/session.ts` (inferred usage, not shown in config.ts)

```typescript
export async function requirePermission(key: string) {
  const session = await requireApprovedUser();
  const hasPermission = await checkUserPermission(session.user.id, key);
  
  if (!hasPermission) {
    throw new Error("Permission denied");
  }
  
  return session;
}
```

**Usage in Server Actions**:

```typescript
"use server";

export async function createGroupAction(data: FormData) {
  const session = await requirePermission(PERMISSIONS.GROUPS_CREATE);
  // ... proceed with action
}
```

### Permission Check Flow

```
1. Check if user's role has permission (via RolePermission)
2. Check if user has explicit override (via UserPermissionOverride)
3. If override exists, use override value
4. If no override, use role permission
5. If no role permission, deny
```

---

## Authentication Flow

### Registration

1. User submits registration form
2. `registerAction()` validates with `registerSchema`
3. Check enrollment state (open/closed)
4. `registerStudent()` service:
   - Hash password (bcrypt, 12 rounds)
   - Create User with role "student"
   - Create StudentProfile
   - Create EnrollmentApplication with status PENDING_REVIEW
5. Return success (no auto-login)

### Login

1. User submits login form
2. `loginAction()` calls `signIn("credentials", { email, password })`
3. Credentials provider:
   - Validate with `loginSchema`
   - Query user by email
   - Verify password with `verifyPassword()`
   - Return user object
4. JWT callback enriches token
5. Session callback exposes user data
6. Redirect to role-specific dashboard:
   - admin → `/ar/admin/dashboard`
   - moderator → `/ar/moderator/dashboard`
   - student → `/ar/student/dashboard`
   - support → `/ar/support/dashboard`

### Logout

1. User clicks logout
2. `logoutAction()` calls `signOut({ redirect: false })`
3. Redirect to `/ar/login`

### Password Reset

1. User submits forgot password form
2. `forgotPasswordAction()`:
   - Validate email
   - Generate reset token (64 hex chars)
   - Create PasswordResetToken (expires in 1 hour)
   - Log reset link (email not implemented yet)
   - Always return success (prevent email enumeration)
3. User clicks reset link (e.g., `/ar/reset-password/{token}`)
4. Verify token not expired and not used
5. User submits new password
6. Hash new password and update User.passwordHash
7. Mark token as used (set `usedAt`)
8. Redirect to login

---

## Account Status Management

### Statuses

- **null** - Pending enrollment approval
- **ACTIVE** - Active account (can log in)
- **DEACTIVATED** - Temporarily disabled
- **BANNED** - Permanently disabled (misconduct)
- **EXPELLED** - Expelled from academy

### Enforcement

- `requireApprovedUser()` only allows ACTIVE status
- Non-ACTIVE users are redirected to login
- No error message shown (security measure)

---

## Security Considerations

### Password Policy
- Minimum 8 characters (enforced by Zod schema)
- Maximum 100 characters
- bcrypt with 12 salt rounds

### Token Security
- JWT stored in HTTP-only cookies (not accessible via JavaScript)
- No refresh tokens (session expires based on JWT expiry)
- Password reset tokens expire in 1 hour
- One-time use tokens (marked as used)

### Brute Force Protection
- None implemented (TODO for production)
- Recommendations: Rate limiting, account lockout after N failed attempts

### Email Enumeration Prevention
- Password reset always returns success
- Login errors use generic "invalid credentials" message

### Permission Checks
- Always performed server-side
- Never rely on client-side role checks
- UI hiding based on permissions is for UX only

---

## Database Schema

### User
- `passwordHash`: bcrypt hash (12 rounds)
- `roleId`: FK to Role
- `accountStatus`: AccountStatus enum

### Role
- Seeded during `prisma db seed`
- Cannot be deleted if users exist

### Permission
- Seeded during `prisma db seed`
- 37 total permissions

### RolePermission
- Many-to-many join table
- Seeded during `prisma db seed`

### UserPermissionOverride
- Per-user permission grants/revokes
- `granted: true` = grant
- `granted: false` = revoke

### PasswordResetToken
- `token`: 64 hex characters (random)
- `expiresAt`: 1 hour from creation
- `usedAt`: Set when token is used (one-time use)

---

## API Endpoints

### NextAuth Handlers

**File**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/server/auth/config";

export const { GET, POST } = handlers;
```

**Endpoints**:
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signin` - Sign in (internal use by NextAuth)
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/csrf` - CSRF token

---

## Common Patterns

### Page-Level Protection

```typescript
// app/[locale]/(dashboard)/admin/page.tsx
export default async function AdminPage() {
  const session = await requireApprovedUser();
  
  if (session.user.role !== "admin") {
    notFound();
  }
  
  // ... page content
}
```

### Server Action Protection

```typescript
"use server";

export async function createLevelAction(data: FormData) {
  const session = await requirePermission(PERMISSIONS.LEVELS_CREATE);
  
  // Validation
  const parsed = createLevelSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) {
    return { error: "validationError" };
  }
  
  // Business logic
  const level = await createLevel(parsed.data);
  
  // Audit log (fire-and-forget)
  createAuditLog({
    actorId: session.user.id,
    action: "level.created",
    entityType: "Level",
    entityId: level.id,
  }).catch(console.error);
  
  revalidatePath("/admin/organization");
  return { success: true };
}
```

### Conditional UI Rendering

```typescript
import { auth } from "@/server/auth/config";
import { checkPermission } from "@/server/services/permissions";

export default async function Sidebar() {
  const session = await auth();
  const canCreateGroups = session 
    ? await checkPermission(session.user.id, PERMISSIONS.GROUPS_CREATE)
    : false;
  
  return (
    <nav>
      {canCreateGroups && <CreateGroupButton />}
    </nav>
  );
}
```

---

## Testing Credentials

### Demo Users (Seeded)

| Email | Password | Role | Status |
|-------|----------|------|--------|
| admin@yusr.academy | admin123456 | admin | ACTIVE |
| moderator@yusr.academy | demo123456 | moderator | ACTIVE |
| student@yusr.academy | demo123456 | student | ACTIVE |
| support@yusr.academy | demo123456 | support | ACTIVE |
| pending@yusr.academy | demo123456 | student | null (pending) |

All demo users have locale "ar" by default.
