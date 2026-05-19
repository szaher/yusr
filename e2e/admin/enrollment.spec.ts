import { test, expect } from "../fixtures";
import type { TestDb } from "../fixtures";

async function createPendingEnrollment(db: TestDb) {
  const roleId = await db.findRole("student");

  const email = `test-enroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@yusr.academy`;

  const userId = await db.createUser({
    email,
    passwordHash: "not-needed-for-this-test",
    name: "طالب اختبار التسجيل",
    nameAr: "طالب اختبار",
    roleId,
    accountStatus: null,
    locale: "ar",
  });

  const appId = await db.createEnrollmentApplication({
    userId,
    registrationStatus: "PENDING_REVIEW",
  });

  return { id: userId, email, applicationId: appId };
}

async function cleanupEnrollment(db: TestDb, userId: string) {
  await db.deleteUser(userId);
}

test.describe("Admin Enrollment Management", () => {
  test("enrollment page loads with correct title", async ({ page }) => {
    await page.goto("/ar/admin/enrollment");

    await expect(
      page.getByRole("heading", { name: "إدارة التسجيل" })
    ).toBeVisible();
  });

  test("pending student appears in the enrollment table", async ({
    page,
    db,
  }) => {
    const user = await createPendingEnrollment(db);

    try {
      await page.goto("/ar/admin/enrollment");

      // The student name should appear in the table
      await expect(page.getByText("طالب اختبار التسجيل")).toBeVisible();
    } finally {
      await cleanupEnrollment(db, user.id);
    }
  });

  test("approve button changes enrollment status", async ({ page, db }) => {
    const user = await createPendingEnrollment(db);

    try {
      await page.goto("/ar/admin/enrollment");

      // Locate the table row containing our test student
      const row = page.getByRole("row").filter({
        hasText: "طالب اختبار التسجيل",
      });
      await expect(row).toBeVisible();

      // The row should have an approve button
      const approveButton = row.getByRole("button", { name: "قبول" });
      await expect(approveButton).toBeVisible();

      // Click approve and wait for a server action response
      await approveButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Verify in the database that the application was approved
      const appRes = await db.query<{ registrationStatus: string }>(
        `SELECT "registrationStatus" FROM "EnrollmentApplication" WHERE "userId" = $1`,
        [user.id]
      );
      expect(appRes.rows[0]?.registrationStatus).toBe("APPROVED");

      // Verify the user account was activated
      const userRes = await db.query<{ accountStatus: string }>(
        `SELECT "accountStatus" FROM "User" WHERE id = $1`,
        [user.id]
      );
      expect(userRes.rows[0]?.accountStatus).toBe("ACTIVE");
    } finally {
      await cleanupEnrollment(db, user.id);
    }
  });

  test("reject button changes enrollment status", async ({ page, db }) => {
    const user = await createPendingEnrollment(db);

    try {
      await page.goto("/ar/admin/enrollment");

      // Locate the table row containing our test student
      const row = page.getByRole("row").filter({
        hasText: "طالب اختبار التسجيل",
      });
      await expect(row).toBeVisible();

      // The row should have a reject button
      const rejectButton = row.getByRole("button", { name: "رفض" });
      await expect(rejectButton).toBeVisible();

      // Click reject and wait for the server action
      await rejectButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Verify in the database that the application was rejected
      const appRes = await db.query<{ registrationStatus: string }>(
        `SELECT "registrationStatus" FROM "EnrollmentApplication" WHERE "userId" = $1`,
        [user.id]
      );
      expect(appRes.rows[0]?.registrationStatus).toBe("REJECTED");
    } finally {
      await cleanupEnrollment(db, user.id);
    }
  });

  test("approve and reject buttons have type=submit (regression)", async ({
    page,
    db,
  }) => {
    const user = await createPendingEnrollment(db);

    try {
      await page.goto("/ar/admin/enrollment");

      const row = page.getByRole("row").filter({
        hasText: "طالب اختبار التسجيل",
      });
      await expect(row).toBeVisible();

      // Verify the approve button has type="submit"
      const approveButton = row.getByRole("button", { name: "قبول" });
      await expect(approveButton).toHaveAttribute("type", "submit");

      // Verify the reject button has type="submit"
      const rejectButton = row.getByRole("button", { name: "رفض" });
      await expect(rejectButton).toHaveAttribute("type", "submit");
    } finally {
      await cleanupEnrollment(db, user.id);
    }
  });
});
