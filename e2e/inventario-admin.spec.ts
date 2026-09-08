import { expect, test } from "@playwright/test";

/**
 * Inventario admin E2E (HU-2.x / SD-R3 end-to-end).
 *
 * Scenario A (unauthenticated gates) is ACTIVE: both inventory pages must
 * redirect to /login when no session exists.
 *
 * Scenario B (full admin flow) is SKIPPED until HU-1.1 lands a real login: it
 * seeds an admin (bcrypt fixture), logs in, creates a product, soft-deletes
 * it, verifies it under /inactivos and reactivates it. The component tests
 * (inactive-table / soft-delete-controls / product-form) already close the
 * SD-R3 render + SD-R4 reactivation paths in jsdom.
 */
test.describe("inventario routes", () => {
  test("redirects unauthenticated visitors from /inventario to /login", async ({ page }) => {
    await page.goto("/inventario");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("redirects unauthenticated visitors from /inactivos to /login", async ({ page }) => {
    await page.goto("/inactivos");
    await expect(page).toHaveURL(/\/login$/);
  });

  // TODO Auth (HU-1.1): enable once the login flow can seed a real session.
  // Steps once enabled:
  //   1. Seed an admin user via a Prisma fixture (bcrypt, salt rounds 10).
  //   2. login(email, password) through the real UI (/login).
  //   3. /inventario → Nueva categoría → Nueva producto (2×2 matrix) → row visible.
  //   4. Desactivar producto (SweetAlert2 confirm) → gone from the active list.
  //   5. Ver Desactivados → /inactivos shows the product → Reactivar → back active.
  test.skip("admin creates, soft-deletes and reactivates a product (SD-R3 end-to-end)", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/inventario$/);

    await page.getByRole("button", { name: /nuevo producto/i }).click();
    await expect(page.getByRole("dialog", { name: /nuevo producto/i })).toBeVisible();
  });
});