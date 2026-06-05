import { headers } from "next/headers";

const store = new Map<string, number[]>();

let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [key, timestamps] of store) {
      const filtered = timestamps.filter((t) => now - t < 3600_000);
      if (filtered.length === 0) {
        store.delete(key);
      } else {
        store.set(key, filtered);
      }
    }
    cleanupScheduled = false;
  }, 60_000);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = store.get(key) || [];
  const windowStart = now - windowMs;

  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const oldestInWindow = recent[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { success: false, retryAfter };
  }

  recent.push(now);
  store.set(key, recent);
  scheduleCleanup();

  return { success: true };
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}
