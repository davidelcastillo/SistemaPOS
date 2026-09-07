import { Prisma } from "@/generated/prisma/client";
import { failure } from "@/lib/validations/result";
import type { ActionResult } from "@/lib/validations/result";

const DUPLICATE_CATEGORY_MESSAGE = "Ya existe una categoría con ese nombre";
const DUPLICATE_SKU_MESSAGE = "Ya existe una variante con ese SKU";
const UNEXPECTED_ERROR_MESSAGE = "No se pudo completar la operación";

/**
 * Maps a Prisma error to the shared ActionResult failure contract.
 * P2002 on `sku` → DUPLICATE_SKU; P2002 on `name` → DUPLICATE_CATEGORY;
 * anything else → VALIDATION_ERROR.
 */
export function mapPrismaError(e: unknown): ActionResult<never> {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const rawTarget = e.meta?.target;
    const target = Array.isArray(rawTarget) ? rawTarget[0] : rawTarget;
    if (target === "sku") return failure("DUPLICATE_SKU", DUPLICATE_SKU_MESSAGE);
    if (target === "name") return failure("DUPLICATE_CATEGORY", DUPLICATE_CATEGORY_MESSAGE);
  }
  return failure("VALIDATION_ERROR", UNEXPECTED_ERROR_MESSAGE);
}