import { test as base, type Page } from "@playwright/test";
import pg from "pg";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

function cuid(): string {
  return "c" + randomBytes(12).toString("hex");
}

const TEST_DATABASE_URL =
  "postgresql://yusr:yusr@localhost:5432/yusr_test";

type Role = "admin" | "moderator" | "student" | "support";

export type TestFixtures = {
  db: TestDb;
  loginAs: (page: Page, role: Role) => Promise<Page>;
};

export class TestDb {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
  }

  async query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async findRole(name: string): Promise<string> {
    const res = await this.query<{ id: string }>(
      `SELECT id FROM "Role" WHERE name = $1`,
      [name]
    );
    if (res.rows.length === 0) throw new Error(`Role "${name}" not found`);
    return res.rows[0].id;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
    nameAr?: string;
    roleId: string;
    accountStatus?: string | null;
    locale?: string;
  }): Promise<string> {
    const id = cuid();
    const res = await this.query<{ id: string }>(
      `INSERT INTO "User" (id, email, "passwordHash", name, "nameAr", "roleId", "accountStatus", locale, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
      [
        id,
        data.email,
        data.passwordHash,
        data.name,
        data.nameAr ?? data.name,
        data.roleId,
        data.accountStatus ?? null,
        data.locale ?? "ar",
      ]
    );
    return res.rows[0].id;
  }

  async deleteUser(id: string): Promise<void> {
    await this.query(`DELETE FROM "StudentProfile" WHERE "userId" = $1`, [id]).catch(() => {});
    await this.query(`DELETE FROM "ModeratorProfile" WHERE "userId" = $1`, [id]).catch(() => {});
    await this.query(`DELETE FROM "EnrollmentApplication" WHERE "userId" = $1`, [id]).catch(() => {});
    await this.query(`DELETE FROM "User" WHERE id = $1`, [id]).catch(() => {});
  }

  async createEnrollmentApplication(data: {
    userId: string;
    registrationStatus: string;
  }): Promise<string> {
    const id = cuid();
    const res = await this.query<{ id: string }>(
      `INSERT INTO "EnrollmentApplication" (id, "userId", "registrationStatus", "submittedAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [id, data.userId, data.registrationStatus]
    );
    return res.rows[0].id;
  }

  async createStudentProfile(userId: string): Promise<string> {
    const id = cuid();
    const res = await this.query<{ id: string }>(
      `INSERT INTO "StudentProfile" (id, "userId", "updatedAt") VALUES ($1, $2, NOW()) RETURNING id`,
      [id, userId]
    );
    return res.rows[0].id;
  }

  async createModeratorProfile(userId: string): Promise<string> {
    const id = cuid();
    const res = await this.query<{ id: string }>(
      `INSERT INTO "ModeratorProfile" (id, "userId", "updatedAt") VALUES ($1, $2, NOW()) RETURNING id`,
      [id, userId]
    );
    return res.rows[0].id;
  }

  async upsertSystemSetting(key: string, value: string): Promise<void> {
    await this.query(
      `INSERT INTO "SystemSetting" (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  }

  async deleteByQuery(table: string, where: string, params: any[]): Promise<void> {
    await this.query(`DELETE FROM "${table}" WHERE ${where}`, params).catch(() => {});
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export const test = base.extend<TestFixtures>({
  db: async ({}, use) => {
    const db = new TestDb();
    await use(db);
    await db.end();
  },

  loginAs: async ({ db }, use) => {
    const createdUserIds: string[] = [];

    const loginAs = async (page: Page, role: Role): Promise<Page> => {
      const roleId = await db.findRole(role);

      const timestamp = Date.now();
      const email = `test-${role}-${timestamp}@yusr.academy`;
      const password = `TestPass_${timestamp}`;

      const userId = await db.createUser({
        email,
        passwordHash: await hashPassword(password),
        name: `Test ${role}`,
        nameAr: `اختبار ${role}`,
        roleId,
        accountStatus: "ACTIVE",
      });
      createdUserIds.push(userId);

      await page.goto("/ar/login");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 15000,
      });

      return page;
    };

    await use(loginAs);

    for (const id of createdUserIds) {
      await db.deleteUser(id);
    }
  },
});

export { expect } from "@playwright/test";
