import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Role-based access control", () => {
  test("student cannot access admin dashboard", async ({ page, loginAs }) => {
    await loginAs(page, "student");

    await page.goto("/ar/admin/dashboard");
    await page.waitForURL((url) => !url.pathname.includes("/admin/"), {
      timeout: 15000,
    });

    expect(page.url()).not.toContain("/admin/");
  });

  test("student cannot access moderator dashboard", async ({
    page,
    loginAs,
  }) => {
    await loginAs(page, "student");

    await page.goto("/ar/moderator/dashboard");
    await page.waitForURL((url) => !url.pathname.includes("/moderator/"), {
      timeout: 15000,
    });

    expect(page.url()).not.toContain("/moderator/");
  });

  test("moderator cannot access admin dashboard", async ({
    page,
    loginAs,
  }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/admin/dashboard");
    await page.waitForURL((url) => !url.pathname.includes("/admin/"), {
      timeout: 15000,
    });

    expect(page.url()).not.toContain("/admin/");
  });
});
