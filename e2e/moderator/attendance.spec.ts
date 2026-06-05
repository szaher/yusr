import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Moderator attendance", () => {
  test("moderator can view attendance page", async ({ page, loginAs }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/moderator/attendance");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
  });
});
