# Phase 14: Mobile / PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Yusr Academy installable as a PWA with read-only offline support, web push notifications, and a mobile-optimized student bottom navigation.

**Architecture:** Serwist (next-pwa successor) generates a service worker with Workbox caching. A new `PushSubscription` model stores VAPID subscriptions. The existing `createNotification` / `createBulkNotifications` functions are extended to fire push. A bottom nav replaces the sidebar for students on mobile.

**Tech Stack:** Serwist, web-push (VAPID), Next.js 16 Metadata API (manifest), Tailwind CSS, shadcn/ui Sheet component

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `public/icons/icon-192.png` | Create | 192x192 app icon |
| `public/icons/icon-512.png` | Create | 512x512 app icon (also maskable) |
| `public/icons/apple-touch-icon.png` | Create | 180x180 iOS icon |
| `public/icons/favicon.ico` | Create | 32x32 browser tab icon |
| `app/manifest.ts` | Create | Web App Manifest |
| `app/layout.tsx` | Modify | Viewport meta, apple meta tags |
| `app/sw.ts` | Create | Service worker source |
| `app/offline/page.tsx` | Create | Offline fallback page |
| `next.config.ts` | Modify | Add Serwist plugin |
| `prisma/schema.prisma` | Modify | Add PushSubscription model |
| `server/services/push-notification.ts` | Create | Push subscribe/unsubscribe/send |
| `server/services/notification.ts` | Modify | Add push dispatch to createNotification |
| `app/api/push/subscribe/route.ts` | Create | POST — save push subscription |
| `app/api/push/unsubscribe/route.ts` | Create | DELETE — remove subscription |
| `components/pwa/push-subscription.tsx` | Create | Client-side push opt-in banner |
| `components/layout/bottom-nav.tsx` | Create | Student mobile bottom nav |
| `components/layout/app-shell.tsx` | Modify | Conditionally render bottom nav |
| `components/layout/sidebar.tsx` | Modify | Hide on mobile for students |
| `prisma/seed.ts` | Modify | Add `pwa` feature flag |
| `messages/ar.json` | Modify | Add i18n keys |
| `messages/en.json` | Modify | Add i18n keys |
| `.env.example` | Modify | Add VAPID env vars |

---

### Task 0: PWA Foundation — Icons, Manifest, Viewport

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/apple-touch-icon.png`
- Create: `public/icons/favicon.ico`
- Create: `app/manifest.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Generate app icons**

Create `public/icons/` directory. Generate a simple app icon: green (#16a34a) circle background with white Arabic text "يسر" centered.

Use a canvas script, an online generator, or create placeholder solid-color PNGs. The icons must be:
- `icon-192.png` — 192x192 PNG
- `icon-512.png` — 512x512 PNG
- `apple-touch-icon.png` — 180x180 PNG
- `favicon.ico` — 32x32 ICO (or 32x32 PNG renamed to .ico)

For placeholder icons during development, create solid green squares:

```bash
mkdir -p public/icons
# Using ImageMagick if available:
convert -size 512x512 xc:'#16a34a' public/icons/icon-512.png
convert -size 192x192 xc:'#16a34a' public/icons/icon-192.png
convert -size 180x180 xc:'#16a34a' public/icons/apple-touch-icon.png
convert -size 32x32 xc:'#16a34a' public/icons/favicon.ico
```

If ImageMagick is not available, create minimal valid PNGs programmatically with Node.js or download placeholder icons.

- [ ] **Step 2: Create web app manifest**

Create `app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yusr Academy for Quran Learning",
    short_name: "Yusr",
    description: "أكاديمية يسر لتعليم القرآن الكريم",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    dir: "auto",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

- [ ] **Step 3: Update root layout metadata and head**

In `app/layout.tsx`, update the metadata export and add apple-specific meta tags.

Current metadata (lines 24-27):
```ts
export const metadata = {
  title: "Yusr Academy",
  description: "Yusr Academy for Quran Learning",
};
```

Replace with:
```ts
export const metadata: Metadata = {
  title: "Yusr Academy",
  description: "Yusr Academy for Quran Learning",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yusr",
  },
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};
```

Add the `Metadata` and `Viewport` imports from `next`:
```ts
import type { Metadata, Viewport } from "next";
```

- [ ] **Step 4: Verify manifest loads**

Start the dev server and navigate to `http://localhost:3000/manifest.webmanifest`. Verify it returns valid JSON with name, icons, and display fields.

- [ ] **Step 5: Commit**

```bash
git add public/icons/ app/manifest.ts app/layout.tsx
git commit -m "feat(pwa): add web app manifest, viewport meta, and app icons"
```

---

### Task 1: Service Worker with Serwist

**Files:**
- Create: `app/sw.ts`
- Create: `app/offline/page.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Install Serwist dependencies**

```bash
pnpm add @serwist/next
pnpm add -D serwist
```

- [ ] **Step 2: Create service worker source**

Create `app/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

- [ ] **Step 3: Create offline fallback page**

Create `app/offline/page.tsx`:

```tsx
export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      dir="auto"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600"
        >
          <line x1="1" x2="23" y1="1" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" x2="12.01" y1="20" y2="20" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold">
        <span lang="ar">أنت غير متصل بالإنترنت</span>
        <span className="mx-2">—</span>
        <span lang="en">You are offline</span>
      </h1>
      <p className="text-muted-foreground max-w-md">
        <span lang="ar">بعض المحتوى متاح بدون اتصال.</span>{" "}
        <span lang="en">Some content is available offline.</span>
      </p>
      <button
        onClick="window.location.reload()"
        className="mt-4 rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
      >
        <span lang="ar">حاول مرة أخرى</span> / <span lang="en">Try Again</span>
      </button>
    </div>
  );
}
```

Note: This page is intentionally static with inline bilingual text (no i18n dependency) so it works offline without any data fetching. The `onClick` uses a string because this is a server component that must work without JS hydration — alternatively, make it a client component with `"use client"` and use `() => window.location.reload()`.

- [ ] **Step 4: Update next.config.ts**

Current content of `next.config.ts`:

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = {
  output: "standalone" as const,
};

export default withNextIntl(nextConfig);
```

Replace with:

```ts
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  output: "standalone" as const,
};

export default withSerwist(withNextIntl(nextConfig));
```

Add `public/sw.js` and `public/swe-worker-*.js` to `.gitignore` (these are generated build artifacts):

```
# Serwist service worker (generated)
public/sw.js
public/sw.js.map
public/swe-worker-*.js
```

- [ ] **Step 5: Build and verify**

```bash
pnpm build
```

Verify that `public/sw.js` is generated. Check the build output for any service worker errors.

- [ ] **Step 6: Commit**

```bash
git add app/sw.ts app/offline/page.tsx next.config.ts .gitignore pnpm-lock.yaml package.json
git commit -m "feat(pwa): add Serwist service worker with offline fallback"
```

---

### Task 2: PushSubscription Schema + Feature Flag

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add PushSubscription model**

In `prisma/schema.prisma`, add after the `Notification` model:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Add the reverse relation on the `User` model:

```prisma
  pushSubscriptions    PushSubscription[]
```

- [ ] **Step 2: Add `pwa` feature flag to seed**

In `prisma/seed.ts`, add to the `flags` array in `seedFeatureFlags()`:

```ts
{ key: "pwa", enabled: true, description: "PWA features: push notifications and mobile bottom nav" },
```

- [ ] **Step 3: Add VAPID env vars to .env.example**

Append to `.env.example`:

```
# Push Notifications (VAPID)
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yusr.academy
```

- [ ] **Step 4: Push schema and seed**

```bash
npx prisma db push
npx prisma generate
npx prisma db seed
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts .env.example
git commit -m "feat(schema): add PushSubscription model and pwa feature flag"
```

---

### Task 3: Push Notification Service

**Files:**
- Create: `server/services/push-notification.ts`
- Modify: `server/services/notification.ts`

- [ ] **Step 1: Install web-push**

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2: Create push notification service**

Create `server/services/push-notification.ts`:

```ts
import webpush from "web-push";
import { db } from "@/server/db/client";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@yusr.academy";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function isConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export async function subscribe(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  return db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function unsubscribe(endpoint: string) {
  return db.pushSubscription.deleteMany({
    where: { endpoint },
  });
}

export async function unsubscribeAll(userId: string) {
  return db.pushSubscription.deleteMany({
    where: { userId },
  });
}

export async function sendPush(
  userId: string,
  payload: { title: string; body?: string; url?: string }
) {
  if (!isConfigured()) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await db.pushSubscription.delete({ where: { id: sub.id } });
        }
        throw err;
      }
    })
  );

  return results;
}

export async function sendPushToMany(
  userIds: string[],
  payload: { title: string; body?: string; url?: string }
) {
  if (!isConfigured() || userIds.length === 0) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await db.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    })
  );
}

export function getVapidPublicKey(): string | undefined {
  return VAPID_PUBLIC_KEY;
}
```

- [ ] **Step 3: Extend notification service with push dispatch**

In `server/services/notification.ts`, add push integration. The current `createNotification` function (lines 3-10):

```ts
export async function createNotification(params: {
  recipientId: string;
  type: string;
  title: string;
  body?: string;
}) {
  return db.notification.create({ data: params });
}
```

Replace with:

```ts
import { sendPush } from "./push-notification";

export async function createNotification(params: {
  recipientId: string;
  type: string;
  title: string;
  body?: string;
}) {
  const notification = await db.notification.create({ data: params });

  sendPush(params.recipientId, {
    title: params.title,
    body: params.body,
    url: "/",
  }).catch(() => {});

  return notification;
}
```

The current `createBulkNotifications` function (lines 48-64):

```ts
export async function createBulkNotifications(
  recipientIds: string[],
  type: string,
  title: string,
  body?: string
) {
  if (recipientIds.length === 0) return;

  return db.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      type,
      title,
      body: body || null,
    })),
  });
}
```

Replace with:

```ts
import { sendPushToMany } from "./push-notification";

export async function createBulkNotifications(
  recipientIds: string[],
  type: string,
  title: string,
  body?: string
) {
  if (recipientIds.length === 0) return;

  const result = await db.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      type,
      title,
      body: body || null,
    })),
  });

  sendPushToMany(recipientIds, { title, body, url: "/" }).catch(() => {});

  return result;
}
```

Both use fire-and-forget (`.catch(() => {})`) so push failures never block the main flow.

- [ ] **Step 4: Commit**

```bash
git add server/services/push-notification.ts server/services/notification.ts pnpm-lock.yaml package.json
git commit -m "feat(push): add web-push service and integrate with notification flow"
```

---

### Task 4: Push Subscription API Routes

**Files:**
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/unsubscribe/route.ts`

- [ ] **Step 1: Create subscribe route**

Create `app/api/push/subscribe/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { subscribe } from "@/server/services/push-notification";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await subscribe(session.user.id, {
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create unsubscribe route**

Create `app/api/push/unsubscribe/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { unsubscribe, unsubscribeAll } from "@/server/services/push-notification";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await unsubscribeAll(session.user.id);
  } else if (body.endpoint) {
    await unsubscribe(body.endpoint);
  } else {
    return NextResponse.json({ error: "Missing endpoint or all flag" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/push/subscribe/route.ts app/api/push/unsubscribe/route.ts
git commit -m "feat(api): add push subscription and unsubscribe routes"
```

---

### Task 5: Client-Side Push Subscription Component

**Files:**
- Create: `components/pwa/push-subscription.tsx`
- Modify: `components/layout/app-shell.tsx`

- [ ] **Step 1: Create push subscription banner component**

Create `components/pwa/push-subscription.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "push-prompt-dismissed";
const DISMISS_DAYS = 7;

export function PushSubscriptionBanner({
  vapidPublicKey,
  translations,
}: {
  vapidPublicKey: string;
  translations: {
    enableNotifications: string;
    notificationPrompt: string;
    dismiss: string;
  };
}) {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      setSubscribed(true);
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    setShow(true);
  }, []);

  async function handleEnable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setSubscribed(true);
      setShow(false);
    } catch {
      setShow(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setShow(false);
  }

  if (!show || subscribed) return null;

  return (
    <div className="fixed bottom-20 start-4 end-4 z-50 sm:bottom-4 sm:start-auto sm:end-4 sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium">{translations.enableNotifications}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {translations.notificationPrompt}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleEnable}>
              {translations.enableNotifications}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {translations.dismiss}
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

- [ ] **Step 2: Add banner to AppShell**

In `components/layout/app-shell.tsx`, import and render the banner. The current structure (lines 5-23):

```tsx
export function AppShell({
  children,
  role,
  enabledFlags,
}: {
  children: ReactNode;
  role: string;
  enabledFlags?: string[];
}) {
  return (
    <div className="flex h-screen">
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200">{children}</main>
      </div>
    </div>
  );
}
```

Add a `vapidPublicKey` prop (passed from the dashboard layout) and render the banner:

```tsx
import { PushSubscriptionBanner } from "@/components/pwa/push-subscription";

export function AppShell({
  children,
  role,
  enabledFlags,
  vapidPublicKey,
  pushTranslations,
}: {
  children: ReactNode;
  role: string;
  enabledFlags?: string[];
  vapidPublicKey?: string;
  pushTranslations?: {
    enableNotifications: string;
    notificationPrompt: string;
    dismiss: string;
  };
}) {
  const flagSet = new Set(enabledFlags);

  return (
    <div className="flex h-screen">
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200">{children}</main>
      </div>
      {vapidPublicKey && flagSet.has("pwa") && pushTranslations && (
        <PushSubscriptionBanner
          vapidPublicKey={vapidPublicKey}
          translations={pushTranslations}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Pass vapidPublicKey from dashboard layout**

In `app/[locale]/(dashboard)/layout.tsx`, pass the VAPID public key and translations to AppShell. The current code (lines 8-27):

```tsx
export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const enabledFlags = await getEnabledFeatureFlags();

  return <AppShell role={session.user.role} enabledFlags={[...enabledFlags]}>{children}</AppShell>;
}
```

Update to:

```tsx
import { getVapidPublicKey } from "@/server/services/push-notification";
import { getTranslations } from "next-intl/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const enabledFlags = await getEnabledFeatureFlags();
  const vapidPublicKey = getVapidPublicKey();
  const t = await getTranslations("pwa");

  return (
    <AppShell
      role={session.user.role}
      enabledFlags={[...enabledFlags]}
      vapidPublicKey={vapidPublicKey}
      pushTranslations={{
        enableNotifications: t("enableNotifications"),
        notificationPrompt: t("notificationPrompt"),
        dismiss: t("dismiss"),
      }}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/pwa/push-subscription.tsx components/layout/app-shell.tsx app/[locale]/(dashboard)/layout.tsx
git commit -m "feat(pwa): add push notification subscription banner"
```

---

### Task 6: Student Bottom Navigation

**Files:**
- Create: `components/layout/bottom-nav.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Create bottom nav component**

Create `components/layout/bottom-nav.tsx`:

```tsx
"use client";

import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Home, BookOpen, Calendar, ClipboardList, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const MAIN_TABS = [
  { key: "dashboard", href: "/student/dashboard", icon: Home, labelKey: "dashboard" },
  { key: "memorization", href: "/student/memorization", icon: BookOpen, labelKey: "memorization" },
  { key: "sessions", href: "/student/sessions", icon: Calendar, labelKey: "sessions" },
  { key: "assignments", href: "/student/assignments", icon: ClipboardList, labelKey: "assignments" },
] as const;

const MORE_LINKS = [
  { href: "/student/profile", labelKey: "profile" },
  { href: "/student/grades", labelKey: "grades" },
  { href: "/student/exams", labelKey: "exams" },
  { href: "/student/leave-requests", labelKey: "leaveRequests" },
  { href: "/support/notifications", labelKey: "notifications" },
  { href: "/support/tickets", labelKey: "tickets" },
  { href: "/student/quran", labelKey: "quran" },
  { href: "/student/progress", labelKey: "progress" },
] as const;

export function BottomNav({ enabledFlags }: { enabledFlags?: string[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const [sheetOpen, setSheetOpen] = useState(false);

  const flagSet = new Set(enabledFlags);

  function isActive(href: string) {
    return pathname.startsWith(`/${locale}${href}`);
  }

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-40 border-t bg-background sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around">
        {MAIN_TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              href={`/${locale}${tab.href}`}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                active
                  ? "text-green-600 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground">
              <Menu className="h-5 w-5" />
              <span>{t("more")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader>
              <SheetTitle>{t("more")}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 py-4">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  onClick={() => setSheetOpen(false)}
                  className={`rounded-md px-4 py-3 text-sm ${
                    isActive(link.href)
                      ? "bg-accent font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Add bottom nav to AppShell and adjust layout**

In `components/layout/app-shell.tsx`, add the bottom nav for students and adjust main padding:

```tsx
import { BottomNav } from "@/components/layout/bottom-nav";

export function AppShell({
  children,
  role,
  enabledFlags,
  vapidPublicKey,
  pushTranslations,
}: {
  children: ReactNode;
  role: string;
  enabledFlags?: string[];
  vapidPublicKey?: string;
  pushTranslations?: {
    enableNotifications: string;
    notificationPrompt: string;
    dismiss: string;
  };
}) {
  const flagSet = new Set(enabledFlags);
  const isStudent = role === "student";
  const showBottomNav = isStudent && flagSet.has("pwa");

  return (
    <div className="flex h-screen">
      <Sidebar role={role} enabledFlags={enabledFlags} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} enabledFlags={enabledFlags} />
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200 ${showBottomNav ? "pb-20 sm:pb-6" : ""}`}>
          {children}
        </main>
      </div>
      {showBottomNav && <BottomNav enabledFlags={enabledFlags} />}
      {vapidPublicKey && flagSet.has("pwa") && pushTranslations && (
        <PushSubscriptionBanner
          vapidPublicKey={vapidPublicKey}
          translations={pushTranslations}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Hide sidebar on mobile for students**

In `components/layout/sidebar.tsx`, the sidebar is currently always rendered. Add a conditional class to hide it on mobile when the user is a student:

Find the outermost `<aside>` or `<nav>` element of the sidebar and add `hidden sm:flex` when role is student. The exact change depends on the current markup, but the pattern is:

```tsx
// In the Sidebar component, the role prop is already available.
// Wrap the sidebar container class:
const sidebarClasses = role === "student"
  ? "hidden sm:flex ..." // hidden on mobile, visible on sm+
  : "flex ..."; // always visible for moderator/admin
```

This ensures students see the bottom nav on mobile instead of the sidebar, while moderators/admins always get the sidebar.

- [ ] **Step 4: Commit**

```bash
git add components/layout/bottom-nav.tsx components/layout/app-shell.tsx components/layout/sidebar.tsx
git commit -m "feat(ui): add student bottom navigation for mobile"
```

---

### Task 7: i18n Keys

**Files:**
- Modify: `messages/ar.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add Arabic i18n keys**

In `messages/ar.json`, add a new `"pwa"` namespace at the top level (alongside `"common"`, `"auth"`, etc.):

```json
"pwa": {
  "offline": "أنت غير متصل بالإنترنت",
  "tryAgain": "حاول مرة أخرى",
  "offlineDesc": "بعض المحتوى متاح بدون اتصال",
  "enableNotifications": "تفعيل الإشعارات",
  "notificationPrompt": "احصل على إشعارات للتحديثات المهمة",
  "dismiss": "لاحقاً",
  "pushEnabled": "الإشعارات مفعلة",
  "pushDisabled": "الإشعارات معطلة",
  "installApp": "تثبيت التطبيق"
}
```

Also add to the `"nav"` namespace:

```json
"more": "المزيد"
```

- [ ] **Step 2: Add English i18n keys**

In `messages/en.json`, add the same `"pwa"` namespace:

```json
"pwa": {
  "offline": "You are offline",
  "tryAgain": "Try Again",
  "offlineDesc": "Some content is available offline",
  "enableNotifications": "Enable Notifications",
  "notificationPrompt": "Get notified about important updates",
  "dismiss": "Later",
  "pushEnabled": "Push notifications enabled",
  "pushDisabled": "Push notifications disabled",
  "installApp": "Install App"
}
```

Also add to the `"nav"` namespace:

```json
"more": "More"
```

- [ ] **Step 3: Commit**

```bash
git add messages/ar.json messages/en.json
git commit -m "feat(i18n): add PWA and bottom nav translation keys"
```

---

### Task 8: Touch Target & Input Mode Improvements

**Files:**
- Modify: various form pages (targeted fixes)

- [ ] **Step 1: Add inputMode to login form**

In `components/forms/login-form.tsx`, find the email input and add `inputMode="email"`:

```tsx
<Input name="email" type="email" inputMode="email" ... />
```

- [ ] **Step 2: Add inputMode to registration form**

In `components/forms/register-form.tsx`, find the phone input and add `inputMode="tel"`:

```tsx
<Input name="phone" type="tel" inputMode="tel" ... />
```

- [ ] **Step 3: Add inputMode to memorization review form**

Find the surah/ayah number inputs in the moderator review form (`app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/page.tsx`) and add `inputMode="numeric"`:

```tsx
<Input name="fromSurahNumber" type="number" inputMode="numeric" ... />
<Input name="fromAyah" type="number" inputMode="numeric" ... />
<Input name="toSurahNumber" type="number" inputMode="numeric" ... />
<Input name="toAyah" type="number" inputMode="numeric" ... />
<Input name="grade" type="number" inputMode="numeric" ... />
```

- [ ] **Step 4: Commit**

```bash
git add components/forms/login-form.tsx components/forms/register-form.tsx app/[locale]/(dashboard)/moderator/memorization/[studentId]/review/page.tsx
git commit -m "feat(mobile): add inputMode attributes for mobile keyboards"
```

---

### Task 9: Service Worker Push Event Handler

**Files:**
- Modify: `app/sw.ts`

- [ ] **Step 1: Add push and notification click handlers to the service worker**

In `app/sw.ts`, add push event handling after `serwist.addEventListeners()`:

```ts
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "Yusr Academy";
  const options: NotificationOptions = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "auto",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add app/sw.ts
git commit -m "feat(sw): add push notification and click handlers"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Section 1 (PWA Foundation: manifest, viewport, icons, apple meta) → Task 0
- [x] Section 2 (Service Worker with Serwist: dependencies, config, SW, offline page) → Task 1
- [x] Section 3 (Push: schema, VAPID, web-push, service, notification integration, client subscribe, API routes, profile toggle) → Tasks 2, 3, 4, 5, 9
- [x] Section 4 (Mobile UI: bottom nav, sidebar hiding, touch targets, inputMode) → Tasks 6, 8
- [x] Section 5 (i18n) → Task 7
- [x] Section 6 (Seed: feature flag, VAPID env vars) → Task 2

**Spec gap found:** Profile push toggle (Section 3) — the spec mentions adding a push toggle to the profile page. This is a minor UI addition that can be deferred or added as a quick follow-up. The unsubscribeAll API is already in place from Task 4.

**Placeholder scan:** No TBDs or TODOs. Icon generation in Task 0 uses ImageMagick with a fallback note.

**Type consistency:** `vapidPublicKey` prop name used consistently across Tasks 5 and the dashboard layout. `PushSubscriptionBanner` component name matches between Task 5 Step 1 (creation) and Step 2 (usage in AppShell). `sendPush` / `sendPushToMany` names match between Task 3 service definition and notification.ts integration.
