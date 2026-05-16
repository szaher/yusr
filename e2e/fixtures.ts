import { test as base, type Page } from "@playwright/test";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../server/auth/password";

const TEST_DATABASE_URL =
  "postgresql://yusr:yusr@localhost:5432/yusr_test";

type Role = "admin" | "moderator" | "student" | "support";

export type TestFixtures = {
  db: PrismaClient;
  loginAs: (page: Page, role: Role) => Promise<Page>;
};

export const test = base.extend<TestFixtures>({
  db: async ({}, use) => {
    const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    await use(prisma);
    await prisma.$disconnect();
  },

  loginAs: async ({ db }, use) => {
    const createdUserIds: string[] = [];

    const loginAs = async (page: Page, role: Role): Promise<Page> => {
      // Find the role record
      const roleRecord = await db.role.findUniqueOrThrow({
        where: { name: role },
      });

      // Create a unique test user for this role
      const timestamp = Date.now();
      const email = `test-${role}-${timestamp}@yusr.academy`;
      const password = `TestPass_${timestamp}`;

      const user = await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          name: `Test ${role}`,
          nameAr: `اختبار ${role}`,
          roleId: roleRecord.id,
          accountStatus: "ACTIVE",
          locale: "ar",
        },
      });
      createdUserIds.push(user.id);

      // Log in via the UI
      await page.goto("/ar/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /login|تسجيل الدخول/i }).click();

      // Wait for navigation away from login page
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 15000,
      });

      return page;
    };

    await use(loginAs);

    // Cleanup: remove test users created during the test
    for (const id of createdUserIds) {
      await db.user.delete({ where: { id } }).catch(() => {
        // Ignore deletion errors (user may have been deleted by test)
      });
    }
  },
});

export { expect } from "@playwright/test";
