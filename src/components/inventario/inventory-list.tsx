"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import { useProductSearch } from "@/lib/inventario/client";
import { SearchBar } from "@/components/inventario/search-bar";
import { ProductTable } from "@/components/inventario/product-table";
import { CategoryForm } from "@/components/inventario/category-form";
import { ProductForm } from "@/components/inventario/product-form";
import { SoftDeleteControls } from "@/components/inventario/soft-delete-controls";
import type { ProductSummary } from "@/lib/inventario/queries";

interface InventoryListProps {
  isAdmin: boolean;
}

/**
 * Client inventory workspace (SE-R2/R3, SD-R3): debounced search + SWR list
 * + role-gated mutation buttons. Admin-only actions open the modals; the real
 * gate lives server-side in every SA/RH.
 */
export function InventoryList({ isAdmin }: InventoryListProps) {
  const [query, setQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSummary | undefined>();

  // Empty query = full catalog: a broad term matches everything (SE-R1 OR
  // contains) while keeping the endpoint's non-empty `q` contract.
  const { data, error, isLoading, mutate } = useProductSearch(query);

  const productGroups =
    editingProduct?.variants.map((v, i) => ({
      attributeId: `variant-${i}`,
      valueIds: [v.id],
    })) ?? [];

  function openNewProduct() {
    setEditingProduct(undefined);
    setProductOpen(true);
  }

  function openEditProduct(product: ProductSummary) {
    setEditingProduct(product);
    setProductOpen(true);
  }

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
                onClick={() => setCategoryOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-[#0066FF]/40 px-3 py-2 text-sm font-medium text-[#0066FF] transition-colors hover:bg-[#0066FF]/5"
              >
                <PlusIcon aria-hidden="true" className="h-4 w-4" />
                Nueva categoría
              </button>
              <button
                type="button"
                onClick={openNewProduct}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] bg-[#0066FF] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052CC]"
              >
                <PlusIcon aria-hidden="true" className="h-4 w-4" />
                Nuevo producto
              </button>
            </>
          ) : null}
        </div>
      </div>

      <ProductTable
        data={data ?? null}
        isAdmin={isAdmin}
        loading={isLoading}
        error={error?.message ?? null}
        onEditProduct={openEditProduct}
        renderSoftDelete={(product) => (
          <SoftDeleteControls isAdmin productId={product.id} variantId={null} onDeleted={mutate} />
        )}
      />

      <CategoryForm open={categoryOpen} onClose={() => setCategoryOpen(false)} />
      <ProductForm
        open={productOpen}
        onClose={() => setProductOpen(false)}
        product={editingProduct}
        attributeGroups={productGroups}
        skuTemplate={editingProduct?.name ?? ""}
        variants={
          editingProduct?.variants.map((v) => ({
            attributeValueIds: [v.id],
            salePrice: v.salePrice,
            stock: v.stock,
          })) ?? []
        }
        editVariants={editingProduct?.variants.map((v) => ({ id: v.id }))}
      />
    </div>
  );
}