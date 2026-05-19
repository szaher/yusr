import { chromium, type FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";

const TEST_DATABASE_URL =
  "postgresql://yusr:yusr@localhost:5432/yusr_test";

export default async function globalSetup(_config: FullConfig) {
  // Point Prisma commands at the test database
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const rootDir = path.resolve(__dirname, "..");

  // Reset and sync the test database schema
  execSync("npx prisma db push --force-reset", {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
  });

  // Seed the test database
  execSync("npx prisma db seed", {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
  });

  // Log in as admin and save storageState
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:3000/ar/login", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  // Wait for React hydration — the button becomes interactive after hydration
  const loginButton = page.getByRole("button", { name: /تسجيل الدخول/ });
  await loginButton.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.locator("#email").fill("admin@yusr.academy");
  await page.locator("#password").fill("admin123456");
  await loginButton.click();

  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30000,
    });
  } catch {
    await page.screenshot({ path: "e2e/.auth/debug-login.png" });
    const content = await page.content();
    console.error("Login failed. Current URL:", page.url());
    console.error("Page text:", await page.locator("body").textContent());
    throw new Error("Global setup: admin login failed — see e2e/.auth/debug-login.png");
  }

  // Save signed-in state
  const authDir = path.resolve(__dirname, ".auth");
  await context.storageState({ path: path.join(authDir, "admin.json") });

  await browser.close();
}
