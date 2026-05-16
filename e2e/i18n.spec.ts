import { test, expect } from "./fixtures";

// Public pages — clear any default admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("i18n and RTL/LTR", () => {
  test("Arabic page has dir=rtl and lang=ar", async ({ page }) => {
    await page.goto("/ar");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("English page has dir=ltr and lang=en", async ({ page }) => {
    await page.goto("/en");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", "en");
  });

  test("Arabic content renders on Arabic route", async ({ page }) => {
    await page.goto("/ar");

    await expect(
      page.getByRole("heading", {
        name: "أكاديمية يُسر لتعليم القرآن الكريم",
      })
    ).toBeVisible();
  });
});
