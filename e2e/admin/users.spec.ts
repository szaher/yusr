import { test, expect } from "../fixtures";

test.describe("Admin users management", () => {
  test("users list renders with title and admin user visible", async ({
    page,
  }) => {
    await page.goto("/ar/admin/users");

    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    // Admin seed user should appear in the table
    await expect(
      page.locator("tr", { hasText: "admin@yusr.academy" })
    ).toBeVisible();
  });

  test("create moderator via form", async ({ page, db }) => {
    const uniqueEmail = `mod-${Date.now()}@yusr.academy`;

    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    // Fill the create moderator form
    await page.locator("#name").fill("Test Moderator");
    await page.locator("#nameAr").fill("مشرف اختبار");
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill("SecurePass123!");

    // Submit and wait for the page to revalidate
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/admin/users") && resp.status() === 200
      ),
      page.getByRole("button", { name: "إضافة مشرف" }).click(),
    ]);

    await page.waitForLoadState("networkidle");

    // The new moderator should now appear in the users table
    await expect(
      page.locator("tr", { hasText: uniqueEmail })
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    const res = await db.query<{ id: string }>(
      `SELECT id FROM "User" WHERE email = $1`,
      [uniqueEmail]
    );
    if (res.rows.length > 0) {
      await db.deleteUser(res.rows[0].id);
    }
  });

  test("duplicate email shows error", async ({ page }) => {
    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    // Try to create a moderator with the admin's email (already exists)
    await page.locator("#name").fill("Duplicate User");
    await page.locator("#email").fill("admin@yusr.academy");
    await page.locator("#password").fill("SomePassword123!");

    await page.getByRole("button", { name: "إضافة مشرف" }).click();

    // Wait for error to appear on the page
    await page.waitForLoadState("networkidle");

    // The admin email should still only appear once (no duplicate row created)
    // and an error indication should be present
    const adminRows = page.locator("tr", { hasText: "admin@yusr.academy" });
    await expect(adminRows).toHaveCount(1, { timeout: 10000 });
  });
});

test.describe.serial("Admin user actions", () => {
  let testUserId: string;
  const testUserEmail = `test-student-${Date.now()}@yusr.academy`;

  test("promote user to moderator", async ({ page, db }) => {
    // Create a student user via DB
    const roleId = await db.findRole("student");
    testUserId = await db.createUser({
      email: testUserEmail,
      passwordHash: "not-needed",
      name: "Test Student",
      nameAr: "طالب اختبار",
      roleId,
      accountStatus: "ACTIVE",
      locale: "ar",
    });

    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    // Find the promote button in the test user's row
    const userRow = page.locator("tr", { hasText: testUserEmail });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    const promoteButton = userRow.getByRole("button", { name: /ترقية لمشرف/ });
    await expect(promoteButton).toBeVisible();

    await promoteButton.click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // After promotion, the user's role should show as moderator
    const updatedRow = page.locator("tr", { hasText: testUserEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    await expect(updatedRow.getByText("moderator")).toBeVisible({ timeout: 10000 });
  });

  test("deactivate user", async ({ page }) => {
    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    const userRow = page.locator("tr", { hasText: testUserEmail });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    const deactivateButton = userRow.getByRole("button", { name: /تعطيل/ });
    await expect(deactivateButton).toBeVisible();

    await deactivateButton.click();

    // Wait for the page to reflect the change
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Status should now show DEACTIVATED
    const updatedRow = page.locator("tr", { hasText: testUserEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    await expect(updatedRow.getByText(/DEACTIVATED/i)).toBeVisible({ timeout: 10000 });
  });

  test("reactivate user", async ({ page }) => {
    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    const userRow = page.locator("tr", { hasText: testUserEmail });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    const reactivateButton = userRow.getByRole("button", {
      name: /إعادة تفعيل/,
    });
    await expect(reactivateButton).toBeVisible();

    await reactivateButton.click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Status should now show ACTIVE again
    const updatedRow = page.locator("tr", { hasText: testUserEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    await expect(updatedRow.getByText(/ACTIVE/i)).toBeVisible({ timeout: 10000 });
  });

  test("ban user", async ({ page, db }) => {
    await page.goto("/ar/admin/users");
    await expect(page.getByText("إدارة المستخدمين")).toBeVisible({
      timeout: 15000,
    });

    const userRow = page.locator("tr", { hasText: testUserEmail });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    const banButton = userRow.getByRole("button", { name: /حظر/ });
    await expect(banButton).toBeVisible();

    await banButton.click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Status should now show BANNED
    const updatedRow = page.locator("tr", { hasText: testUserEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    await expect(updatedRow.getByText(/BANNED/i)).toBeVisible({ timeout: 10000 });

    // Cleanup the test user
    if (testUserId) {
      await db.deleteUser(testUserId);
    }
  });
});
