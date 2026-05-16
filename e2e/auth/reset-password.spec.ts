import { test, expect } from "../fixtures";

// Auth pages need unauthenticated state — clear the default admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Reset password flow", () => {
  test("forgot password form renders with Arabic labels", async ({ page }) => {
    await page.goto("/ar/forgot-password");

    // Verify the page title
    await expect(page.getByText("استعادة كلمة المرور")).toBeVisible();

    // Verify email label is in Arabic
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();

    // Verify submit button text
    await expect(
      page.getByRole("button", { name: /إعادة تعيين كلمة المرور/ })
    ).toBeVisible();
  });

  test("submit email shows success message", async ({ page }) => {
    await page.goto("/ar/forgot-password");

    await page.locator("#email").fill("admin@yusr.academy");
    await page
      .getByRole("button", { name: /إعادة تعيين كلمة المرور/ })
      .click();

    // Should show the success message (always returns success to prevent email enumeration)
    await expect(
      page.getByText("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني")
    ).toBeVisible({ timeout: 10000 });
  });

  test("invalid reset token shows error message", async ({ page }) => {
    // Navigate to a reset password page with a fake/invalid token
    await page.goto("/ar/reset-password/invalid-token-abc123");

    // The server validates the token and shows the error card
    await expect(
      page.getByText("رابط غير صالح أو منتهي الصلاحية")
    ).toBeVisible({ timeout: 10000 });
  });
});
