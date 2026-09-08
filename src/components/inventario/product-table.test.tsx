import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Paginated, ProductSummary, VariantSummary } from "@/lib/inventario/queries";
import { ProductTable, activeVariants } from "@/components/inventario/product-table";

const variant = (id: string, isActive: boolean): VariantSummary => ({
  id,
  sku: `sku-${id}`,
  salePrice: "1000",
  stock: 5,
  isActive,
});

const product = (id: string, variants: VariantSummary[]): ProductSummary => ({
  id,
  name: `Producto ${id}`,
  description: null,
  basePrice: "900",
  isActive: true,
  category: { id: "c1", name: "Bebidas" },
  variants,
});

afterEach(() => {
  cleanup();
});

describe("activeVariants — client-side inactive filter (task 2.1)", () => {
  it("returns only isActive variants when the payload mixes active and inactive", () => {
    const input = [
      variant("v1", true),
      variant("v2", false),
      variant("v3", true),
    ];

    const out = activeVariants(input);

    expect(out).toHaveLength(2);
    expect(out.map((v) => v.id)).toEqual(["v1", "v3"]);
  });

  it("returns an empty array when every variant is inactive (product excluded from sale)", () => {
    const out = activeVariants([variant("v1", false), variant("v2", false)]);

    expect(out).toEqual([]);
  });

  it("keeps an already-active list unchanged", () => {
    const input = [variant("v1", true)];

    expect(activeVariants(input)).toEqual(input);
  });
});

describe("ProductTable", () => {
  it("renders product rows and hides inactive variants (verify S4 / task 2.1)", () => {
    const data: Paginated<ProductSummary> = {
      items: [
        product("p1", [variant("v1", true), variant("v2", false)]),
        product("p2", [variant("v3", true)]),
      ],
      page: 1,
      pageSize: 10,
      total: 2,
    };

    render(<ProductTable data={data} isAdmin loading={false} error={null} />);

    expect(screen.getByText("Producto p1")).toBeInTheDocument();
    expect(screen.getByText("Producto p2")).toBeInTheDocument();
    // Inactive variant v2 must never render
    expect(screen.queryByText("sku-v2")).not.toBeInTheDocument();
    expect(screen.getByText("sku-v1")).toBeInTheDocument();
    expect(screen.getByText("sku-v3")).toBeInTheDocument();
  });

  it("is read-only for cashiers: no action buttons render when isAdmin=false", () => {
    const data: Paginated<ProductSummary> = {
      items: [product("p1", [variant("v1", true)])],
      page: 1,
      pageSize: 10,
      total: 1,
    };

    render(<ProductTable data={data} isAdmin={false} loading={false} error={null} />);

    expect(screen.getByText("Producto p1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar|eliminar|desactivar/i })).not.toBeInTheDocument();
  });

  it("renders admin actions when isAdmin=true", () => {
    const data: Paginated<ProductSummary> = {
      items: [product("p1", [variant("v1", true)])],
      page: 1,
      pageSize: 10,
      total: 1,
    };

    render(
      <ProductTable
        data={data}
        isAdmin
        loading={false}
        error={null}
        renderSoftDelete={() => <button type="button">Desactivar</button>}
      />,
    );

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });

  it("renders an empty state when the search matches nothing (SE-R1 empty)", () => {
    const data: Paginated<ProductSummary> = { items: [], page: 1, pageSize: 10, total: 0 };

    render(<ProductTable data={data} isAdmin loading={false} error={null} />);

    expect(screen.getByText(/no se encontraron/i)).toBeInTheDocument();
  });

  it("renders an error state when the fetch failed", () => {
    render(<ProductTable data={null} isAdmin loading={false} error="UNAUTHORIZED: Iniciá sesión para continuar" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Iniciá sesión para continuar");
  });

  it("shows a loading placeholder while fetching", () => {
    render(<ProductTable data={null} isAdmin loading error={null} />);

    expect(screen.getByTestId("product-table-loading")).toBeInTheDocument();
  });
});