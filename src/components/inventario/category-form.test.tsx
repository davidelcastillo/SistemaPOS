import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CategoryForm } from "@/components/inventario/category-form";
import { success } from "@/lib/validations/result";
import type { Category } from "@/generated/prisma/client";

vi.mock("@/actions/inventario", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  return { default: toastMock, toast: toastMock };
});

vi.mock("@/lib/inventario/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inventario/client")>();
  return { ...mod, useCategories: vi.fn(() => ({ data: undefined })) };
});

import { createCategory, updateCategory } from "@/actions/inventario";
import { toast } from "react-hot-toast";

const category: Category = {
  id: "ckz8v1x2y0000abc123def456",
  name: "Bebidas",
  description: "Gaseosas y aguas",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CategoryForm", () => {
  it("submits a valid create payload through createCategory and toasts success (CM-R1)", async () => {
    vi.mocked(createCategory).mockResolvedValue(success(category));
    render(<CategoryForm open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Bebidas" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Gaseosas" } });
    fireEvent.click(screen.getByRole("button", { name: /crear categoría/i }));

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({
        name: "Bebidas",
        description: "Gaseosas",
      });
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Bebidas"));
  });

  it("shows validation errors and does not submit when the name is empty", async () => {
    render(<CategoryForm open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /crear categoría/i }));

    await waitFor(() => {
      expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    });
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("toasts the backend failure when createCategory returns DUPLICATE_CATEGORY", async () => {
    vi.mocked(createCategory).mockResolvedValue({
      ok: false,
      error: { code: "DUPLICATE_CATEGORY", message: "Ya existe una categoría con ese nombre" },
    });
    render(<CategoryForm open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Bebidas" } });
    fireEvent.click(screen.getByRole("button", { name: /crear categoría/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Ya existe"));
    });
    expect(createCategory).toHaveBeenCalledTimes(1);
  });

  it("prefills and submits an update through updateCategory when editing (PM-adjacent)", async () => {
    vi.mocked(updateCategory).mockResolvedValue(success({ ...category, name: "Bebidas 2L" }));
    render(<CategoryForm open onClose={vi.fn()} category={category} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toHaveValue("Bebidas");
    });

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Bebidas 2L" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith({
        id: category.id,
        name: "Bebidas 2L",
        description: "Gaseosas y aguas",
      });
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("does not render when closed", () => {
    render(<CategoryForm open={false} onClose={vi.fn()} />);

    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
  });
});