import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SoftDeleteControls } from "@/components/inventario/soft-delete-controls";
import { success } from "@/lib/validations/result";

vi.mock("@/actions/inventario", () => ({
  softDeleteProduct: vi.fn(),
  softDeleteVariant: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  return { default: toastMock, toast: toastMock };
});

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

vi.mock("swr", async (importOriginal) => {
  const mod = await importOriginal<typeof import("swr")>();
  return { ...mod, useSWRConfig: () => ({ mutate: vi.fn() }) };
});

import { softDeleteProduct, softDeleteVariant } from "@/actions/inventario";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";

const PRODUCT_ID = "ckz8v1x2y0000abc123def456";
const VARIANT_ID = "ckz8v1x2y0000abc123def457";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SoftDeleteControls — SD-R1/R2 admin-only", () => {
  it("does not render at all for cashiers", () => {
    render(<SoftDeleteControls isAdmin={false} productId={PRODUCT_ID} variantId={null} onDeleted={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("confirms through SweetAlert2 and soft-deletes a product (SD-R1)", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    vi.mocked(softDeleteProduct).mockResolvedValue(success({ id: PRODUCT_ID } as never));
    const onDeleted = vi.fn();
    render(<SoftDeleteControls isAdmin productId={PRODUCT_ID} variantId={null} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar producto/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
    expect(softDeleteProduct).toHaveBeenCalledWith(PRODUCT_ID);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(onDeleted).toHaveBeenCalled();
  });

  it("does NOT delete when the admin cancels the confirmation", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false } as never);
    render(<SoftDeleteControls isAdmin productId={PRODUCT_ID} variantId={null} onDeleted={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar producto/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });
    expect(softDeleteProduct).not.toHaveBeenCalled();
  });

  it("soft-deletes a single variant without touching the product (SD-R2)", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    vi.mocked(softDeleteVariant).mockResolvedValue(success({ id: VARIANT_ID } as never));
    const onDeleted = vi.fn();
    render(<SoftDeleteControls isAdmin productId={PRODUCT_ID} variantId={VARIANT_ID} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar variante/i }));

    await waitFor(() => {
      expect(softDeleteVariant).toHaveBeenCalledWith(VARIANT_ID);
    });
    expect(softDeleteProduct).not.toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalled();
  });

  it("toasts the backend failure when the delete fails", async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
    vi.mocked(softDeleteProduct).mockResolvedValue({
      ok: false,
      error: { code: "FORBIDDEN", message: "No tenés permisos" },
    });
    render(<SoftDeleteControls isAdmin productId={PRODUCT_ID} variantId={null} onDeleted={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar producto/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("No tenés permisos"));
    });
  });
});