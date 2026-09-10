import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";

/**
 * Auth login flow — E2E (HU-1.1, R-5).
 *
 * Covers the reactive /login UI against the real NextAuth route handler:
 * - admin login succeeds and lands on /dashboard;
 * - cashier login succeeds and lands on /dashboard (role destination matrix
 *   is HU-1.2; in HU-1.1 both roles land on the session redirect);
 * - wrong credentials show "Credenciales inválidas" and stay on /login;
 * - invalid fields render per-field errors WITHOUT calling signIn.
 *
 * The cashier fixture is created/removed via a `tsx`-run Prisma script
 * (e2e/fixtures/cashier.ts) so the test is self-contained on a seeded
 * database (admin@pos.com from prisma/seed.ts).
 */
const ADMIN_EMAIL = "admin@pos.com";
const ADMIN_PASSWORD = "admin123";
const CASHIER_EMAIL = "cashier.e2e@pos.com";
const CASHIER_PASSWORD = "cashier123";

function runCashierFixture(command: "create" | "remove") {
  execSync(`npx tsx e2e/fixtures/cashier.ts ${command}`, {
    stdio: "inherit",
  });
}

test.describe.serial("auth login flow", () => {
  test.beforeAll(async () => {
    // Warm up the NextAuth route handler: Turbopack lazy-compiles API routes
    // on first request, and on this slow drive the first hit can exceed the
    // default expect timeout. One Node fetch per endpoint compiles the module
    // so the browser tests below run against a warm server.
    await fetch("http://localhost:3000/api/auth/session");
    await fetch("http://localhost:3000/api/auth/providers");
    runCashierFixture("create");
  });

  test.afterAll(() => {
    runCashierFixture("remove");
  });

  test("logs in an admin and lands on /dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  });

  test("logs in a cashier and lands on /dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(CASHIER_EMAIL);
    await page.getByLabel("Contraseña").fill(CASHIER_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  });

  test("shows 'Credenciales inválidas' and stays on /login for bad credentials", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill("wrong-password");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows field errors without calling signIn for invalid fields", async ({
    page,
  }) => {
    const signInCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/callback/credentials")) {
        signInCalls.push(request.url());
      }
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText("Ingresá un email válido")).toBeVisible();
    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(signInCalls).toHaveLength(0);
  });
});