import { test, expect } from "../fixtures";
import { hashPassword } from "../../server/auth/password";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Student dashboard", () => {
  test("approved student sees dashboard", async ({ page, db }) => {
    const studentRole = await db.role.findUniqueOrThrow({
      where: { name: "student" },
    });
    const password = "TestPass123!";
    const email = `test-student-dash-${Date.now()}@yusr.academy`;

    const student = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name: "طالب اختبار",
        nameAr: "طالب اختبار",
        roleId: studentRole.id,
        accountStatus: "ACTIVE",
        locale: "ar",
        enrollmentApplication: {
          create: {
            registrationStatus: "APPROVED",
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        },
        studentProfile: { create: {} },
      },
    });

    try {
      await page.goto("/ar/login");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /تسجيل الدخول/ }).click();
      await page.waitForURL("**/student/dashboard", { timeout: 15000 });

      await expect(page.locator("h1")).toBeVisible();
    } finally {
      await db.studentProfile.deleteMany({ where: { userId: student.id } });
      await db.enrollmentApplication.deleteMany({
        where: { userId: student.id },
      });
      await db.user.delete({ where: { id: student.id } });
    }
  });

  test("student sidebar shows only student nav items", async ({
    page,
    db,
  }) => {
    const studentRole = await db.role.findUniqueOrThrow({
      where: { name: "student" },
    });
    const password = "TestPass123!";
    const email = `test-student-nav-${Date.now()}@yusr.academy`;

    const student = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name: "طالب قائمة",
        nameAr: "طالب قائمة",
        roleId: studentRole.id,
        accountStatus: "ACTIVE",
        locale: "ar",
        enrollmentApplication: {
          create: {
            registrationStatus: "APPROVED",
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        },
        studentProfile: { create: {} },
      },
    });

    try {
      await page.goto("/ar/login");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /تسجيل الدخول/ }).click();
      await page.waitForURL("**/student/dashboard", { timeout: 15000 });

      const sidebar = page.locator("aside");
      await expect(sidebar.getByText("لوحة التحكم")).toBeVisible();
      await expect(sidebar.getByText("الملف الشخصي")).toBeVisible();

      await expect(sidebar.getByText("التسجيل")).not.toBeVisible();
      await expect(sidebar.getByText("المستخدمون")).not.toBeVisible();
      await expect(sidebar.getByText("إعدادات الميزات")).not.toBeVisible();
    } finally {
      await db.studentProfile.deleteMany({ where: { userId: student.id } });
      await db.enrollmentApplication.deleteMany({
        where: { userId: student.id },
      });
      await db.user.delete({ where: { id: student.id } });
    }
  });
});
