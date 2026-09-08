import { describe, expect, it } from "vitest";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  variantUpdateSchema,
  searchQuerySchema,
} from "@/lib/inventario/schemas";

const cuidA = "ckz8v1x2y0000abc123def456";
const cuidB = "ckz8v1x2y0000abc123def457";
const cuidC = "ckz8v1x2y0000abc123def458";
const cuidD = "ckz8v1x2y0000abc123def459";
const cuidE = "ckz8v1x2y0000abc123def45a";
const cuidF = "ckz8v1x2y0000abc123def45b";
const cuidG = "ckz8v1x2y0000abc123def45c";

const validProductPayload = {
  name: "Remera Premium",
  description: "Algodón peinado",
  basePrice: "100.00",
  categoryId: cuidA,
  attributeGroups: [
    { attributeId: cuidB, valueIds: [cuidC, cuidD] },
    { attributeId: cuidE, valueIds: [cuidF, cuidG] },
  ],
  skuTemplate: "remera",
  variants: [
    { attributeValueIds: [cuidC, cuidF], salePrice: "120.00", stock: 10 },
    { attributeValueIds: [cuidC, cuidG], salePrice: "120.00", stock: 10 },
    { attributeValueIds: [cuidD, cuidF], salePrice: "130.00", stock: 5 },
    { attributeValueIds: [cuidD, cuidG], salePrice: "130.00", stock: 5 },
  ],
};

describe("categoryCreateSchema (CM-R1)", () => {
  it("accepts a valid name with optional description", () => {
    const parsed = categoryCreateSchema.safeParse({ name: "Bebidas", description: "Gaseosas y aguas" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Bebidas");
      expect(parsed.data.description).toBe("Gaseosas y aguas");
    }
  });

  it("accepts a valid name without description", () => {
    const parsed = categoryCreateSchema.safeParse({ name: "Snacks" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeUndefined();
    }
  });

  it("rejects an empty name", () => {
    expect(categoryCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name longer than 60 chars", () => {
    expect(categoryCreateSchema.safeParse({ name: "a".repeat(61) }).success).toBe(false);
  });

  it("rejects a description longer than 255 chars", () => {
    expect(categoryCreateSchema.safeParse({ name: "X", description: "a".repeat(256) }).success).toBe(false);
  });
});

describe("categoryUpdateSchema (L10 gestión de categorías)", () => {
  it("accepts a full update with name and optional description", () => {
    const parsed = categoryUpdateSchema.safeParse({ id: cuidA, name: "Aguas", description: "Minerales" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Aguas");
      expect(parsed.data.description).toBe("Minerales");
    }
  });

  it("accepts an update without description", () => {
    const parsed = categoryUpdateSchema.safeParse({ id: cuidA, name: "Snacks" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeUndefined();
    }
  });

  it("rejects a non-cuid id", () => {
    expect(categoryUpdateSchema.safeParse({ id: "not-a-cuid", name: "X" }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(categoryUpdateSchema.safeParse({ id: cuidA, name: "" }).success).toBe(false);
  });

  it("rejects a description longer than 255 chars", () => {
    expect(categoryUpdateSchema.safeParse({ id: cuidA, name: "X", description: "a".repeat(256) }).success).toBe(false);
  });
});

describe("productCreateSchema (PM-R1)", () => {
  it("accepts a valid product with a 2x2 variant matrix", () => {
    const parsed = productCreateSchema.safeParse(validProductPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Remera Premium");
      expect(parsed.data.attributeGroups).toHaveLength(2);
      expect(parsed.data.variants).toHaveLength(4);
      expect(parsed.data.variants[0].salePrice).toBe("120.00");
    }
  });

  it("rejects a malformed price", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, basePrice: "abc" }).success,
    ).toBe(false);
  });

  it("rejects a price with more than 2 decimals", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, basePrice: "10.999" }).success,
    ).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, name: "" }).success,
    ).toBe(false);
  });

  it("rejects an empty skuTemplate", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, skuTemplate: "" }).success,
    ).toBe(false);
  });

  it("rejects an empty variants array", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, variants: [] }).success,
    ).toBe(false);
  });

  it("rejects an empty attributeGroups array", () => {
    expect(
      productCreateSchema.safeParse({ ...validProductPayload, attributeGroups: [] }).success,
    ).toBe(false);
  });

  it("rejects a negative stock", () => {
    const payload = {
      ...validProductPayload,
      variants: [{ attributeValueIds: [cuidC, cuidF], salePrice: "120.00", stock: -1 }],
    };
    expect(productCreateSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a non-integer stock", () => {
    const payload = {
      ...validProductPayload,
      variants: [{ attributeValueIds: [cuidC, cuidF], salePrice: "120.00", stock: 2.5 }],
    };
    expect(productCreateSchema.safeParse(payload).success).toBe(false);
  });

  it("does NOT expose a barcode field (SE-R4)", () => {
    const parsed = productCreateSchema.safeParse({ ...validProductPayload, barcode: "7790000000001" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("barcode" in parsed.data).toBe(false);
    }
  });
});

describe("productUpdateSchema (PM-R3)", () => {
  it("accepts a partial update with a valid id", () => {
    const parsed = productUpdateSchema.safeParse({ id: cuidA, name: "Renombrado" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Renombrado");
    }
  });

  it("rejects a non-cuid id", () => {
    expect(productUpdateSchema.safeParse({ id: "not-a-cuid", name: "X" }).success).toBe(false);
  });

  it("rejects a malformed basePrice", () => {
    expect(productUpdateSchema.safeParse({ id: cuidA, basePrice: "10,50" }).success).toBe(false);
  });
});

describe("variantUpdateSchema (PM-R3)", () => {
  it("accepts sku, salePrice and stock updates", () => {
    const parsed = variantUpdateSchema.safeParse({ id: cuidA, sku: "remera-rojo-s", salePrice: "5.00", stock: 3 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sku).toBe("remera-rojo-s");
      expect(parsed.data.salePrice).toBe("5.00");
      expect(parsed.data.stock).toBe(3);
    }
  });

  it("rejects a negative stock", () => {
    expect(variantUpdateSchema.safeParse({ id: cuidA, stock: -1 }).success).toBe(false);
  });
});

describe("searchQuerySchema (SE-R1)", () => {
  it("accepts a query and applies pagination defaults", () => {
    const parsed = searchQuerySchema.safeParse({ q: "cola" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.q).toBe("cola");
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(10);
    }
  });

  it("keeps explicit page and pageSize values", () => {
    const parsed = searchQuerySchema.safeParse({ q: "cola", page: 2, pageSize: 25 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.pageSize).toBe(25);
    }
  });

  it("rejects a missing q", () => {
    expect(searchQuerySchema.safeParse({ page: 1 }).success).toBe(false);
  });

  it("rejects an empty q", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("rejects pageSize above the max bound", () => {
    expect(searchQuerySchema.safeParse({ q: "cola", pageSize: 101 }).success).toBe(false);
  });
});