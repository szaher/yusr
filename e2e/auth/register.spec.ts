import { test, expect } from "../fixtures";

// Auth pages need unauthenticated state — clear the default admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Registration flow", () => {
  test("successful registration shows pending review message", async ({
    page,
    db,
  }) => {
    const uniqueEmail = `test-register-${Date.now()}@yusr.academy`;

    // Ensure enrollment is open
    await db.upsertSystemSetting("enrollment_state", "open");

    await page.goto("/ar/register");

    await page.locator("#name").fill("طالب اختبار");
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill("TestPass123!");
    await page.locator("#confirmPassword").fill("TestPass123!");
    await page.locator("#phone").fill("+966500000000");
    await page.locator("#country").fill("السعودية");
    await page.locator("#currentQuranLevel").fill("مبتدئ");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /التسجيل/ }).click();

    // Should show the pending review success message
    await expect(page.getByText("طلبك قيد المراجعة")).toBeVisible({
      timeout: 15000,
    });

    // Cleanup: delete the test user
    await db.deleteByQuery("User", "email = $1", [uniqueEmail]);
  });

  test("password too short shows validation error", async ({ page, db }) => {
    // Ensure enrollment is open
    await db.upsertSystemSetting("enrollment_state", "open");

    await page.goto("/ar/register");

    await page.locator("#name").fill("طالب اختبار");
    await page.locator("#email").fill("short-pw@yusr.academy");
    await page.locator("#password").fill("123"); // too short
    await page.locator("#confirmPassword").fill("123");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /التسجيل/ }).click();

    const errorMessage = page.locator("p.text-destructive");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toHaveText(
      "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    );
  });

  test("passwords mismatch shows validation error", async ({ page, db }) => {
    // Ensure enrollment is open
    await db.upsertSystemSetting("enrollment_state", "open");

    await page.goto("/ar/register");

    await page.locator("#name").fill("طالب اختبار");
    await page.locator("#email").fill("mismatch@yusr.academy");
    await page.locator("#password").fill("TestPass123!");
    await page.locator("#confirmPassword").fill("DifferentPass!");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /التسجيل/ }).click();

    const errorMessage = page.locator("p.text-destructive");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toHaveText("كلمتا المرور غير متطابقتين");
  });

  test("duplicate email shows error", async ({ page, db }) => {
    // Ensure enrollment is open
    await db.upsertSystemSetting("enrollment_state", "open");

    await page.goto("/ar/register");

    // Use the admin email which already exists in the seeded database
    await page.locator("#name").fill("طالب مكرر");
    await page.locator("#email").fill("admin@yusr.academy");
    await page.locator("#password").fill("TestPass123!");
    await page.locator("#confirmPassword").fill("TestPass123!");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: /التسجيل/ }).click();

    const errorMessage = page.locator("p.text-destructive");
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("registration when enrollment closed redirects to enrollment-closed page", async ({
    page,
    db,
  }) => {
    // Set enrollment to closed
    await db.upsertSystemSetting("enrollment_state", "closed");

    await page.goto("/ar/register");

    // The register page checks enrollment state server-side and redirects
    await page.waitForURL("**/ar/enrollment-closed", { timeout: 15000 });

    // Verify the enrollment closed message is displayed
    await expect(page.getByText("التسجيل مغلق حالياً")).toBeVisible();

    // Restore enrollment to open for subsequent tests
    await db.upsertSystemSetting("enrollment_state", "open");
  });
});
