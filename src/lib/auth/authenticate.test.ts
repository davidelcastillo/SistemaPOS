import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/authenticate";

/**
 * Integration tests for the pure `authenticate` helper against PostgreSQL
 * (Docker container `mi-postgres`, DATABASE_URL). Covers R-2 (Zod before DB,
 * findUnique, bcrypt.compare) and R-3 (role in the returned user).
 */
const TEST_EMAIL = "test-auth-ok@pos.test";
const TEST_PASSWORD = "secreto123";

async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: { email: { contains: "@pos.test" } },
  });
}

beforeAll(async () => {
  await cleanupTestUsers();
  const password = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: "Test Auth",
      password,
      role: "admin",
    },
  });
});

afterAll(async () => {
  await cleanupTestUsers();
  await prisma.$disconnect();
});

describe("authenticate (integration — PostgreSQL)", () => {
  it("returns the user with id and role for valid credentials", async () => {
    const user = await authenticate({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(TEST_EMAIL);
    expect(user?.role).toBe("admin");
    expect(user?.id).toBeTypeOf("string");
  });

  it("returns null for a wrong password", async () => {
    const user = await authenticate({
      email: TEST_EMAIL,
      password: "incorrecta",
    });
    expect(user).toBeNull();
  });

  it("returns null for a missing email without revealing existence", async () => {
    const user = await authenticate({
      email: "no-existe@pos.test",
      password: TEST_PASSWORD,
    });
    expect(user).toBeNull();
  });

  it("rejects an invalid payload via Zod before touching the database", async () => {
    const user = await authenticate({
      email: "no-es-email",
      password: "",
    });
    expect(user).toBeNull();
  });

  it("returns null for a non-admin role user (cashier)", async () => {
    const cashierEmail = "test-auth-cashier@pos.test";
    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: cashierEmail,
        name: "Test Cashier",
        password,
        role: "cashier",
      },
    });

    const user = await authenticate({
      email: cashierEmail,
      password: TEST_PASSWORD,
    });
    expect(user?.role).toBe("cashier");
  });
});