# Progressive Web App (PWA)

## Overview

Yusr Academy is a fully functional Progressive Web App with offline support, push notifications, and mobile-first design. PWA features are powered by **Serwist 9.5.11** and **web-push 3.6.7**.

---

## PWA Manifest

**File**: `app/manifest.ts`

```typescript
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

### Icon Requirements

- `public/icons/icon-192.png` - 192x192 PNG (standard icon)
- `public/icons/icon-512.png` - 512x512 PNG (standard + maskable icon)

Icons must be placed in the `public/icons/` directory before build.

---

## Service Worker

**File**: `app/sw.ts`

### Initialization

```typescript
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

### Caching Strategies

#### Precache
- All static assets listed in `__SW_MANIFEST` (auto-generated during build)
- Includes: HTML, CSS, JS, fonts, images
- Cached on service worker installation

#### Runtime Cache (defaultCache)
Serwist's `defaultCache` includes:

```typescript
[
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts",
      expiration: { maxEntries: 4, maxAgeSeconds: 31536000 },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-font-assets",
      expiration: { maxEntries: 4, maxAgeSeconds: 604800 },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-image-assets",
      expiration: { maxEntries: 64, maxAgeSeconds: 86400 },
    },
  },
  {
    urlPattern: /\.(?:js)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-js-assets",
      expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
    },
  },
  {
    urlPattern: /\.(?:css|less)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-style-assets",
      expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
    },
  },
  {
    urlPattern: /\/api\/.*$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "apis",
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 16, maxAgeSeconds: 86400 },
    },
  },
  {
    urlPattern: /.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "others",
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
    },
  },
]
```

#### Offline Fallback
- When offline and page not cached, serves `/offline` page
- Only applies to navigation requests (not API calls)

---

## Push Notifications

### Server-Side Setup

#### VAPID Keys

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add to `.env`:

```
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@yusr.academy
```

#### Push Subscription Model

**Schema**:
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

#### Push Service

**File**: `server/services/push-notification.ts`

```typescript
import webpush from "web-push";

// Configure VAPID details
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPush(userId: string, notification: {
  title: string;
  body: string;
  url?: string;
}) {
  const subscriptions = await db.pushSubscription.findMany({ 
    where: { userId } 
  });
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(notification)
      );
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired, delete it
        await db.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
```

### Client-Side Setup

#### Service Worker Event Listeners

**File**: `app/sw.ts`

```typescript
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
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
```

#### Push Subscription (Client)

```typescript
"use client";

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.error("Push notifications not supported");
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  
  // Get VAPID public key from API
  const response = await fetch("/api/push/vapid");
  const { publicKey } = await response.json();
  
  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  
  // Save subscription to database
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

---

## Build Configuration

**File**: `next.config.ts`

```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
```

### Important Notes

- **Development**: Service worker is **disabled** (`disable: true`)
- **Production**: Service worker is compiled to `public/sw.js`
- **Build**: Must use `--webpack` flag (not Turbopack) for Serwist compatibility

```bash
pnpm build  # Uses --webpack flag in package.json
```

---

## Offline Fallback Page

**File**: `app/[locale]/offline/page.tsx` (to be created)

```typescript
export default function OfflinePage() {
  return (
    <div>
      <h1>You are offline</h1>
      <p>Please check your internet connection.</p>
    </div>
  );
}
```

---

## Mobile Bottom Navigation

For student mobile users, Yusr provides a bottom navigation bar (PWA-style).

**Condition**: Rendered only when `pwa` feature flag is enabled AND user is a student.

**Location**: `app/[locale]/(dashboard)/student/layout.tsx` (or similar)

**Structure**:
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
  <Link href="/ar/student/dashboard">Dashboard</Link>
  <Link href="/ar/student/sessions">Sessions</Link>
  <Link href="/ar/student/assignments">Assignments</Link>
  <Link href="/ar/student/progress">Progress</Link>
</nav>
```

---

## Installation Prompt

### Detecting Installability

```typescript
"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <button onClick={handleInstall}>
      Install Yusr Academy
    </button>
  );
}
```

---

## Testing PWA Features

### Local Testing

1. **Build the app**:
   ```bash
   pnpm build
   pnpm start
   ```

2. **Open in Chrome**: `http://localhost:3000`

3. **Check PWA status**:
   - Open DevTools → Application → Manifest
   - Verify manifest is valid
   - Check Service Workers tab (should show active service worker)

4. **Test Offline**:
   - DevTools → Network → Check "Offline"
   - Navigate to a page (should load from cache or show offline page)

5. **Test Push Notifications**:
   - Subscribe to push (via app UI)
   - DevTools → Application → Service Workers → Push
   - Send test notification

### Production Testing

1. Deploy to production
2. Visit site on mobile device
3. Tap "Add to Home Screen" (Chrome) or "Install" (Safari)
4. Verify icon appears on home screen
5. Open app from home screen (should open in standalone mode, no browser chrome)

---

## Feature Flag Integration

PWA features are gated by the `pwa` feature flag:

```typescript
const flags = await getEnabledFeatureFlags();
const isPWAEnabled = flags.has("pwa");

if (isPWAEnabled) {
  // Render push notification subscription UI
  // Render mobile bottom navigation
}
```

**Feature Flag**:
- **Key**: `pwa`
- **Default**: `true` (enabled)
- **Description**: "PWA features: push notifications and mobile bottom nav"

---

## Push Notification Flow

```
1. User logs in
2. Check if push permission granted
3. If not granted, show prompt
4. User accepts permission
5. Service worker subscribes to push manager
6. Subscription sent to server (/api/push/subscribe)
7. Server stores subscription in PushSubscription table
8. When event occurs (e.g., new assignment):
   - Server calls sendPush(userId, { title, body, url })
   - Server sends push notification via web-push
   - Service worker receives push event
   - Service worker shows notification
9. User clicks notification
10. Service worker focuses/opens app at specified URL
```

---

## Troubleshooting

### Service Worker Not Updating

**Problem**: Changes to service worker not reflected after deployment.

**Solution**: Hard refresh (Ctrl+Shift+R) or unregister service worker:

```typescript
navigator.serviceWorker.getRegistrations().then((registrations) => {
  for (const registration of registrations) {
    registration.unregister();
  }
});
```

### Push Notifications Not Received

**Checklist**:
1. VAPID keys configured in `.env`
2. `pwa` feature flag enabled
3. User granted push permission
4. Subscription saved to database
5. Service worker active
6. Device not in Do Not Disturb mode

### Manifest Not Loading

**Check**:
1. `app/manifest.ts` exports default function
2. Icons exist in `public/icons/`
3. No console errors in DevTools → Application → Manifest

### Build Fails with Serwist

**Error**: Serwist requires Webpack

**Solution**: Ensure `pnpm build` uses `--webpack` flag:

```json
{
  "scripts": {
    "build": "next build --webpack"
  }
}
```

---

## Security Considerations

### VAPID Keys
- Store in environment variables (never commit to repo)
- Use separate keys for development and production
- Rotate keys if compromised

### Push Notifications
- Validate notification payloads server-side
- Rate-limit push notifications per user
- Respect user preferences (allow opt-out)

### Service Worker
- HTTPS required (except localhost)
- Service worker can intercept ALL requests (be cautious)
- Avoid caching sensitive data

---

## Performance Impact

### Bundle Size
- Service worker: ~20 KB (compiled)
- web-push library: Server-side only (no client bundle impact)
- Serwist runtime: ~10 KB

### Cache Storage
- Precache size depends on app size (typically 1-5 MB)
- Runtime cache grows over time (Serwist manages expiration)
- IndexedDB used for push subscriptions (minimal storage)

### Network Requests
- First visit: Downloads all precached assets
- Subsequent visits: Serves from cache (instant load)
- Push notifications: Background sync (no user-facing latency)

---

## Future Enhancements

1. **Background Sync**: Queue mutations when offline, sync when online
2. **Periodic Background Sync**: Auto-refresh data in background
3. **App Shortcuts**: Add quick actions to home screen icon
4. **Share Target**: Allow sharing to Yusr from other apps
5. **Badging API**: Show unread notification count on app icon
