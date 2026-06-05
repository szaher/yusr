import { test, expect } from "../fixtures";
import { hashPassword } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Student leave requests", () => {
  test("student can view leave requests page", async ({ page, db }) => {
    const roleId = await db.findRole("student");
    const password = "TestPass123!";
    const email = `test-student-leave-${Date.now()}@yusr.academy`;

    const userId = await db.createUser({
      email,
      passwordHash: await hashPassword(password),
      name: "طالب إجازات",
      nameAr: "طالب إجازات",
      roleId,
      accountStatus: "ACTIVE",
      locale: "ar",
    });

    await db.createEnrollmentApplication({
      userId,
      registrationStatus: "APPROVED",
    });
    await db.createStudentProfile(userId);

    try {
      await page.goto("/ar/login");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /تسجيل الدخول/ }).click();
      await page.waitForURL("**/student/dashboard", { timeout: 15000 });

      await page.goto("/ar/student/leave-requests");
      await page.waitForLoadState("networkidle");

      const heading = page.locator("h1");
      const emptyState = page.getByText(/لا توجد|لا يوجد|فارغ/);
      const pageContent = page.locator("main");

      await expect(
        heading.or(emptyState).or(pageContent)
      ).toBeVisible();
    } finally {
      await db.deleteUser(userId);
    }
  });
});
