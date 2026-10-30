import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "node scripts/e2e-mock-ckan.mjs",
      url: "http://127.0.0.1:8010/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        CKAN_API_INTERNAL_URL: "http://127.0.0.1:8010/api/3/action",
        CKAN_API_TIMEOUT_MS: "4000",
        PUBLIC_SITE_ORIGIN: "http://127.0.0.1:3100",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
        NEXT_PUBLIC_CKAN_ADMIN_URL: "https://ckan.example.test",
        NEXT_PUBLIC_REGION_NAME: "Kabupaten Wajo",
        NEXT_PUBLIC_BRAND_PROFILE: "wajo",
      },
    },
  ],
});
