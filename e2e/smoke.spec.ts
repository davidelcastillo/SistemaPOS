import { expect, test } from "@playwright/test";

/**
 * Smoke redirect spec — FASE 0 + HU-1.1.
 *
 * Scenario A (unauthenticated → /login) is ACTIVE: page.tsx must redirect
 * root by session state (`getServerSession(authOptions)`).
 *
 * Scenario B (admin → /dashboard) is ACTIVE since HU-1.1: it seeds a session
 * through the real /login flow, then asserts the root redirect keeps the
 * authenticated visitor on /dashboard.
 */
test.describe("root redirect", () => {
  test.beforeAll(async () => {
    // Warm up the NextAuth route handler (Turbopack lazy-compiles API routes;
    // on this slow drive the first hit can exceed the default expect timeout).
    await fetch("http://localhost:3000/api/auth/session");
    await fetch("http://localhost:3000/api/auth/providers");
  });

  test("redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("redirects authenticated admins to /dashboard", async ({ page }) => {
    // Seed a session via the login flow (admin@pos.com from prisma/seed.ts).
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@pos.com");
    await page.getByLabel("Contraseña").fill("admin123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});