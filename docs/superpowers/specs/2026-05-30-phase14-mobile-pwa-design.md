# Phase 14: Mobile / PWA

## Goal

Make Yusr Academy installable as a Progressive Web App with read-only offline support, web push notifications, and a mobile-optimized student experience.

## Architecture

Adds Serwist (next-pwa successor) for service worker generation with Workbox-based caching strategies. A new `PushSubscription` model stores VAPID web push subscriptions per user. The existing `Notification` creation flow is extended to fire push notifications. A bottom navigation bar replaces the sidebar for students on mobile.

## Feature Flag

`pwa` — gates the push notification opt-in UI and the bottom nav. The service worker and manifest are always active (they're infrastructure, not a feature toggle).

---

## 1. PWA Foundation

### Web App Manifest

Create `app/manifest.ts` (Next.js Metadata API):

```ts
export default function manifest() {
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
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

### Viewport Meta

Add to root layout metadata in `app/layout.tsx`:

```ts
export const metadata = {
  // ...existing
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};
```

Note: Next.js 16 may use the `viewport` export instead of embedding in metadata. Follow the framework's current pattern.

### App Icons

Create icon files in `public/icons/`:
- `icon-192.png` — 192x192, app icon
- `icon-512.png` — 512x512, app icon + maskable
- `apple-touch-icon.png` — 180x180, for iOS home screen
- `favicon.ico` — 32x32, browser tab

Generate from the existing app branding. Use a solid green (#16a34a) background with white Arabic calligraphy "يسر" or a simple book/Quran icon.

### Apple-Specific Meta

Add to root layout `<head>`:
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`

---

## 2. Service Worker with Serwist

### Dependencies

```bash
pnpm add @serwist/next
pnpm add -D serwist
```

### next.config.ts Integration

```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// Wrap existing config
export default withSerwist(withNextIntl(nextConfig));
```

### Service Worker (`app/sw.ts`)

```ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      { url: "/offline", matcher: ({ request }) => request.destination === "document" },
    ],
  },
});

serwist.addEventListeners();
```

### Runtime Caching Strategies

Serwist's `defaultCache` provides sensible defaults. Customize if needed:

| Pattern | Strategy | Notes |
|---------|----------|-------|
| Page navigations | NetworkFirst | Falls back to `/offline` page |
| Static assets (JS/CSS/fonts) | CacheFirst | Precached on install |
| API GET requests | StaleWhileRevalidate | Serve cached, update in background |
| Images | CacheFirst | 30-day max age |

### Offline Fallback Page

Create `app/offline/page.tsx` — a simple static page:
- Shows app icon and "You're offline" / "أنت غير متصل بالإنترنت"
- "Try again" button that calls `window.location.reload()`
- No data fetching, no auth checks — purely static

---

## 3. Push Notifications

### New Model: `PushSubscription`

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

Add reverse relation on User: `pushSubscriptions PushSubscription[]`

### Environment Variables

```
VAPID_PUBLIC_KEY=<generated-base64>
VAPID_PRIVATE_KEY=<generated-base64>
VAPID_SUBJECT=mailto:admin@yusr.academy
```

Generate with `npx web-push generate-vapid-keys`.

### Dependencies

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

### Server Service (`server/services/push-notification.ts`)

Functions:
- `subscribe(userId, subscription)` — save PushSubscription to database
- `unsubscribe(endpoint)` — delete by endpoint
- `sendPush(userId, { title, body, url })` — find all subscriptions for user, send via `web-push`. On 410 Gone response, delete stale subscription.
- `sendPushToMany(userIds, payload)` — batch send

### Integration with Existing Notification Flow

The existing notification creation happens in various services (gamification, exams, announcements, leave requests). Each calls `db.notification.create()`.

Create a wrapper `createNotificationWithPush(data)` that:
1. Creates the `Notification` record (existing behavior)
2. Calls `sendPush(recipientId, { title, body })` fire-and-forget

Replace direct `db.notification.create()` calls in:
- `server/services/gamification.ts` (badge earned)
- `server/services/exam.ts` (exam published/graded)
- `server/services/leave-request.ts` (status change)
- `server/services/announcement.ts` (new announcement)
- `prisma/demo-seed.ts` — skip push for demo data (just create notification records)

### Client-Side Subscription

Create `components/pwa/push-subscription.tsx` — client component that:
1. On mount, checks if `Notification.permission` is not `denied`
2. If not subscribed, shows a non-blocking prompt (small banner, not a modal)
3. On accept: registers SW, calls `sw.pushManager.subscribe()` with VAPID public key, sends subscription to server via API route
4. On dismiss: stores dismissal in localStorage, don't show again for 7 days

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/push/subscribe` | Save push subscription |
| DELETE | `/api/push/unsubscribe` | Remove subscription |

### Profile Push Toggle

On the student/moderator profile page, add a toggle to enable/disable push notifications. When disabled, delete all subscriptions for that user.

---

## 4. Mobile UI — Student Bottom Navigation

### Bottom Nav Component (`components/layout/bottom-nav.tsx`)

A fixed bottom navigation bar, shown only for student role on viewports < 640px (`sm` breakpoint). 5 tabs:

| Tab | Icon | Route | Label key |
|-----|------|-------|-----------|
| Dashboard | Home | `/student/dashboard` | `nav.dashboard` |
| Memorization | BookOpen | `/student/memorization` | `nav.memorization` |
| Sessions | Calendar | `/student/sessions` | `nav.sessions` |
| Assignments | ClipboardList | `/student/assignments` | `nav.assignments` |
| More | Menu | (opens sheet) | `nav.more` |

The "More" tab opens a slide-up sheet with remaining links: Profile, Grades, Exams, Leave Requests, Notifications, Support, Quran Explorer.

### Sidebar Hiding

On mobile (< 640px) for student role, hide the sidebar entirely and show the bottom nav instead. The sidebar remains for moderator/admin on all viewports (they use the app less frequently on mobile, and their navigation is more complex).

### Implementation

- Detect user role from session in the dashboard layout
- Conditionally render `<BottomNav>` for students
- Add `pb-16` (padding-bottom) to main content area on mobile to prevent content from being hidden behind the fixed bottom nav
- Use `env(safe-area-inset-bottom)` for notched phones

### Touch Target & Input Improvements

- Audit all `Button` and interactive elements — ensure min 44px touch target via `min-h-11 min-w-11` utility classes where needed
- Add `inputMode="numeric"` to ayah/surah number inputs, grade inputs
- Add `inputMode="email"` to email login field
- Add `inputMode="tel"` to phone number fields in registration

---

## 5. i18n Keys

Extend the `common` or `nav` namespace:

| Key | ar | en |
|-----|----|----|
| `nav.more` | المزيد | More |
| `pwa.offline` | أنت غير متصل بالإنترنت | You are offline |
| `pwa.tryAgain` | حاول مرة أخرى | Try Again |
| `pwa.offlineDesc` | بعض المحتوى متاح بدون اتصال | Some content is available offline |
| `pwa.enableNotifications` | تفعيل الإشعارات | Enable Notifications |
| `pwa.notificationPrompt` | احصل على إشعارات للتحديثات المهمة | Get notified about important updates |
| `pwa.dismiss` | لاحقاً | Later |
| `pwa.pushEnabled` | الإشعارات مفعلة | Push notifications enabled |
| `pwa.pushDisabled` | الإشعارات معطلة | Push notifications disabled |
| `pwa.installApp` | تثبيت التطبيق | Install App |

---

## 6. Seed Data

- Generate VAPID keys and add to `.env.example`
- Add `pwa` feature flag to `seedFeatureFlags()` (enabled: true)
- No push subscriptions in demo seed (requires real browser)

---

## 7. Testing Considerations

- **Manifest validation** — Chrome DevTools > Application > Manifest shows all fields correctly
- **Installability** — Chrome shows "Install" prompt, iOS Safari shows "Add to Home Screen"
- **Offline page** — disable network in DevTools, navigate to any page → shows offline fallback
- **Cached data** — load student dashboard online, go offline, reload → cached plan/grades still visible
- **Push notification** — subscribe, trigger a badge/announcement, verify push arrives
- **Bottom nav** — resize to mobile, verify bottom nav appears for student, sidebar hidden
- **RTL** — verify bottom nav and offline page render correctly in Arabic
- **Safe areas** — test on iPhone with notch in standalone mode
