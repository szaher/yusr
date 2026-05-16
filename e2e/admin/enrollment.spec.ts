import { test, expect } from "../fixtures";
import type { PrismaClient } from "../../prisma/generated/prisma/client";

/**
 * Helper: create a pending enrollment application in the DB.
 * Returns the created user (with enrollmentApplication included).
 */
async function createPendingEnrollment(db: PrismaClient) {
  const studentRole = await db.role.findUniqueOrThrow({
    where: { name: "student" },
  });

  const user = await db.user.create({
    data: {
      email: `test-enroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@yusr.academy`,
      passwordHash: "not-needed-for-this-test",
      name: "طالب اختبار التسجيل",
      nameAr: "طالب اختبار",
      roleId: studentRole.id,
      accountStatus: null,
      locale: "ar",
      enrollmentApplication: {
        create: {
          registrationStatus: "PENDING_REVIEW",
          submittedAt: new Date(),
        },
      },
    },
    include: { enrollmentApplication: true },
  });

  return user;
}

/**
 * Helper: clean up test user and their enrollment application.
 */
async function cleanupEnrollment(db: PrismaClient, userId: string) {
  await db.enrollmentApplication
    .deleteMany({ where: { userId } })
    .catch(() => {});
  await db.studentProfile
    .deleteMany({ where: { userId } })
    .catch(() => {});
  await db.user.delete({ where: { id: userId } }).catch(() => {});
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

      // Click approve
      await approveButton.click();

      // After approval, the page revalidates. The approve/reject buttons
      // should no longer be visible for this student (status is now APPROVED).
      await expect(
        row.getByRole("button", { name: "قبول" })
      ).not.toBeVisible({ timeout: 10000 });

      // Verify in the database that the application was approved
      const updatedApp = await db.enrollmentApplication.findFirst({
        where: { userId: user.id },
      });
      expect(updatedApp?.registrationStatus).toBe("APPROVED");

      // Verify the user account was activated
      const updatedUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.accountStatus).toBe("ACTIVE");
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

      // Click reject
      await rejectButton.click();

      // After rejection, the approve/reject buttons should no longer be visible
      await expect(
        row.getByRole("button", { name: "رفض" })
      ).not.toBeVisible({ timeout: 10000 });

      // Verify in the database that the application was rejected
      const updatedApp = await db.enrollmentApplication.findFirst({
        where: { userId: user.id },
      });
      expect(updatedApp?.registrationStatus).toBe("REJECTED");
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
