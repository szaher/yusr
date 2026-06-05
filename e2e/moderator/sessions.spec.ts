import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Moderator sessions", () => {
  test("moderator can view sessions page", async ({ page, loginAs }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/moderator/sessions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
  });
});
