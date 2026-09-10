"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createCategory, updateCategory } from "@/actions/inventario";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/inventario/schemas";
import { zodResolver } from "@/lib/inventario/form-resolver";
import { categoryCreateSchema, categoryUpdateSchema } from "@/lib/inventario/schemas";
import type { Category } from "@/generated/prisma/client";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  category?: Category;
}

const EMPTY_CREATE: CategoryCreateInput = { name: "", description: "" };

/**
 * Category create/edit modal (CM-R1..R4). RHF + Zod inline resolver; toasts
 * the ActionResult outcome (DUPLICATE_CATEGORY surfaces as an error toast).
 */
export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEdit = Boolean(category);
  const { register, handleSubmit, reset, formState } = useForm<
    CategoryCreateInput | CategoryUpdateInput
  >({
    resolver: zodResolver(isEdit ? categoryUpdateSchema : categoryCreateSchema) as never,
    defaultValues: isEdit ? { id: category!.id, name: category!.name, description: category!.description ?? "" } : EMPTY_CREATE,
  });

  useEffect(() => {
    if (open) {
      reset(
        isEdit
          ? { id: category!.id, name: category!.name, description: category!.description ?? "" }
          : EMPTY_CREATE,
      );
    }
  }, [open, category, isEdit, reset]);

  if (!open) return null;

  async function onSubmit(values: CategoryCreateInput | CategoryUpdateInput) {
    const result = isEdit
      ? await updateCategory(values as CategoryUpdateInput)
      : await createCategory(values as CategoryCreateInput);
    if (result.ok) {
      toast.success(`Categoría ${isEdit ? "actualizada" : "creada"}: ${result.data.name}`);
      onClose();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1A1A1A]/50 p-4" role="dialog" aria-modal="true" aria-label={isEdit ? "Editar categoría" : "Nueva categoría"}>
      <div className="w-full max-w-md rounded-[2px] border border-[#4A4A4A]/20 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">
            {isEdit ? "Editar categoría" : "Nueva categoría"}
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
          <div>
            <label htmlFor="category-name" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Nombre
            </label>
            <input
              id="category-name"
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
            <label htmlFor="category-description" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Descripción
            </label>
            <textarea
              id="category-description"
              rows={3}
              {...register("description")}
              className="w-full rounded-[2px] border border-[#4A4A4A] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
            />
            {formState.errors.description ? (
              <p role="alert" className="mt-1 text-xs text-[#C0392B]">
                {formState.errors.description.message}
              </p>
            ) : null}
          </div>

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
              {isEdit ? "Guardar" : "Crear categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}