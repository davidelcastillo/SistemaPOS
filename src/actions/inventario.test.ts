import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/inventario/session";
import { buildSku } from "@/lib/inventario/combinations";
import type { ActionResult } from "@/lib/validations/result";
import {
  createCategory,
  updateCategory,
  createProduct,
  updateProduct,
  updateVariant,
  softDeleteProduct,
  softDeleteVariant,
  reactivateProduct,
  reactivateVariant,
} from "@/actions/inventario";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/inventario/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inventario/session")>();
  return { ...mod, getSession: vi.fn() };
});

const CUID = "ckz8v1x2y0000abc123def456";

const adminSession = {
  expires: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "u-admin", role: "admin" as const, name: "Admin", email: "admin@pos.com" },
};
const cashierSession = {
  expires: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "u-cashier", role: "cashier" as const, name: "Cajero", email: "cajero@pos.com" },
};

let prefix: string;
let categoryId: string;
let colorAttrId: string;
let sizeAttrId: string;
let rojoId: string;
let azulId: string;
let sId: string;
let mId: string;
let mutations: [string, () => Promise<ActionResult<unknown>>][];

function productPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `${prefix}-producto`,
    description: "Producto de prueba",
    basePrice: "100.00",
    categoryId,
    attributeGroups: [
      { attributeId: colorAttrId, valueIds: [rojoId, azulId] },
      { attributeId: sizeAttrId, valueIds: [sId, mId] },
    ],
    skuTemplate: `${prefix}-remera`,
    variants: [
      { attributeValueIds: [rojoId, sId], salePrice: "120.00", stock: 10 },
      { attributeValueIds: [rojoId, mId], salePrice: "120.00", stock: 10 },
      { attributeValueIds: [azulId, sId], salePrice: "130.00", stock: 5 },
      { attributeValueIds: [azulId, mId], salePrice: "130.00", stock: 5 },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  prefix = `t${Date.now().toString(36)}`;
  const category = await prisma.category.create({ data: { name: `${prefix}-categoria` } });
  categoryId = category.id;
  const color = await prisma.attribute.create({ data: { name: `${prefix}-Color` } });
  const size = await prisma.attribute.create({ data: { name: `${prefix}-Talle` } });
  colorAttrId = color.id;
  sizeAttrId = size.id;
  rojoId = (await prisma.attributeValue.create({ data: { value: `${prefix}-Rojo`, attributeId: color.id } })).id;
  azulId = (await prisma.attributeValue.create({ data: { value: `${prefix}-Azul`, attributeId: color.id } })).id;
  sId = (await prisma.attributeValue.create({ data: { value: `${prefix}-S`, attributeId: size.id } })).id;
  mId = (await prisma.attributeValue.create({ data: { value: `${prefix}-M`, attributeId: size.id } })).id;

  mutations = [
    ["createCategory", () => createCategory({ name: `${prefix}-x` })],
    ["updateCategory", () => updateCategory({ id: CUID, name: `${prefix}-x` })],
    ["createProduct", () => createProduct(productPayload())],
    ["updateProduct", () => updateProduct({ id: CUID, name: "x" })],
    ["updateVariant", () => updateVariant({ id: CUID, stock: 1 })],
    ["softDeleteProduct", () => softDeleteProduct(CUID)],
    ["softDeleteVariant", () => softDeleteVariant(CUID)],
    ["reactivateProduct", () => reactivateProduct(CUID)],
    ["reactivateVariant", () => reactivateVariant(CUID)],
  ];
});

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(revalidatePath).mockClear();
});

afterAll(async () => {
  await prisma.variantAttribute.deleteMany({ where: { variant: { sku: { startsWith: prefix } } } });
  await prisma.variant.deleteMany({ where: { sku: { startsWith: prefix } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.category.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.attributeValue.deleteMany({ where: { attribute: { name: { startsWith: prefix } } } });
  await prisma.attribute.deleteMany({ where: { name: { startsWith: prefix } } });
});

describe("role gate on every mutation (CM-R2 / PM-R4)", () => {
  it("returns UNAUTHORIZED for every mutation when the session is null", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    for (const [name, run] of mutations) {
      const result = await run();
      expect(result.ok, name).toBe(false);
      if (!result.ok) {
        expect(result.error.code, name).toBe("UNAUTHORIZED");
      }
    }
  });

  it("returns FORBIDDEN for every mutation when the role is cashier", async () => {
    vi.mocked(getSession).mockResolvedValue(cashierSession);
    for (const [name, run] of mutations) {
      const result = await run();
      expect(result.ok, name).toBe(false);
      if (!result.ok) {
        expect(result.error.code, name).toBe("FORBIDDEN");
      }
    }
  });
});

describe("createCategory (CM-R1)", () => {
  it("persists a category with a unique name and revalidates /inventario", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const name = `${prefix}-Bebidas`;
    const result = await createCategory({ name, description: "Gaseosas y aguas" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe(name);
      expect(result.data.description).toBe("Gaseosas y aguas");
      expect(result.data.isActive).toBe(true);
    }
    const row = await prisma.category.findUnique({ where: { name } });
    expect(row).not.toBeNull();
    expect(row?.description).toBe("Gaseosas y aguas");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
  });

  it("returns DUPLICATE_CATEGORY on a duplicate name and writes no row", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const name = `${prefix}-Duplicada`;
    await createCategory({ name });
    const before = await prisma.category.count({ where: { name } });
    const result = await createCategory({ name });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_CATEGORY");
    }
    const after = await prisma.category.count({ where: { name } });
    expect(after).toBe(before);
    expect(after).toBe(1);
  });

  it("returns VALIDATION_ERROR for an invalid payload before any write", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await createCategory({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("updateCategory (L10 gestión de categorías)", () => {
  it("persists name and description changes and revalidates both paths", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createCategory({ name: `${prefix}-Editables`, description: "antes" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result = await updateCategory({ id: created.data.id, name: `${prefix}-Renombrada`, description: "después" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe(`${prefix}-Renombrada`);
    }
    const row = await prisma.category.findUnique({ where: { id: created.data.id } });
    expect(row?.name).toBe(`${prefix}-Renombrada`);
    expect(row?.description).toBe("después");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/api/inventario/categories");
  });

  it("returns DUPLICATE_CATEGORY when renaming to an existing name and applies no change", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const first = await createCategory({ name: `${prefix}-Dupe-a` });
    const second = await createCategory({ name: `${prefix}-Dupe-b` });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const result = await updateCategory({ id: second.data.id, name: `${prefix}-Dupe-a` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_CATEGORY");
    }
    const row = await prisma.category.findUnique({ where: { id: second.data.id } });
    expect(row?.name).toBe(`${prefix}-Dupe-b`);
  });

  it("returns VALIDATION_ERROR for an invalid payload", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await updateCategory({ id: CUID, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("createProduct (PM-R1 / PM-R2)", () => {
  it("persists a product with 4 variants with distinct generated SKUs", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await createProduct(productPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe(`${prefix}-producto`);
      expect(result.data.basePrice.toNumber()).toBe(100);
    }
    const variants = await prisma.variant.findMany({
      where: { productId: result.ok ? result.data.id : "" },
      orderBy: { sku: "asc" },
    });
    expect(variants).toHaveLength(4);
    const expectedSkus = [
      buildSku(`${prefix}-remera`, [rojoId, sId]),
      buildSku(`${prefix}-remera`, [rojoId, mId]),
      buildSku(`${prefix}-remera`, [azulId, sId]),
      buildSku(`${prefix}-remera`, [azulId, mId]),
    ];
    expect(variants.map((v) => v.sku).sort()).toEqual([...expectedSkus].sort());
    expect(new Set(variants.map((v) => v.sku)).size).toBe(4);
    const attrs = await prisma.variantAttribute.count({ where: { variant: { productId: result.ok ? result.data.id : "" } } });
    expect(attrs).toBe(8);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
  });

  it("rolls back the whole transaction when a SKU collides (DUPLICATE_SKU)", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const template = `${prefix}-remera-colision`;
    const collidingSku = buildSku(template, [rojoId, sId]);
    const seedProduct = await prisma.product.create({ data: { name: `${prefix}-semilla`, basePrice: "1.00", categoryId } });
    await prisma.variant.create({ data: { sku: collidingSku, salePrice: "1.00", stock: 1, productId: seedProduct.id } });
    const result = await createProduct(productPayload({ name: `${prefix}-producto-colision`, skuTemplate: template }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SKU");
    }
    const products = await prisma.product.count({ where: { name: `${prefix}-producto-colision` } });
    expect(products).toBe(0);
    const seedVariants = await prisma.variant.count({ where: { productId: seedProduct.id } });
    expect(seedVariants).toBe(1);
  });

  it("returns VALIDATION_ERROR for an invalid payload", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await createProduct(productPayload({ basePrice: "abc" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when variants do not match the attribute matrix", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await createProduct(
      productPayload({
        name: `${prefix}-producto-mismatch`,
        skuTemplate: `${prefix}-remera-mismatch`,
        variants: [{ attributeValueIds: [rojoId, sId], salePrice: "120.00", stock: 1 }],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    const products = await prisma.product.count({ where: { name: `${prefix}-producto-mismatch` } });
    expect(products).toBe(0);
  });
});

describe("updateProduct / updateVariant (PM-R3)", () => {
  it("persists product name, price and description and revalidates /inventario", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ skuTemplate: `${prefix}-remera-edit` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result = await updateProduct({ id: created.data.id, name: `${prefix}-renombrado`, basePrice: "150.00" });
    expect(result.ok).toBe(true);
    const row = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(row?.name).toBe(`${prefix}-renombrado`);
    expect(row?.basePrice.toNumber()).toBe(150);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
  });

  it("persists variant price and stock and revalidates /inventario", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ skuTemplate: `${prefix}-remera-price` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const variant = await prisma.variant.findFirst({ where: { productId: created.data.id } });
    expect(variant).not.toBeNull();
    if (!variant) return;
    const result = await updateVariant({ id: variant.id, salePrice: "99.50", stock: 7 });
    expect(result.ok).toBe(true);
    const row = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(row?.salePrice.toNumber()).toBe(99.5);
    expect(row?.stock).toBe(7);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
  });

  it("returns DUPLICATE_SKU when renaming a variant SKU to an existing one and applies no change", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const a = await createProduct(productPayload({ name: `${prefix}-prod-a`, skuTemplate: `${prefix}-remera-a` }));
    const b = await createProduct(productPayload({ name: `${prefix}-prod-b`, skuTemplate: `${prefix}-otra` }));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const variantA = await prisma.variant.findFirst({ where: { productId: a.data.id } });
    const variantB = await prisma.variant.findFirst({ where: { productId: b.data.id } });
    expect(variantA).not.toBeNull();
    expect(variantB).not.toBeNull();
    if (!variantA || !variantB) return;
    const result = await updateVariant({ id: variantB.id, sku: variantA.sku });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SKU");
    }
    const row = await prisma.variant.findUnique({ where: { id: variantB.id } });
    expect(row?.sku).toBe(variantB.sku);
  });

  it("returns VALIDATION_ERROR for an invalid update payload", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const badProduct = await updateProduct({ id: "not-a-cuid", name: "x" });
    expect(badProduct.ok).toBe(false);
    if (!badProduct.ok) {
      expect(badProduct.error.code).toBe("VALIDATION_ERROR");
    }
    const badVariant = await updateVariant({ id: CUID, stock: -1 });
    expect(badVariant.ok).toBe(false);
    if (!badVariant.ok) {
      expect(badVariant.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("soft delete (SD-R1 / SD-R2)", () => {
  it("soft-deletes a product and cascades to all its variants", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ name: `${prefix}-prod-cascade`, skuTemplate: `${prefix}-remera-cascade` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result = await softDeleteProduct(created.data.id);
    expect(result.ok).toBe(true);
    const product = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(product?.isActive).toBe(false);
    const activeVariants = await prisma.variant.count({ where: { productId: created.data.id, isActive: true } });
    expect(activeVariants).toBe(0);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inactivos");
  });

  it("soft-deletes only the targeted variant", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ name: `${prefix}-prod-variant`, skuTemplate: `${prefix}-remera-variant` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const variant = await prisma.variant.findFirst({ where: { productId: created.data.id } });
    expect(variant).not.toBeNull();
    if (!variant) return;
    const result = await softDeleteVariant(variant.id);
    expect(result.ok).toBe(true);
    const row = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(row?.isActive).toBe(false);
    const activeVariants = await prisma.variant.count({ where: { productId: created.data.id, isActive: true } });
    expect(activeVariants).toBe(3);
    const product = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(product?.isActive).toBe(true);
  });

  it("returns VALIDATION_ERROR when soft-deleting a non-existent id", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const result = await softDeleteProduct(CUID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("reactivation (SD-R4)", () => {
  it("reactivates a product and all its variants", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ name: `${prefix}-prod-reactivate`, skuTemplate: `${prefix}-remera-reactivate` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await softDeleteProduct(created.data.id);
    const result = await reactivateProduct(created.data.id);
    expect(result.ok).toBe(true);
    const product = await prisma.product.findUnique({ where: { id: created.data.id } });
    expect(product?.isActive).toBe(true);
    const inactiveVariants = await prisma.variant.count({ where: { productId: created.data.id, isActive: false } });
    expect(inactiveVariants).toBe(0);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inventario");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/inactivos");
  });

  it("reactivates a single variant under an active product", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession);
    const created = await createProduct(productPayload({ name: `${prefix}-prod-reactivar-v`, skuTemplate: `${prefix}-remera-reactivar-v` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const variant = await prisma.variant.findFirst({ where: { productId: created.data.id } });
    expect(variant).not.toBeNull();
    if (!variant) return;
    await softDeleteVariant(variant.id);
    const result = await reactivateVariant(variant.id);
    expect(result.ok).toBe(true);
    const row = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(row?.isActive).toBe(true);
    const activeVariants = await prisma.variant.count({ where: { productId: created.data.id, isActive: true } });
    expect(activeVariants).toBe(4);
  });
});