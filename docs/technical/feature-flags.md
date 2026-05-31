# Feature Flags

## Overview

Yusr Academy uses a database-backed feature flag system to enable/disable features without code deployment. Feature flags are stored in the `FeatureFlag` table and managed via the admin settings interface.

**Total**: 18 feature flags

---

## Feature Flag Model

**Schema**:
```prisma
model FeatureFlag {
  key         String  @id
  enabled     Boolean @default(false)
  description String?
}
```

---

## All Feature Flags

| Key | Default | Description |
|-----|---------|-------------|
| ai_recitation_review | false | AI-powered recitation review |
| analytics | true | Dashboard analytics and charts |
| announcements | true | Announcement system |
| attendance_management | true | Attendance tracking, reports, and alerts |
| audio_playback_tracking | false | Track actual audio playback |
| email_notifications | false | Email notification delivery |
| english_locale | true | English language support |
| exams | true | Exam system |
| gamification | true | Badges, achievements, and group leaderboards |
| leave_requests | true | Student leave request system |
| memorization_plans | true | Individual student memorization plan tracking |
| memorization_plan_templates | true | Enable memorization plan template management and pace overrides |
| moderator_voice_notes | true | Moderator voice note attachments |
| progress_tracking | true | Student progress tracking, milestones, and goals |
| pwa | true | PWA features: push notifications and mobile bottom nav |
| quran_explorer | true | Native Quran text explorer (experimental) |
| student_audio_upload | false | Student audio upload for recitation |
| support_tickets | true | Support ticket system |

---

## Seeding Feature Flags

**File**: `prisma/seed.ts`

```typescript
async function seedFeatureFlags() {
  const flags = [
    { key: "ai_recitation_review", enabled: false, description: "AI-powered recitation review" },
    { key: "analytics", enabled: true, description: "Dashboard analytics and charts" },
    { key: "announcements", enabled: true, description: "Announcement system" },
    { key: "attendance_management", enabled: true, description: "Attendance tracking, reports, and alerts" },
    { key: "audio_playback_tracking", enabled: false, description: "Track actual audio playback" },
    { key: "email_notifications", enabled: false, description: "Email notification delivery" },
    { key: "english_locale", enabled: true, description: "English language support" },
    { key: "exams", enabled: true, description: "Exam system" },
    { key: "gamification", enabled: true, description: "Badges, achievements, and group leaderboards" },
    { key: "leave_requests", enabled: true, description: "Student leave request system" },
    { key: "memorization_plans", enabled: true, description: "Individual student memorization plan tracking" },
    { key: "memorization_plan_templates", enabled: true, description: "Enable memorization plan template management and pace overrides" },
    { key: "moderator_voice_notes", enabled: true, description: "Moderator voice note attachments" },
    { key: "progress_tracking", enabled: true, description: "Student progress tracking, milestones, and goals" },
    { key: "pwa", enabled: true, description: "PWA features: push notifications and mobile bottom nav" },
    { key: "quran_explorer", enabled: true, description: "Native Quran text explorer (experimental)" },
    { key: "student_audio_upload", enabled: false, description: "Student audio upload for recitation" },
    { key: "support_tickets", enabled: true, description: "Support ticket system" },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { enabled: flag.enabled },
      create: flag,
    });
  }
}
```

Flags are upserted during `prisma db seed`, so they can be added/updated without data loss.

---

## Checking Feature Flags

### Server-Side (Recommended)

**Service**: `server/services/feature-flag.ts`

```typescript
import { db } from "@/server/db/client";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? false;
}

export async function getEnabledFeatureFlags(): Promise<Set<string>> {
  const flags = await db.featureFlag.findMany({
    where: { enabled: true },
    select: { key: true },
  });
  return new Set(flags.map((f) => f.key));
}
```

### Usage in Pages

```typescript
import { isFeatureEnabled } from "@/server/services/feature-flag";
import { notFound } from "next/navigation";

export default async function ExamsPage() {
  const examsEnabled = await isFeatureEnabled("exams");
  
  if (!examsEnabled) {
    notFound(); // 404 if feature disabled
  }
  
  return <div>Exams Page</div>;
}
```

### Usage in Components

```typescript
import { getEnabledFeatureFlags } from "@/server/services/feature-flag";

export default async function Sidebar() {
  const flags = await getEnabledFeatureFlags();
  
  return (
    <nav>
      {flags.has("exams") && <ExamsLink />}
      {flags.has("gamification") && <BadgesLink />}
      {flags.has("support_tickets") && <SupportLink />}
    </nav>
  );
}
```

### Client-Side

Pass enabled flags as props from Server Component:

```typescript
// Server Component
export default async function Layout({ children }) {
  const flags = await getEnabledFeatureFlags();
  
  return (
    <ClientLayout enabledFlags={Array.from(flags)}>
      {children}
    </ClientLayout>
  );
}

// Client Component
"use client";

export function ClientLayout({ enabledFlags, children }) {
  const flags = new Set(enabledFlags);
  
  return (
    <div>
      {flags.has("pwa") && <InstallPrompt />}
      {children}
    </div>
  );
}
```

---

## Managing Feature Flags

### Admin Interface

Feature flags are managed via the Admin Settings page:

**Route**: `/ar/admin/settings`

**Features**:
- List all feature flags
- Toggle enabled/disabled
- View description
- Audit log created on toggle

**Permission**: `feature_flags.update`

### Server Action

**File**: `server/actions/admin.ts`

```typescript
export async function toggleFeatureFlagAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FEATURE_FLAGS_UPDATE);
  
  const parsed = toggleFeatureFlagSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return { error: "validationError" };
  }
  
  await toggleFeatureFlag(
    parsed.data.key,
    parsed.data.enabled,
    session.user.id
  );
  
  revalidatePath("/admin/settings");
  return { success: true };
}
```

### Service

**File**: `server/services/feature-flag.ts`

```typescript
export async function toggleFeatureFlag(
  key: string,
  enabled: boolean,
  actorId: string
) {
  const flag = await db.featureFlag.update({
    where: { key },
    data: { enabled },
  });

  await createAuditLog({
    actorId,
    action: "feature_flag.toggled",
    entityType: "FeatureFlag",
    entityId: key,
    metadata: { enabled },
  });

  return flag;
}
```

---

## Feature Flag Gating Patterns

### Sidebar Navigation Filtering

```typescript
export async function Sidebar() {
  const flags = await getEnabledFeatureFlags();
  
  const links = [
    { href: "/dashboard", label: "Dashboard", flag: null },
    { href: "/exams", label: "Exams", flag: "exams" },
    { href: "/progress", label: "Progress", flag: "progress_tracking" },
    { href: "/badges", label: "Badges", flag: "gamification" },
  ];
  
  const visibleLinks = links.filter(
    (link) => !link.flag || flags.has(link.flag)
  );
  
  return (
    <nav>
      {visibleLinks.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

### Page-Level Protection

```typescript
export default async function ProgressPage() {
  if (!(await isFeatureEnabled("progress_tracking"))) {
    notFound(); // Returns 404
  }
  
  // ... page content
}
```

### Component-Level Conditional Rendering

```typescript
export async function Dashboard() {
  const showAnalytics = await isFeatureEnabled("analytics");
  const showGamification = await isFeatureEnabled("gamification");
  
  return (
    <div>
      {showAnalytics && <AnalyticsCharts />}
      {showGamification && <BadgeDisplay />}
    </div>
  );
}
```

### Service-Level Checks

```typescript
export async function sendNotification(params) {
  const emailEnabled = await isFeatureEnabled("email_notifications");
  const pwaDenabled = await isFeatureEnabled("pwa");
  
  // In-app notification (always)
  await createNotification(params);
  
  // Email notification (conditional)
  if (emailEnabled) {
    await sendEmail(params);
  }
  
  // Push notification (conditional)
  if (pwaEnabled) {
    await sendPush(params.userId, params);
  }
}
```

---

## Feature Flag Dependencies

Some features depend on others:

| Feature | Depends On |
|---------|------------|
| memorization_plan_templates | memorization_plans |
| progress_tracking | memorization_plans |
| gamification | memorization_plans (for milestones) |

**Pattern** (example):

```typescript
const memorizationPlansEnabled = await isFeatureEnabled("memorization_plans");
const templatesEnabled = await isFeatureEnabled("memorization_plan_templates");

// Templates require plans to be enabled
const showTemplates = memorizationPlansEnabled && templatesEnabled;
```

---

## Experimental Features

### AI Recitation Review
- **Key**: `ai_recitation_review`
- **Default**: Disabled
- **Description**: AI-powered recitation review (future integration with speech-to-text API)

### Student Audio Upload
- **Key**: `student_audio_upload`
- **Default**: Disabled
- **Description**: Allow students to upload recitation audio files for moderator review

### Quran Explorer
- **Key**: `quran_explorer`
- **Default**: Enabled (experimental)
- **Description**: Native Quran text explorer with surah/juz/page navigation

---

## Audit Trail

All feature flag changes are logged:

```typescript
{
  actorId: "admin-user-id",
  action: "feature_flag.toggled",
  entityType: "FeatureFlag",
  entityId: "exams",
  metadata: { enabled: true },
  createdAt: "2026-05-31T..."
}
```

Viewable in Admin → Audit Logs (requires `audit_logs.view` permission).

---

## Cache Invalidation

Feature flag checks query the database on every request. For high-traffic scenarios, consider caching:

```typescript
import { unstable_cache } from "next/cache";

export const getEnabledFeatureFlagsCached = unstable_cache(
  async () => getEnabledFeatureFlags(),
  ["feature-flags"],
  { revalidate: 60 } // Revalidate every 60 seconds
);
```

Invalidate cache on flag toggle:

```typescript
import { revalidateTag } from "next/cache";

export async function toggleFeatureFlag(key, enabled, actorId) {
  // ... update flag
  revalidateTag("feature-flags");
}
```

---

## Testing with Feature Flags

### Unit Tests

```typescript
import { isFeatureEnabled } from "@/server/services/feature-flag";

jest.mock("@/server/services/feature-flag", () => ({
  isFeatureEnabled: jest.fn(),
}));

test("renders exams link when enabled", async () => {
  (isFeatureEnabled as jest.Mock).mockResolvedValue(true);
  
  const { getByText } = render(<Sidebar />);
  expect(getByText("Exams")).toBeInTheDocument();
});

test("hides exams link when disabled", async () => {
  (isFeatureEnabled as jest.Mock).mockResolvedValue(false);
  
  const { queryByText } = render(<Sidebar />);
  expect(queryByText("Exams")).not.toBeInTheDocument();
});
```

### E2E Tests

```typescript
test("feature flag gates exam page", async ({ page }) => {
  // Disable exams feature flag via API
  await toggleFeatureFlag("exams", false);
  
  await page.goto("/ar/admin/exams");
  await expect(page).toHaveTitle(/404/);
  
  // Re-enable
  await toggleFeatureFlag("exams", true);
  await page.goto("/ar/admin/exams");
  await expect(page.getByRole("heading", { name: "Exams" })).toBeVisible();
});
```

---

## Best Practices

1. **Default to Disabled**: New experimental features should default to `enabled: false`
2. **Descriptive Keys**: Use clear, lowercase, underscore-separated keys
3. **Document Impact**: Update this doc when adding new flags
4. **Gate Early**: Check flags at page level, not deep in component tree
5. **Audit Changes**: Always create audit logs when toggling flags
6. **Client Caching**: Pass flags as props from Server Components (avoid client-side DB queries)
7. **Cleanup**: Remove flags once feature is stable and permanently enabled

---

## Adding a New Feature Flag

1. **Add to seed script** (`prisma/seed.ts`):
   ```typescript
   { key: "new_feature", enabled: false, description: "New feature description" }
   ```

2. **Run seed**:
   ```bash
   pnpm db:seed
   ```

3. **Check flag in code**:
   ```typescript
   const enabled = await isFeatureEnabled("new_feature");
   ```

4. **Add to sidebar** (if applicable):
   ```typescript
   { href: "/new-feature", label: "New Feature", flag: "new_feature" }
   ```

5. **Update docs** (this file)

6. **Test toggle** in Admin → Settings
