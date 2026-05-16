import { test, expect } from "../fixtures";

test.describe("Feature flags management", () => {
  test("feature flags page loads with title", async ({ page }) => {
    await page.goto("/ar/admin/feature-flags");
    await expect(
      page.getByRole("heading", { name: "إعدادات الميزات" })
    ).toBeVisible();
  });

  test("toggle a feature flag changes its status", async ({ page }) => {
    await page.goto("/ar/admin/feature-flags");

    const firstRow = page.locator("tbody tr").first();
    const badge = firstRow.locator("span");
    const initialStatus = await badge.textContent();

    const toggleButton = firstRow.getByRole("button");
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/admin/feature-flags") && res.status() === 200
      ),
      toggleButton.click(),
    ]);

    await page.waitForLoadState("networkidle");
    const newStatus = await page
      .locator("tbody tr")
      .first()
      .locator("span")
      .textContent();
    expect(newStatus).not.toBe(initialStatus);
  });

  test("toggle button has type=submit (regression)", async ({ page }) => {
    await page.goto("/ar/admin/feature-flags");
    const toggleButton = page
      .locator("tbody tr")
      .first()
      .getByRole("button");
    await expect(toggleButton).toHaveAttribute("type", "submit");
  });
});
