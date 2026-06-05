import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Moderator dashboard", () => {
  test("moderator dashboard loads", async ({ page, loginAs }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/moderator/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
  });
});
