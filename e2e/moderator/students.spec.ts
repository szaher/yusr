import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Moderator students", () => {
  test("moderator can view students page", async ({ page, loginAs }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/moderator/students");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("moderator can search students", async ({ page, loginAs }) => {
    await loginAs(page, "moderator");

    await page.goto("/ar/moderator/students");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByRole("searchbox").or(
      page.locator('input[type="search"], input[name="search"], input[placeholder*="بحث"]')
    );
    await searchInput.first().fill("طالب");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("search=");
  });
});
