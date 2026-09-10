import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InactiveTable } from "@/components/inventario/inactive-table";
import { success } from "@/lib/validations/result";
import type { InactiveItem } from "@/lib/inventario/queries";

vi.mock("@/actions/inventario", () => ({
  reactivateProduct: vi.fn(),
  reactivateVariant: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  return { default: toastMock, toast: toastMock };
});

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

import { reactivateProduct, reactivateVariant } from "@/actions/inventario";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";

const item = (id: string, overrides: Partial<InactiveItem> = {}): InactiveItem => ({
  id,
  sku: `sku-${id}`,
  stock: 3,
  salePrice: "120.00",
  isActive: false,
  productId: `prod-${id}`,
  productName: `Producto ${id}`,
  categoryName: "Bebidas",
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InactiveTable — SD-R3 render + SD-R4 reactivation", () => {
  it("renders soft-deleted items with their product and category context", () => {
    render(<InactiveTable items={[item("v1"), item("v2")]} onReactivated={vi.fn()} />);

    expect(screen.getByText("Producto v1")).toBeInTheDocument();
    expect(screen.getByText("Producto v2")).toBeInTheDocument();
    expect(screen.getAllByText("Bebidas")).toHaveLength(2);
    expect(screen.getByText("sku-v1")).toBeInTheDocument();
  });

  it("renders an empty state when there are no inactive items (SD-R3 empty scenario)", () => {
    render(<InactiveTable items={[]} onReactivated={vi.fn()} />);

    expect(screen.getByText(/no hay productos desactivados/i)).toBeInTheDocument();
  });

  it("confirms and reactivates the product through reactivateProduct (SD-R4)", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    vi.mocked(reactivateProduct).mockResolvedValue(success({ id: "prod-v1" } as never));
    const onReactivated = vi.fn();
    render(<InactiveTable items={[item("v1")]} onReactivated={onReactivated} />);

    fireEvent.click(screen.getByRole("button", { name: /reactivar/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
    expect(reactivateProduct).toHaveBeenCalledWith("prod-v1");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(onReactivated).toHaveBeenCalled();
  });

  it("does not reactivate when the admin cancels the confirmation", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false } as never);
    render(<InactiveTable items={[item("v1")]} onReactivated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /reactivar/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
    expect(reactivateVariant).not.toHaveBeenCalled();
    expect(reactivateProduct).not.toHaveBeenCalled();
  });

  it("toasts the backend failure when reactivation fails", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    vi.mocked(reactivateProduct).mockResolvedValue({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tenés permisos" },
    });
    render(<InactiveTable items={[item("v1")]} onReactivated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /reactivar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("No tenés permisos"));
    });
  });
});