"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import { useProductSearch } from "@/lib/inventario/client";
import { SearchBar } from "@/components/inventario/search-bar";
import { ProductTable } from "@/components/inventario/product-table";

interface InventoryListProps {
  isAdmin: boolean;
  onNewCategory?: () => void;
  onNewProduct?: () => void;
  onEditProduct?: (product: unknown) => void;
}

/**
 * Client inventory workspace (SE-R2/R3, SD-R3): debounced search + SWR list
 * + role-gated action buttons. Admin-only mutations open via the form modals
 * wired by the parent page.
 */
export function InventoryList({ isAdmin, onNewCategory, onNewProduct, onEditProduct }: InventoryListProps) {
  const [query, setQuery] = useState("");

  // Empty query = full catalog: a broad term matches everything (SE-R1 OR
  // contains) while keeping the endpoint's non-empty `q` contract.
  const { data, error, isLoading } = useProductSearch(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-xl">
          <SearchBar onSearch={setQuery} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/inactivos"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#4A4A4A]/30 px-3 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A]/5"
          >
            <ArrowDownCircleIcon aria-hidden="true" className="h-4 w-4" />
            Ver Desactivados
          </Link>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={onNewCategory}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#0066FF]/40 px-3 py-2 text-sm font-medium text-[#0066FF] transition-colors hover:bg-[#0066FF]/5"
              >
                <PlusIcon aria-hidden="true" className="h-4 w-4" />
                Nueva categoría
              </button>
              <button
                type="button"
                onClick={onNewProduct}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] bg-[#0066FF] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052CC]"
              >
                <PlusIcon aria-hidden="true" className="h-4 w-4" />
                Nuevo producto
              </button>
            </>
          ) : null}
        </div>
      </div>

      <ProductTable data={data ?? null} isAdmin={isAdmin} loading={isLoading} error={error?.message ?? null} onEditProduct={onEditProduct} />
    </div>
  );
}