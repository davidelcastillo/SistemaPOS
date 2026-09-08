import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductForm } from "@/components/inventario/product-form";
import { success } from "@/lib/validations/result";
import type { Product } from "@/generated/prisma/client";
import type { ProductSummary } from "@/lib/inventario/queries";

vi.mock("@/actions/inventario", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  updateVariant: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  return { default: toastMock, toast: toastMock };
});

vi.mock("@/lib/inventario/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inventario/client")>();
  return { ...mod, useCategories: vi.fn() };
});

import { createProduct, updateProduct, updateVariant } from "@/actions/inventario";
import { toast } from "react-hot-toast";
import { useCategories } from "@/lib/inventario/client";

const CUID = "ckz8v1x2y0000abc123def456";
const CATEGORY_ID = "ckz8v1x2y0000abc123def457";

const product = {
  id: CUID,
  name: "Remera",
  description: "Remera básica",
  basePrice: "100.00" as unknown as import("@prisma/client/runtime/client").Decimal,
  categoryId: CATEGORY_ID,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Product;

const summary: ProductSummary = {
  id: product.id,
  name: "Remera",
  description: "Remera básica",
  basePrice: "100.00",
  isActive: true,
  category: { id: CATEGORY_ID, name: "Indumentaria" },
  variants: [
    { id: "ckz8v1x2y0000abc123def458", sku: "remera-rojo-s", salePrice: "120.00", stock: 5, isActive: true },
  ],
};

const attrGroup = {
  attributeId: "ckz8v1x2y0000abc123def459",
  valueIds: ["ckz8v1x2y0000abc123def460"],
};

const comboInputs = [{ attributeValueIds: ["ckz8v1x2y0000abc123def460"], salePrice: "120.00", stock: 5 }];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProductForm — create", () => {
  beforeEach(() => {
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: CATEGORY_ID, name: "Indumentaria", description: null, isActive: true }],
    } as never);
  });

  it("submits a ProductCreateInput through createProduct and toasts success (PM-R1)", async () => {
    vi.mocked(createProduct).mockResolvedValue(success(product));
    render(
      <ProductForm
        open
        onClose={vi.fn()}
        attributeGroups={[attrGroup]}
        variants={comboInputs}
        skuTemplate="remera"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Remera" } });
    fireEvent.change(screen.getByLabelText(/precio base/i), { target: { value: "100.00" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: CATEGORY_ID } });
    fireEvent.click(screen.getByRole("button", { name: /crear producto/i }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Remera",
          basePrice: "100.00",
          categoryId: CATEGORY_ID,
          attributeGroups: [attrGroup],
          skuTemplate: "remera",
          variants: comboInputs,
        }),
      );
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows validation errors and does not submit when the name is empty", async () => {
    render(
      <ProductForm
        open
        onClose={vi.fn()}
        attributeGroups={[attrGroup]}
        variants={comboInputs}
        skuTemplate="remera"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /crear producto/i }));

    await waitFor(() => {
      expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    });
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("toasts the backend failure when createProduct returns an error", async () => {
    vi.mocked(createProduct).mockResolvedValue({
      ok: false,
      error: { code: "DUPLICATE_SKU", message: "Ya existe una variante con ese SKU" },
    });
    render(
      <ProductForm
        open
        onClose={vi.fn()}
        attributeGroups={[attrGroup]}
        variants={comboInputs}
        skuTemplate="remera"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Remera" } });
    fireEvent.change(screen.getByLabelText(/precio base/i), { target: { value: "100.00" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: CATEGORY_ID } });
    fireEvent.click(screen.getByRole("button", { name: /crear producto/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Ya existe"));
    });
  });
});

describe("ProductForm — edit", () => {
  beforeEach(() => {
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: CATEGORY_ID, name: "Indumentaria", description: null, isActive: true }],
    } as never);
  });

  it("prefills product data, saves edits through updateProduct and variant rows through updateVariant (PM-R3)", async () => {
    vi.mocked(updateProduct).mockResolvedValue(success(product));
    vi.mocked(updateVariant).mockResolvedValue({ ok: true, data: {} as never });
    render(
      <ProductForm
        open
        onClose={vi.fn()}
        product={summary}
        attributeGroups={[attrGroup]}
        variants={comboInputs}
        skuTemplate="remera"
        editVariants={[{ id: "ckz8v1x2y0000abc123def458" }]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toHaveValue("Remera");
    });

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Remera Premium" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ id: product.id, name: "Remera Premium" }),
      );
    });
    await waitFor(() => {
      expect(updateVariant).toHaveBeenCalledWith({
        id: "ckz8v1x2y0000abc123def458",
        salePrice: "120.00",
        stock: 5,
      });
    });
    expect(toast.success).toHaveBeenCalled();
  });
});
