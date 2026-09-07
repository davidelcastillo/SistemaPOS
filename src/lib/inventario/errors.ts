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
 *
 * Target extraction must handle both Prisma 7 error shapes:
 * - classic: `meta.target` (string or string[])
 * - driver adapter (pg): `meta.driverAdapterError.cause.constraint.fields`
 */
function p2002Target(meta: Record<string, unknown> | undefined): string | undefined {
  const rawTarget = meta?.target;
  if (typeof rawTarget === "string") {
    return rawTarget;
  }
  if (Array.isArray(rawTarget) && typeof rawTarget[0] === "string") {
    return rawTarget[0];
  }
  const driverAdapterError = meta?.driverAdapterError as
    | { cause?: { constraint?: { fields?: string[] } } }
    | undefined;
  return driverAdapterError?.cause?.constraint?.fields?.[0];
}

export function mapPrismaError(e: unknown): ActionResult<never> {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = p2002Target(e.meta);
    if (target === "sku") return failure("DUPLICATE_SKU", DUPLICATE_SKU_MESSAGE);
    if (target === "name") return failure("DUPLICATE_CATEGORY", DUPLICATE_CATEGORY_MESSAGE);
  }
  return failure("VALIDATION_ERROR", UNEXPECTED_ERROR_MESSAGE);
}