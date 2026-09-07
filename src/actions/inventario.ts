"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Category, Product, Variant } from "@/generated/prisma/client";
import { success, failure } from "@/lib/validations/result";
import type { ActionResult } from "@/lib/validations/result";
import {
  categoryCreateSchema,
  productCreateSchema,
  productUpdateSchema,
  variantUpdateSchema,
} from "@/lib/inventario/schemas";
import type {
  CategoryCreateInput,
  ProductCreateInput,
  ProductUpdateInput,
  VariantUpdateInput,
} from "@/lib/inventario/schemas";
import { generateCombinations, buildSku } from "@/lib/inventario/combinations";
import { mapPrismaError } from "@/lib/inventario/errors";
import { getSession, isAdmin } from "@/lib/inventario/session";

const UNAUTHORIZED_MESSAGE = "Iniciá sesión para continuar";
const FORBIDDEN_MESSAGE = "No tenés permisos para realizar esta acción";
const VALIDATION_MESSAGE = "Datos inválidos";
const MATRIX_MISMATCH_MESSAGE = "La cantidad de variantes no coincide con la matriz de atributos";

/**
 * Inventario server actions — Módulo 2 (Inventario).
 *
 * Every mutation is admin-only, validated with the shared Zod contract and
 * wrapped in a `$transaction` where atomicity is required. On success the
 * inventory paths are revalidated so the SWR lists refresh.
 */
async function requireAdmin(): Promise<ActionResult<never> | null> {
  const session = await getSession();
  if (!session) return failure("UNAUTHORIZED", UNAUTHORIZED_MESSAGE);
  if (!isAdmin(session.user.role)) return failure("FORBIDDEN", FORBIDDEN_MESSAGE);
  return null;
}

export async function createCategory(input: CategoryCreateInput): Promise<ActionResult<Category>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR", VALIDATION_MESSAGE);
  try {
    const category = await prisma.category.create({ data: parsed.data });
    revalidatePath("/inventario");
    return success(category);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function createProduct(input: ProductCreateInput): Promise<ActionResult<Product>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR", VALIDATION_MESSAGE);
  const { attributeGroups, variants, skuTemplate, ...productData } = parsed.data;
  const combos = generateCombinations(attributeGroups);
  if (combos.length !== variants.length) {
    return failure("VALIDATION_ERROR", MATRIX_MISMATCH_MESSAGE);
  }
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: productData });
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const sku = buildSku(skuTemplate, combos[i]);
        const createdVariant = await tx.variant.create({
          data: { sku, salePrice: variant.salePrice, stock: variant.stock, productId: created.id },
        });
        await tx.variantAttribute.createMany({
          data: combos[i].map((attributeValueId) => ({
            variantId: createdVariant.id,
            attributeValueId,
          })),
        });
      }
      return created;
    });
    revalidatePath("/inventario");
    return success(product);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function updateProduct(input: ProductUpdateInput): Promise<ActionResult<Product>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR", VALIDATION_MESSAGE);
  const { id, ...data } = parsed.data;
  try {
    const product = await prisma.product.update({ where: { id }, data });
    revalidatePath("/inventario");
    return success(product);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function updateVariant(input: VariantUpdateInput): Promise<ActionResult<Variant>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  const parsed = variantUpdateSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR", VALIDATION_MESSAGE);
  const { id, ...data } = parsed.data;
  try {
    const variant = await prisma.variant.update({ where: { id }, data });
    revalidatePath("/inventario");
    return success(variant);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function softDeleteProduct(id: string): Promise<ActionResult<Product>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.variant.updateMany({ where: { productId: id }, data: { isActive: false } });
      return tx.product.update({ where: { id }, data: { isActive: false } });
    });
    revalidatePath("/inventario");
    revalidatePath("/inactivos");
    return success(product);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function softDeleteVariant(id: string): Promise<ActionResult<Variant>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  try {
    const variant = await prisma.variant.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/inventario");
    revalidatePath("/inactivos");
    return success(variant);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function reactivateProduct(id: string): Promise<ActionResult<Product>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.variant.updateMany({ where: { productId: id }, data: { isActive: true } });
      return tx.product.update({ where: { id }, data: { isActive: true } });
    });
    revalidatePath("/inventario");
    revalidatePath("/inactivos");
    return success(product);
  } catch (e) {
    return mapPrismaError(e);
  }
}

export async function reactivateVariant(id: string): Promise<ActionResult<Variant>> {
  const gate = await requireAdmin();
  if (gate) return gate;
  try {
    const variant = await prisma.variant.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/inventario");
    revalidatePath("/inactivos");
    return success(variant);
  } catch (e) {
    return mapPrismaError(e);
  }
}