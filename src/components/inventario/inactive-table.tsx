"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { useSWRConfig } from "swr";
import { reactivateProduct } from "@/actions/inventario";
import type { InactiveItem } from "@/lib/inventario/queries";

interface InactiveTableProps {
  items: InactiveItem[];
  onReactivated: () => void;
}

/**
 * Inactive catalog (SD-R3): soft-deleted variants rendered with their product
 * and category context. Reactivation restores the whole product (SD-R4) after
 * a SweetAlert2 confirmation and revalidates the SWR lists.
 */
export function InactiveTable({ items, onReactivated }: InactiveTableProps) {
  const { mutate } = useSWRConfig();

  if (items.length === 0) {
    return (
      <div className="rounded-[2px] border border-[#4A4A4A]/20 px-4 py-10 text-center text-sm text-[#4A4A4A]">
        No hay productos desactivados.
      </div>
    );
  }

  async function handleReactivate(productId: string, productName: string) {
    const confirmed = await Swal.fire({
      title: "¿Reactivar producto?",
      text: `${productName} y todas sus variantes volverán a venderse.`,
      icon: "question",
      confirmButtonText: "Sí, reactivar",
      cancelButtonText: "Cancelar",
      showCancelButton: true,
      confirmButtonColor: "#0066FF",
    });
    if (!confirmed.isConfirmed) return;

    const result = await reactivateProduct(productId);
    if (result.ok) {
      toast.success(`Producto reactivado: ${productName}`);
      await mutate(["search"]);
      await mutate(["inactive"]);
      onReactivated();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="overflow-x-auto rounded-[2px] border border-[#4A4A4A]/20">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#4A4A4A]/20 bg-[#1A1A1A] text-left text-[0.75rem] font-medium uppercase tracking-wide text-white">
            <th className="px-4 py-2.5">Producto</th>
            <th className="px-4 py-2.5">Categoría</th>
            <th className="px-4 py-2.5">SKU</th>
            <th className="px-4 py-2.5 text-right">Precio</th>
            <th className="px-4 py-2.5 text-right">Stock</th>
            <th className="px-4 py-2.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-[#4A4A4A]/10 last:border-b-0">
              <td className="px-4 py-3 font-medium text-[#1A1A1A]">{row.productName}</td>
              <td className="px-4 py-3 text-[#4A4A4A]">{row.categoryName}</td>
              <td className="px-4 py-3 font-mono text-xs text-[#4A4A4A]">{row.sku}</td>
              <td className="px-4 py-3 text-right text-[#1A1A1A]">
                ${Number(row.salePrice).toLocaleString("es-AR")}
              </td>
              <td className="px-4 py-3 text-right text-[#4A4A4A]">{row.stock}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleReactivate(row.productId, row.productName)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#0066FF]/40 px-2.5 py-1.5 text-xs font-medium text-[#0066FF] transition-colors hover:bg-[#0066FF]/5"
                  >
                    <ArrowPathIcon aria-hidden="true" className="h-4 w-4" />
                    Reactivar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}