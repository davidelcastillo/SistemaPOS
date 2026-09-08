import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, failure } from "@/lib/validations/result";
import type { ActionResult } from "@/lib/validations/result";
import type { Category } from "@/generated/prisma/client";
import { whereActive } from "@/lib/inventario/queries";
import { getSession } from "@/lib/inventario/session";

const UNAUTHORIZED_MESSAGE = "Iniciá sesión para continuar";

/**
 * GET /api/inventario/categories — active categories for product forms (CM-R3).
 * Read-only for any authenticated role; soft-deleted categories never appear.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(failure("UNAUTHORIZED", UNAUTHORIZED_MESSAGE), { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: whereActive,
    orderBy: { name: "asc" },
  });

  const result: ActionResult<Category[]> = success(categories);
  return NextResponse.json(result, { status: 200 });
}