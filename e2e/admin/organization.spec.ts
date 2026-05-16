import { test, expect } from "../fixtures";

test.describe.serial("Admin organization management (levels, classes, groups)", () => {
  let modUserId: string;

  test("create level", async ({ page }) => {
    await page.goto("/ar/admin/levels");

    await expect(page.getByText("إضافة مستوى")).toBeVisible({
      timeout: 15000,
    });

    // Fill the create level form
    await page.locator("#nameAr").fill("المستوى الأول");
    await page.locator("#nameEn").fill("Level One");

    // Submit the form
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/admin/levels") && resp.status() === 200
      ),
      page.getByRole("button", { name: "إضافة مستوى" }).click(),
    ]);

    await page.waitForLoadState("networkidle");

    // Verify the level appears in the table
    await expect(page.getByText("المستوى الأول")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Level One")).toBeVisible();
  });

  test("create class under level", async ({ page }) => {
    await page.goto("/ar/admin/classes");

    await expect(page.getByText("إضافة فصل")).toBeVisible({
      timeout: 15000,
    });

    // Fill the create class form
    await page.locator("#name").fill("الفصل أ");
    await page.locator("#levelId").selectOption({ label: "المستوى الأول" });

    // Submit the form
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/admin/classes") && resp.status() === 200
      ),
      page.getByRole("button", { name: "إضافة فصل" }).click(),
    ]);

    await page.waitForLoadState("networkidle");

    // Verify the class appears in the table with its level name
    await expect(page.getByText("الفصل أ")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("tr", { hasText: "الفصل أ" }).getByText("المستوى الأول")
    ).toBeVisible();
  });

  test("create group under class without moderator", async ({ page }) => {
    await page.goto("/ar/admin/groups");

    await expect(page.getByText("إضافة مجموعة")).toBeVisible({
      timeout: 15000,
    });

    // Fill the create group form
    await page.locator("#name").fill("مجموعة 1");
    // Class dropdown options show "class.name — class.level.nameAr"
    await page.locator("#classId").selectOption({ label: /الفصل أ/ });
    // Leave moderator as default "-- بدون مشرف --"

    // Submit the form
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/admin/groups") && resp.status() === 200
      ),
      page.getByRole("button", { name: "إضافة مجموعة" }).click(),
    ]);

    await page.waitForLoadState("networkidle");

    // Verify the group appears in the table
    await expect(page.getByText("مجموعة 1")).toBeVisible({
      timeout: 10000,
    });

    // Moderator column should show "—" (no moderator assigned)
    const groupRow = page.locator("tr", { hasText: "مجموعة 1" });
    await expect(groupRow.getByText("—")).toBeVisible();
  });

  test("create group with moderator", async ({ page, db }) => {
    // Create a moderator user via DB
    const moderatorRole = await db.role.findUniqueOrThrow({
      where: { name: "moderator" },
    });
    const modUser = await db.user.create({
      data: {
        email: `test-mod-${Date.now()}@yusr.academy`,
        passwordHash: "not-needed",
        name: "مشرف اختبار",
        nameAr: "مشرف اختبار",
        roleId: moderatorRole.id,
        accountStatus: "ACTIVE",
        locale: "ar",
        moderatorProfile: { create: {} },
      },
      include: { moderatorProfile: true },
    });
    modUserId = modUser.id;

    // Navigate to the groups page (reload to pick up the new moderator)
    await page.goto("/ar/admin/groups");

    await expect(page.getByText("إضافة مجموعة")).toBeVisible({
      timeout: 15000,
    });

    // Fill the create group form
    await page.locator("#name").fill("مجموعة 2");
    await page.locator("#classId").selectOption({ label: /الفصل أ/ });
    // Select the moderator from dropdown — option shows "moderatorName (moderatorEmail)"
    await page.locator("#moderatorId").selectOption({ label: new RegExp("مشرف اختبار") });

    // Submit the form
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/admin/groups") && resp.status() === 200
      ),
      page.getByRole("button", { name: "إضافة مجموعة" }).click(),
    ]);

    await page.waitForLoadState("networkidle");

    // Verify the group appears in the table with the moderator name
    await expect(page.getByText("مجموعة 2")).toBeVisible({
      timeout: 10000,
    });
    const groupRow = page.locator("tr", { hasText: "مجموعة 2" });
    await expect(groupRow.getByText("مشرف اختبار")).toBeVisible();
  });

  test("cleanup test data", async ({ db }) => {
    // Delete in reverse dependency order: groups -> classes -> levels
    await db.group.deleteMany({
      where: { name: { in: ["مجموعة 1", "مجموعة 2"] } },
    });
    await db.class.deleteMany({ where: { name: "الفصل أ" } });
    await db.level.deleteMany({ where: { nameAr: "المستوى الأول" } });

    // Clean up the moderator user
    if (modUserId) {
      await db.moderatorProfile
        .deleteMany({ where: { userId: modUserId } })
        .catch(() => {});
      await db.user
        .delete({ where: { id: modUserId } })
        .catch(() => {});
    }
  });
});
