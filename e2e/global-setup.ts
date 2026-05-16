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
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Seed the test database
  execSync("npx prisma db seed", {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Log in as admin and save storageState
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:3000/ar/login");
  await page.getByLabel(/email/i).fill("admin@yusr.academy");
  await page.getByLabel(/password/i).fill("admin123456");
  await page.getByRole("button", { name: /login|تسجيل الدخول/i }).click();

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  // Save signed-in state
  const authDir = path.resolve(__dirname, ".auth");
  await context.storageState({ path: path.join(authDir, "admin.json") });

  await browser.close();
}
