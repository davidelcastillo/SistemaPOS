import { expect, test } from "@playwright/test";

/**
 * Smoke redirect spec — FASE 0.
 *
 * Scenario A (unauthenticated → /login) is ACTIVE: page.tsx must redirect
 * root by session state (`getServerSession(authOptions)`).
 *
 * Scenario B (admin → /dashboard) is SKIPPED until HU-1.1 provides a real
 * authentication flow to seed a session.
 */
test.describe("root redirect", () => {
  test("redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  // TODO Auth (HU-1.1): enable once a session can be seeded via the login flow.
  test.skip("redirects authenticated admins to /dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});