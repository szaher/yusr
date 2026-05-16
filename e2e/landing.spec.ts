import { test, expect } from "./fixtures";

// Public pages — clear any default admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Landing page", () => {
  test("renders hero title", async ({ page }) => {
    await page.goto("/ar");

    await expect(
      page.getByRole("heading", {
        name: "أكاديمية يُسر لتعليم القرآن الكريم",
      })
    ).toBeVisible();
  });

  test("hero CTA links to register when enrollment is open", async ({
    page,
    db,
  }) => {
    // Seed sets enrollment to "closed" — flip it to "open" for this test
    await db.systemSetting.update({
      where: { key: "enrollment_state" },
      data: { value: "open" },
    });

    await page.goto("/ar");

    const ctaLink = page.getByRole("link", { name: /سجّل الآن/ });
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    await page.waitForURL("**/ar/register", { timeout: 15000 });
    expect(page.url()).toContain("/ar/register");

    // Restore enrollment to "closed" so other tests are not affected
    await db.systemSetting.update({
      where: { key: "enrollment_state" },
      data: { value: "closed" },
    });
  });

  test("features section is visible", async ({ page }) => {
    await page.goto("/ar");

    await expect(
      page.getByRole("heading", { name: "مميزات الأكاديمية" })
    ).toBeVisible();
  });

  test("Quran verse is displayed", async ({ page }) => {
    await page.goto("/ar");

    await expect(
      page.getByText("وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ")
    ).toBeVisible();
  });
});
