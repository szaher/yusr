import { test, expect } from "../fixtures";

// Auth pages need unauthenticated state — clear the default admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login flow", () => {
  test("valid admin login redirects to admin dashboard", async ({ page }) => {
    await page.goto("/ar/login");

    await page.locator("#email").fill("admin@yusr.academy");
    await page.locator("#password").fill("admin123456");
    await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    expect(page.url()).toContain("/ar/");
  });

  test("invalid credentials shows Arabic error message", async ({ page }) => {
    await page.goto("/ar/login");

    await page.locator("#email").fill("wrong@yusr.academy");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

    const errorMessage = page.locator("p.text-destructive");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toHaveText(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    );
  });

  test("login page renders with Arabic labels and RTL direction", async ({
    page,
  }) => {
    await page.goto("/ar/login");

    // Verify the page title
    await expect(
      page.getByText("تسجيل الدخول إلى حسابك")
    ).toBeVisible();

    // Verify form labels are in Arabic
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();

    // Verify submit button is in Arabic
    await expect(
      page.getByRole("button", { name: /تسجيل الدخول/ })
    ).toBeVisible();

    // Verify RTL direction on the document
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });
});
