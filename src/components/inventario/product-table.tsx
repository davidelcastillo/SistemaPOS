"use client";

import type { ReactNode } from "react";
import type { Paginated, ProductSummary, VariantSummary } from "@/lib/inventario/queries";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

/**
 * Client-side guard (task 2.1): `/api/inventario/search` includes every
 * variant of a product (active and inactive). The active table must only
 * surface `isActive` variants — inactive ones only belong to `/inactivos`.
 */
export function activeVariants(variants: VariantSummary[]): VariantSummary[] {
  return variants.filter((v) => v.isActive);
}

interface ProductTableProps {
  data: Paginated<ProductSummary> | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  onEditProduct?: (product: ProductSummary) => void;
  renderSoftDelete?: (product: ProductSummary) => ReactNode;
}

/**
 * Active product listing (SE-R1/SD-R1). Read-only for cashiers: admin-only
 * action buttons are hidden when `isAdmin` is false. Flat design per STYLES.md:
 * 2px radius, no shadows, solid palette (#1A1A1A/#4A4A4A/#0066FF/#FFFFFF).
 */
export function ProductTable({ data, isAdmin, loading, error, onEditProduct, renderSoftDelete }: ProductTableProps) {
  if (loading) {
    return (
      <div data-testid="product-table-loading" className="space-y-2" role="status" aria-label="Cargando productos">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-[2px] bg-[#4A4A4A]/10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-[2px] border border-[#C0392B] bg-[#C0392B]/5 px-4 py-3 text-sm text-[#C0392B]">
        {error}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-[2px] border border-[#4A4A4A]/20 px-4 py-10 text-center text-sm text-[#4A4A4A]">
        No se encontraron productos.
      </div>
    );
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
            {isAdmin ? <th className="px-4 py-2.5 text-right">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.items.map((product) => {
            const visible = activeVariants(product.variants);
            return (
              <tr key={product.id} className="border-b border-[#4A4A4A]/10 last:border-b-0">
                <td className="px-4 py-3 font-medium text-[#1A1A1A]">{product.name}</td>
                <td className="px-4 py-3 text-[#4A4A4A]">{product.category.name}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5">
                    {visible.map((v) => (
                      <li key={v.id} className="font-mono text-xs text-[#4A4A4A]">
                        {v.sku}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-right text-[#1A1A1A]">
                  <ul className="space-y-0.5">
                    {visible.map((v) => (
                      <li key={v.id} className="text-xs">
                        ${Number(v.salePrice).toLocaleString("es-AR")}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-right text-[#4A4A4A]">
                  <ul className="space-y-0.5">
                    {visible.map((v) => (
                      <li key={v.id} className="text-xs">
                        {v.stock}
                      </li>
                    ))}
                  </ul>
                </td>
                {isAdmin ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditProduct?.(product)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#4A4A4A]/30 px-2.5 py-1.5 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A]/5"
                      >
                        <PencilSquareIcon aria-hidden="true" className="h-4 w-4" />
                        Editar
                      </button>
                      {renderSoftDelete ? renderSoftDelete(product) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}