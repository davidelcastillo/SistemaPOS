import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/inventario/session";
import { GET } from "@/app/api/inventario/inactive/route";

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
let inactiveVariantId: string;

beforeAll(async () => {
  prefix = `t${Date.now().toString(36)}`;
  const category = await prisma.category.create({ data: { name: `${prefix}-Cat` } });
  const product = await prisma.product.create({ data: { name: `${prefix}-Prod`, basePrice: "10.00", categoryId: category.id } });
  await prisma.variant.create({ data: { sku: `${prefix}-sku-1`, salePrice: "5.00", stock: 2, productId: product.id } });
  const inactive = await prisma.variant.create({ data: { sku: `${prefix}-sku-2`, salePrice: "6.00", stock: 3, productId: product.id } });
  await prisma.variant.update({ where: { id: inactive.id }, data: { isActive: false } });
  inactiveVariantId = inactive.id;
});

afterAll(async () => {
  await prisma.variant.deleteMany({ where: { sku: { startsWith: prefix } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.category.deleteMany({ where: { name: { startsWith: prefix } } });
});

beforeEach(() => {
  vi.mocked(getSession).mockReset();
});

describe("GET /api/inventario/inactive (SD-R3)", () => {
  it("lists soft-deleted variants for an admin with product context", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request("http://localhost/api/inventario/inactive"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const mine = body.data.items.filter((i: { sku: string }) => i.sku.startsWith(prefix));
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe(inactiveVariantId);
    expect(mine[0].sku).toBe(`${prefix}-sku-2`);
    expect(mine[0].isActive).toBe(false);
    expect(mine[0].productName).toBe(`${prefix}-Prod`);
    expect(mine[0].categoryName).toBe(`${prefix}-Cat`);
  });

  it("models an empty inactive list without error", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const spy = vi.spyOn(prisma.variant, "findMany").mockResolvedValueOnce([]);
    const res = await GET(new Request("http://localhost/api/inventario/inactive"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toEqual([]);
    spy.mockRestore();
  });

  it("rejects a cashier with FORBIDDEN (SD-R3)", async () => {
    vi.mocked(getSession).mockResolvedValue(cashierSession);
    const res = await GET(new Request("http://localhost/api/inventario/inactive"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects a missing session with UNAUTHORIZED", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/inventario/inactive"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});