import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/inventario/session";
import { GET } from "@/app/api/inventario/categories/route";

vi.mock("@/lib/inventario/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inventario/session")>();
  return { ...mod, getSession: vi.fn() };
});

const adminSession = {
  expires: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "u-admin", role: "admin" as const, name: "Admin", email: "admin@pos.com" },
};
const cashierSession = {
  expires: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "u-cashier", role: "cashier" as const, name: "Cajero", email: "cajero@pos.com" },
};

let prefix: string;

beforeAll(async () => {
  prefix = `t${Date.now().toString(36)}`;
  await prisma.category.create({ data: { name: `${prefix}-Snacks` } });
  await prisma.category.create({ data: { name: `${prefix}-Aguas` } });
  await prisma.category.create({ data: { name: `${prefix}-Oculta`, isActive: false } });
});

afterAll(async () => {
  await prisma.category.deleteMany({ where: { name: { startsWith: prefix } } });
});

beforeEach(() => {
  vi.mocked(getSession).mockReset();
});

describe("GET /api/inventario/categories (CM-R3/R4)", () => {
  it("lists active categories ordered by name ascending", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const mine = body.data.filter((c: { name: string }) => c.name.startsWith(prefix)).map((c: { name: string }) => c.name);
    expect(mine).toEqual([`${prefix}-Aguas`, `${prefix}-Snacks`]);
  });

  it("does not expose soft-deleted categories (CM-R4)", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET();
    const body = await res.json();
    const names = body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain(`${prefix}-Oculta`);
  });

  it("models an empty catalog without error", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const spy = vi.spyOn(prisma.category, "findMany").mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual([]);
    spy.mockRestore();
  });

  it("is readable by a cashier (CM-R4)", async () => {
    vi.mocked(getSession).mockResolvedValue(cashierSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("rejects a missing session with UNAUTHORIZED", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
