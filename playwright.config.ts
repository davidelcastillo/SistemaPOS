import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for the POS project.
 *
 * - webServer boots `next dev` (port 3000) unless a server is already running.
 * - Smoke redirect spec lives in `./e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // First Turbopack compile on this machine is slow (network drive);
    // allow up to 5 minutes for the dev server to become ready.
    timeout: 300_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});