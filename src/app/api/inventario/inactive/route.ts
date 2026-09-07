import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, failure } from "@/lib/validations/result";
import type { ActionResult } from "@/lib/validations/result";
import type { Paginated, InactiveItem } from "@/lib/inventario/queries";
import { getSession, isAdmin } from "@/lib/inventario/session";

const UNAUTHORIZED_MESSAGE = "Iniciá sesión para continuar";
const FORBIDDEN_MESSAGE = "No tenés permisos para realizar esta acción";

/**
 * GET /api/inventario/inactive — soft-deleted variants for the `/inactivos`
 * page (SD-R3). Admin-only; feeds the reactivation flow.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(failure("UNAUTHORIZED", UNAUTHORIZED_MESSAGE), { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(failure("FORBIDDEN", FORBIDDEN_MESSAGE), { status: 403 });
  }

  const rows = await prisma.variant.findMany({
    where: { isActive: false },
    include: { product: { include: { category: true } } },
    orderBy: { sku: "asc" },
  });

  const items: InactiveItem[] = rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    stock: row.stock,
    salePrice: row.salePrice.toString(),
    isActive: row.isActive,
    productId: row.productId,
    productName: row.product.name,
    categoryName: row.product.category.name,
  }));

  const result: ActionResult<Paginated<InactiveItem>> = success({
    items,
    page: 1,
    pageSize: items.length,
    total: items.length,
  });
  return NextResponse.json(result, { status: 200 });
}