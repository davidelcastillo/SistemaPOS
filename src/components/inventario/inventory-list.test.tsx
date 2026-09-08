import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Paginated, ProductSummary } from "@/lib/inventario/queries";

vi.mock("@/lib/inventario/client", () => ({
  useProductSearch: vi.fn(),
  useCategories: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/components/inventario/soft-delete-controls", () => ({
  SoftDeleteControls: () => <button type="button">Desactivar</button>,
}));

import { InventoryList } from "@/components/inventario/inventory-list";
import { useProductSearch } from "@/lib/inventario/client";

const catalog: Paginated<ProductSummary> = {
  items: [
    {
      id: "ckz8v1x2y0000abc123def456",
      name: "Coca Cola 500ml",
      description: null,
      basePrice: "1000",
      isActive: true,
      category: { id: "ckz8v1x2y0000abc123def457", name: "Bebidas" },
      variants: [
        { id: "ckz8v1x2y0000abc123def458", sku: "coca-500", salePrice: "1200", stock: 8, isActive: true },
      ],
    },
    {
      id: "ckz8v1x2y0000abc123def459",
      name: "Remera básica",
      description: null,
      basePrice: "900",
      isActive: true,
      category: { id: "ckz8v1x2y0000abc123def460", name: "Indumentaria" },
      variants: [
        { id: "ckz8v1x2y0000abc123def461", sku: "remera-s", salePrice: "1100", stock: 3, isActive: true },
      ],
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InventoryList — catalog load on mount (CRITICAL-1)", () => {
  it("renders the active catalog immediately without any search input", () => {
    vi.mocked(useProductSearch).mockReturnValue({
      data: catalog,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    render(<InventoryList isAdmin />);

    expect(screen.getByText("Coca Cola 500ml")).toBeInTheDocument();
    expect(screen.getByText("Remera básica")).toBeInTheDocument();
    expect(useProductSearch).toHaveBeenCalledWith("");
  });

  it("renders an empty state when the initial catalog has no active products", () => {
    vi.mocked(useProductSearch).mockReturnValue({
      data: { items: [], page: 1, pageSize: 10, total: 0 },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    render(<InventoryList isAdmin={false} />);

    expect(screen.getByText(/no se encontraron productos/i)).toBeInTheDocument();
  });
});