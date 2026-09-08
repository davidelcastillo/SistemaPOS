"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createProduct, updateProduct, updateVariant } from "@/actions/inventario";
import { productCreateSchema } from "@/lib/inventario/schemas";
import { zodResolver } from "@/lib/inventario/form-resolver";
import { useCategories } from "@/lib/inventario/client";
import { VariantMatrix, type AttributeGroupInput } from "@/components/inventario/variant-matrix";
import type { ProductCreateInput, VariantComboInput } from "@/lib/inventario/schemas";
import type { ProductSummary } from "@/lib/inventario/queries";

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: ProductSummary;
  attributeGroups: AttributeGroupInput[];
  skuTemplate: string;
  variants: VariantComboInput[];
  /** Edit mode: real variant rows aligned positionally with `variants`. */
  editVariants?: { id: string }[];
}

const EMPTY_CREATE: ProductCreateInput = {
  name: "",
  description: "",
  basePrice: "",
  categoryId: "",
  attributeGroups: [],
  skuTemplate: "",
  variants: [],
};

/**
 * Product create/edit modal (PM-R1/R3). Create sends the full
 * `ProductCreateInput`; edit updates the product row and each dirty variant
 * through `updateProduct`/`updateVariant`. Category options come from the SWR
 * `/api/inventario/categories` hook. Toasts ActionResult borders.
 */
export function ProductForm({
  open,
  onClose,
  product,
  attributeGroups,
  skuTemplate,
  variants,
  editVariants,
}: ProductFormProps) {
  const isEdit = Boolean(product);
  const { data: categories } = useCategories();
  // Variants are OWNED here (not by the parent): VariantMatrix edits flow
  // through this state so the submit always sends the edited values (fix
  // CRITICAL-2 — previously the matrix received a no-op onChange).
  const [variantRows, setVariantRows] = useState<VariantComboInput[]>(variants);
  const { register, handleSubmit, reset, setValue, formState } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema) as never,
    defaultValues: EMPTY_CREATE,
  });

  // Expose the parent-owned matrix to the RHF state so the resolver validates
  // the full product contract (attributeGroups + variants + skuTemplate).
  useEffect(() => {
    if (open) {
      setValue("attributeGroups", attributeGroups, { shouldValidate: true });
      setValue("variants", variantRows, { shouldValidate: true });
      setValue("skuTemplate", skuTemplate, { shouldValidate: true });
    }
  }, [open, JSON.stringify(attributeGroups), JSON.stringify(variantRows), skuTemplate]);

  // Sync the scalar fields and seed the variant rows when the edit target
  // changes (create keeps the defaultValues). Single run per target.
  const editId = product?.id ?? "";
  useEffect(() => {
    if (open) {
      setVariantRows(variants);
      reset({
        name: product?.name ?? "",
        description: product?.description ?? "",
        basePrice: product?.basePrice ?? "",
        categoryId: product?.category.id ?? "",
        attributeGroups,
        skuTemplate,
        variants,
      });
    }
  }, [open, editId]);

  if (!open) return null;

  async function onSubmit(values: ProductCreateInput) {
    if (isEdit && product) {
      const updated = await updateProduct({
        id: product.id,
        name: values.name,
        basePrice: values.basePrice,
        categoryId: values.categoryId,
        description: values.description,
      });
      if (!updated.ok) {
        toast.error(updated.error.message);
        return;
      }
      for (let i = 0; i < variantRows.length; i++) {
        const variantRow = editVariants?.[i];
        if (!variantRow) continue;
        const result = await updateVariant({
          id: variantRow.id,
          salePrice: variantRows[i]?.salePrice,
          stock: variantRows[i]?.stock,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
      }
      toast.success(`Producto actualizado: ${updated.data.name}`);
      onClose();
      return;
    }

    const result = await createProduct({
      ...values,
      attributeGroups,
      skuTemplate,
      variants: variantRows,
    });
    if (result.ok) {
      toast.success(`Producto creado: ${result.data.name}`);
      onClose();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1A1A1A]/50 p-4" role="dialog" aria-modal="true" aria-label={isEdit ? "Editar producto" : "Nuevo producto"}>
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[2px] border border-[#4A4A4A]/20 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-[2px] p-1 text-[#4A4A4A] transition-colors hover:bg-[#1A1A1A]/5"
          >
            <XMarkIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="product-name" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Nombre
              </label>
              <input
                id="product-name"
                {...register("name")}
                className="w-full rounded-[2px] border border-[#4A4A4A] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
              />
              {formState.errors.name ? (
                <p role="alert" className="mt-1 text-xs text-[#C0392B]">
                  {formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="product-category" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Categoría
              </label>
              <select
                id="product-category"
                {...register("categoryId")}
                className="w-full rounded-[2px] border border-[#4A4A4A] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
              >
                <option value="">Seleccionar categoría</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {formState.errors.categoryId ? (
                <p role="alert" className="mt-1 text-xs text-[#C0392B]">
                  {formState.errors.categoryId.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="product-base-price" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Precio base
              </label>
              <input
                id="product-base-price"
                inputMode="decimal"
                {...register("basePrice")}
                placeholder="0.00"
                className="w-full rounded-[2px] border border-[#4A4A4A] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
              />
              {formState.errors.basePrice ? (
                <p role="alert" className="mt-1 text-xs text-[#C0392B]">
                  {formState.errors.basePrice.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="product-description" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Descripción
              </label>
              <textarea
                id="product-description"
                rows={1}
                {...register("description")}
                className="w-full rounded-[2px] border border-[#4A4A4A] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
              />
            </div>
          </div>

          <fieldset className="rounded-[2px] border border-[#4A4A4A]/20 p-4">
            <legend className="px-1 text-sm font-medium text-[#1A1A1A]">Variantes</legend>
            <VariantMatrix
              groups={attributeGroups}
              skuTemplate={skuTemplate}
              variants={variantRows}
              onChange={setVariantRows}
            />
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[2px] border border-[#4A4A4A]/30 px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-[2px] bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052CC]"
            >
              {isEdit ? "Guardar" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
