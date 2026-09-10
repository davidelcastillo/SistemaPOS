"use client";

import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { useSWRConfig } from "swr";
import { softDeleteProduct, softDeleteVariant } from "@/actions/inventario";

interface SoftDeleteControlsProps {
  isAdmin: boolean;
  productId: string;
  variantId: string | null;
  onDeleted: () => void;
}

/**
 * Admin-only soft-delete controls (SD-R1/R2). SweetAlert2 confirmation gates
 * the mutation; on success the SWR catalog is revalidated via `mutate`.
 */
export function SoftDeleteControls({ isAdmin, productId, variantId, onDeleted }: SoftDeleteControlsProps) {
  const { mutate } = useSWRConfig();
  if (!isAdmin) return null;

  const label = variantId ? "Desactivar variante" : "Desactivar producto";

  async function handleDelete() {
    const confirmed = await Swal.fire({
      title: `¿${label}?`,
      text: variantId
        ? "La variante dejará de venderse. Podés reactivarla desde /inactivos."
        : "El producto y sus variantes dejarán de venderse. Podés reactivarlo desde /inactivos.",
      icon: "warning",
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
      showCancelButton: true,
      confirmButtonColor: "#C0392B",
    });
    if (!confirmed.isConfirmed) return;

    const result = variantId
      ? await softDeleteVariant(variantId)
      : await softDeleteProduct(productId);

    if (result.ok) {
      toast.success(variantId ? "Variante desactivada" : "Producto desactivado");
      await mutate(["search"]);
      await mutate(["inactive"]);
      onDeleted();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#C0392B]/40 px-2.5 py-1.5 text-xs font-medium text-[#C0392B] transition-colors hover:bg-[#C0392B]/5"
    >
      <ArchiveBoxXMarkIcon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}