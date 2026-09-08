import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/inventario/session";
import { GET } from "@/app/api/inventario/search/route";

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
let productId: string;

function searchUrl(q: string, extra = ""): string {
  return `http://localhost/api/inventario/search?q=${encodeURIComponent(q)}${extra}`;
}

beforeAll(async () => {
  prefix = `t${Date.now().toString(36)}`;
  const category = await prisma.category.create({ data: { name: `${prefix}-Bebidas` } });
  const product = await prisma.product.create({
    data: { name: `${prefix}-Coca Cola 500ml`, description: "Gaseosa cola", basePrice: "50.00", categoryId: category.id },
  });
  await prisma.variant.create({ data: { sku: `${prefix}-coca-cola-500ml`, salePrice: "60.00", stock: 10, productId: product.id } });
  productId = product.id;
});

afterAll(async () => {
  await prisma.variant.deleteMany({ where: { sku: { startsWith: prefix } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.category.deleteMany({ where: { name: { startsWith: prefix } } });
});

beforeEach(() => {
  vi.mocked(getSession).mockReset();
});

describe("GET /api/inventario/search (SE-R1)", () => {
  it("matches product name case-insensitively", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("COCA")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const mine = body.data.items.filter((i: { name: string }) => i.name.startsWith(prefix));
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe(`${prefix}-Coca Cola 500ml`);
    expect(mine[0].basePrice).toBe("50");
  });

  it("matches variant SKU", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("coca-cola")));
    const body = await res.json();
    const mine = body.data.items.filter((i: { id: string }) => i.id === productId);
    expect(mine).toHaveLength(1);
  });

  it("matches product description", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("gaseosa")));
    const body = await res.json();
    const mine = body.data.items.filter((i: { id: string }) => i.id === productId);
    expect(mine).toHaveLength(1);
  });

  it("matches category name", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("bebidas")));
    const body = await res.json();
    const mine = body.data.items.filter((i: { id: string }) => i.id === productId);
    expect(mine).toHaveLength(1);
  });

  it("applies pagination bounds", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("cola", "&page=1&pageSize=5")));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.page).toBe(1);
    expect(body.data.pageSize).toBe(5);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty state without error when nothing matches", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request(searchUrl("zzz-no-existe")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("is readable by a cashier (SE-R3)", async () => {
    vi.mocked(getSession).mockResolvedValue(cashierSession);
    const res = await GET(new Request(searchUrl("cola")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it("rejects a missing session with UNAUTHORIZED", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET(new Request(searchUrl("cola")));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns all active products when q is empty (catalog load, CRITICAL-1)", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const res = await GET(new Request("http://localhost/api/inventario/search?q="));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const mine = body.data.items.filter((i: { name: string }) => i.name.startsWith(prefix));
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe(`${prefix}-Coca Cola 500ml`);
  });

  it("excludes soft-deleted products (SD-R1)", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    const res = await GET(new Request(searchUrl("cola")));
    const body = await res.json();
    expect(body.ok).toBe(true);
    const mine = body.data.items.filter((i: { id: string }) => i.id === productId);
    expect(mine).toEqual([]);
    await prisma.product.update({ where: { id: productId }, data: { isActive: true } });
  });
});