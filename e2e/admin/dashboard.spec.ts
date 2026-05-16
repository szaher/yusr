import { test, expect } from "../fixtures";

test.describe("Admin dashboard", () => {
  test("loads with the correct title", async ({ page }) => {
    await page.goto("/ar/admin/dashboard");

    await expect(page.getByText("لوحة تحكم المدير")).toBeVisible({
      timeout: 15000,
    });
  });

  test("displays all four stat cards", async ({ page }) => {
    await page.goto("/ar/admin/dashboard");

    // Wait for page to load
    await expect(page.getByText("لوحة تحكم المدير")).toBeVisible({
      timeout: 15000,
    });

    // Verify each stat card label is visible
    await expect(page.getByText("طلبات تسجيل معلقة")).toBeVisible();
    await expect(page.getByText("طلاب نشطون")).toBeVisible();
    await expect(page.getByText("مشرفون نشطون")).toBeVisible();
    await expect(page.getByText("حالة التسجيل")).toBeVisible();
  });

  test("sidebar navigation links are visible", async ({ page }) => {
    await page.goto("/ar/admin/dashboard");

    // Wait for page to load
    await expect(page.getByText("لوحة تحكم المدير")).toBeVisible({
      timeout: 15000,
    });

    // Verify the academy name link in the sidebar
    await expect(
      page.locator("a").filter({ hasText: "أكاديمية يُسر" })
    ).toBeVisible();

    // Verify key admin navigation links
    await expect(
      page.locator("a").filter({ hasText: "التسجيل" })
    ).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "المستخدمون" })
    ).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "المجموعات" })
    ).toBeVisible();
  });
});
