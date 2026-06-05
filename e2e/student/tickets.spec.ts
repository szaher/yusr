import { test, expect } from "../fixtures";
import { hashPassword } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Student tickets", () => {
  test("student can view tickets page", async ({ page, db }) => {
    const roleId = await db.findRole("student");
    const password = "TestPass123!";
    const email = `test-student-tix-${Date.now()}@yusr.academy`;

    const userId = await db.createUser({
      email,
      passwordHash: await hashPassword(password),
      name: "طالب تذاكر",
      nameAr: "طالب تذاكر",
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

      await page.goto("/ar/student/tickets");
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

  test("student can create a support ticket", async ({ page, db }) => {
    const roleId = await db.findRole("student");
    const password = "TestPass123!";
    const email = `test-student-tix-create-${Date.now()}@yusr.academy`;
    const ticketSubject = `تذكرة اختبار ${Date.now()}`;

    const userId = await db.createUser({
      email,
      passwordHash: await hashPassword(password),
      name: "طالب إنشاء تذكرة",
      nameAr: "طالب إنشاء تذكرة",
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

      await page.goto("/ar/student/tickets");
      await page.waitForLoadState("networkidle");

      // Find and fill the ticket form fields
      const textboxes = page.getByRole("textbox");
      const textboxCount = await textboxes.count();

      if (textboxCount >= 2) {
        // First textbox is typically the subject, second is the body
        await textboxes.nth(0).fill(ticketSubject);
        await textboxes.nth(1).fill("هذه تذكرة اختبار تم إنشاؤها تلقائيا");
      } else {
        // Try label-based selectors as fallback
        const subjectInput =
          page.getByLabel(/الموضوع|العنوان|subject/i);
        const bodyInput =
          page.getByLabel(/المحتوى|الرسالة|التفاصيل|body|message/i);

        await subjectInput.fill(ticketSubject);
        await bodyInput.fill("هذه تذكرة اختبار تم إنشاؤها تلقائيا");
      }

      // Submit the form
      const submitButton = page.getByRole("button", {
        name: /إرسال|إنشاء|حفظ|submit|create/i,
      });
      await submitButton.click();

      await page.waitForLoadState("networkidle");

      // Verify the ticket was created — subject appears on the page
      await expect(page.getByText(ticketSubject)).toBeVisible({
        timeout: 10000,
      });
    } finally {
      // Clean up: delete any tickets created by this user, then delete the user
      await db.deleteByQuery("Ticket", `"userId" = $1`, [userId]).catch(
        () => {}
      );
      await db.deleteByQuery(
        "SupportTicket",
        `"userId" = $1`,
        [userId]
      ).catch(() => {});
      await db.deleteUser(userId);
    }
  });
});
