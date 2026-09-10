import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Paginated, ProductSummary } from "@/lib/inventario/queries";
import type { ActionResult } from "@/lib/validations/result";
import { failure, success } from "@/lib/validations/result";
import { fetchCategories, fetchInactive, searchProducts, unpackResult } from "@/lib/inventario/client";

describe("unpackResult", () => {
  it("returns the data when the action result is a success", () => {
    const payload: Paginated<ProductSummary> = {
      items: [
        {
          id: "p1",
          name: "Cola 500ml",
          description: null,
          basePrice: "1000",
          isActive: true,
          category: { id: "c1", name: "Bebidas" },
          variants: [
            { id: "v1", sku: "cola-500", salePrice: "1200", stock: 8, isActive: true },
          ],
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    };

    expect(unpackResult(success(payload))).toEqual(payload);
  });

  it("throws an Error with the code and message when the result is a failure", () => {
    const result: ActionResult<never> = failure("UNAUTHORIZED", "Iniciá sesión para continuar");

    expect(() => unpackResult(result)).toThrow("UNAUTHORIZED");
    expect(() => unpackResult(result)).toThrow("Iniciá sesión para continuar");
  });

  it("handles an empty catalog as a valid success (empty state, no error)", () => {
    const payload: Paginated<ProductSummary> = { items: [], page: 1, pageSize: 10, total: 0 };

    expect(unpackResult(success(payload))).toEqual(payload);
  });
});

describe("inventario client fetchers", () => {
  const okJson = (body: unknown) =>
    ({ ok: true, json: async () => body }) as Response;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("searchProducts with an empty query does not use a sentinel wildcard (CRITICAL-1)", async () => {
    const result: ActionResult<Paginated<ProductSummary>> = success({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson(result));

    const out = await searchProducts("");

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("/api/inventario/search");
    expect(url).toContain("q=");
    expect(url).not.toContain("q=*");
    expect(out).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  it("searchProducts fetches /api/inventario/search with the query and unwraps", async () => {
    const result: ActionResult<Paginated<ProductSummary>> = success({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson(result));

    const out = await searchProducts("cola");

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("/api/inventario/search");
    expect(url).toContain("q=cola");
    expect(out).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  it("searchProducts propagates an Action failure as a thrown error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson(failure("VALIDATION_ERROR", "Datos inválidos")),
    );

    await expect(searchProducts("")).rejects.toThrow("VALIDATION_ERROR");
  });

  it("fetchCategories calls /api/inventario/categories", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson(success([{ id: "c1", name: "Bebidas", description: null, isActive: true }])),
    );

    const out = await fetchCategories();

    const url = (vi.mocked(globalThis.fetch).mock.calls[0]?.[0] as string) ?? "";
    expect(url).toContain("/api/inventario/categories");
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Bebidas");
  });

  it("fetchInactive calls /api/inventario/inactive", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson(success({ items: [], page: 1, pageSize: 0, total: 0 })),
    );

    const out = await fetchInactive();

    const url = (vi.mocked(globalThis.fetch).mock.calls[0]?.[0] as string) ?? "";
    expect(url).toContain("/api/inventario/inactive");
    expect(out.items).toEqual([]);
  });
});