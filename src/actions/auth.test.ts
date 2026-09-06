import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { registerUser } from "@/actions/auth";

/**
 * Integration tests for the `registerUser` server action against PostgreSQL
 * (Docker container `mi-postgres`). `getServerSession` is mocked per scenario
 * (R-4: admin-only, FORBIDDEN for cashier, UNAUTHORIZED without session).
 */

let mockSession: { user: { id: string; role: "admin" | "cashier" } } | null = null;

vi.mock("next-auth", () => ({
  getServerSession: () => mockSession,
}));

const TEST_ADMIN_EMAIL = "test-reg-admin@reg.test";
const TEST_NEW_EMAIL = "test-reg-new@reg.test";
const TEST_PASSWORD = "secreto123";

async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: { email: { contains: "@reg.test" } },
  });
}

beforeAll(async () => {
  await cleanupTestUsers();
});

beforeEach(() => {
  mockSession = { user: { id: "admin-session-id", role: "admin" } };
});

afterAll(async () => {
  await cleanupTestUsers();
  await prisma.$disconnect();
});

describe("registerUser (integration — PostgreSQL)", () => {
  it("creates a user when an admin invokes it with valid data", async () => {
    const result = await registerUser({
      name: "Cajero Nuevo",
      email: TEST_NEW_EMAIL,
      password: TEST_PASSWORD,
      role: "cashier",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe(TEST_NEW_EMAIL);
      expect(result.data.role).toBe("cashier");
      expect(result.data.id).toBeTypeOf("string");
    }

    const stored = await prisma.user.findUnique({
      where: { email: TEST_NEW_EMAIL },
    });
    expect(stored).not.toBeNull();
    expect(stored?.password).not.toBe(TEST_PASSWORD);
    expect(await bcrypt.compare(TEST_PASSWORD, stored?.password ?? "")).toBe(true);
  });

  it("rejects a cashier with FORBIDDEN without touching the database", async () => {
    mockSession = { user: { id: "cashier-session-id", role: "cashier" } };

    const result = await registerUser({
      name: "Intruso",
      email: "test-reg-forbidden@reg.test",
      password: TEST_PASSWORD,
      role: "admin",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    const stored = await prisma.user.findUnique({
      where: { email: "test-reg-forbidden@reg.test" },
    });
    expect(stored).toBeNull();
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    mockSession = null;

    const result = await registerUser({
      name: "Anónimo",
      email: "test-reg-unauthorized@reg.test",
      password: TEST_PASSWORD,
      role: "cashier",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("rejects a duplicate email with DUPLICATE_EMAIL", async () => {
    await prisma.user.create({
      data: {
        email: TEST_ADMIN_EMAIL,
        name: "Admin Existente",
        password: await bcrypt.hash(TEST_PASSWORD, 10),
        role: "admin",
      },
    });

    const result = await registerUser({
      name: "Duplicado",
      email: TEST_ADMIN_EMAIL,
      password: TEST_PASSWORD,
      role: "cashier",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_EMAIL");
    }
  });

  it("rejects invalid data with VALIDATION_ERROR before touching the database", async () => {
    const result = await registerUser({
      name: "",
      email: "no-es-email",
      password: "corta",
      role: "superuser",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});