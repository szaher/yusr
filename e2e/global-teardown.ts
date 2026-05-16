import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig) {
  // Minimal cleanup — the test database is reset on each run via global-setup.
  // Add any additional teardown logic here if needed in the future.
}
