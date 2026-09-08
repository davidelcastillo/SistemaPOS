import { z } from "zod";
import { cuidSchema } from "@/lib/validations/ids";
import { paginationSchema } from "@/lib/validations/pagination";

/**
 * Inventario data contract — Zod schemas for categories, products, variants
 * and search. Prices travel as decimal strings (Prisma Decimal input).
 * Reuses the shared id + pagination contracts (read-only).
 */

const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Precio inválido");

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  description: z.string().max(255).optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  description: z.string().max(255).optional(),
});
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const variantComboSchema = z.object({
  attributeValueIds: z.array(cuidSchema).min(1, "La variante requiere al menos un valor"),
  salePrice: decimalStringSchema,
  stock: z.number().int().min(0),
});
export type VariantComboInput = z.infer<typeof variantComboSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(120),
  description: z.string().max(500).optional(),
  basePrice: decimalStringSchema,
  categoryId: cuidSchema,
  attributeGroups: z
    .array(
      z.object({
        attributeId: cuidSchema,
        valueIds: z.array(cuidSchema).min(1, "Cada grupo requiere al menos un valor"),
      }),
    )
    .min(1, "Se requiere al menos un grupo de atributos"),
  skuTemplate: z.string().min(1, "El template de SKU es obligatorio"),
  variants: z.array(variantComboSchema).min(1, "Se requiere al menos una variante"),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).optional(),
  basePrice: decimalStringSchema.optional(),
  categoryId: cuidSchema.optional(),
  description: z.string().max(500).optional(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const variantUpdateSchema = z.object({
  id: cuidSchema,
  sku: z.string().min(1).optional(),
  salePrice: decimalStringSchema.optional(),
  stock: z.number().int().min(0).optional(),
});
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1, "La búsqueda requiere un término"),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;