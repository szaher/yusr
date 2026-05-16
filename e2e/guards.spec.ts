import { test, expect } from "./fixtures";

// These tests require unauthenticated state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Route protection", () => {
  test("unauthenticated user visiting admin dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/ar/admin/dashboard");

    await page.waitForURL("**/ar/login", { timeout: 15000 });
    expect(page.url()).toContain("/ar/login");
  });

  test("unauthenticated user visiting student dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/ar/student/dashboard");

    await page.waitForURL("**/ar/login", { timeout: 15000 });
    expect(page.url()).toContain("/ar/login");
  });
});
