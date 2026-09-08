import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, failure } from "@/lib/validations/result";
import type { ActionResult } from "@/lib/validations/result";
import { searchQuerySchema } from "@/lib/inventario/schemas";
import { whereActive, paginate } from "@/lib/inventario/queries";
import type { Paginated, ProductSummary } from "@/lib/inventario/queries";
import { getSession } from "@/lib/inventario/session";

const UNAUTHORIZED_MESSAGE = "Iniciá sesión para continuar";
const VALIDATION_MESSAGE = "Datos inválidos";

/**
 * GET /api/inventario/search?q= — reactive text search (SE-R1).
 * Read-only for any authenticated role. Matches case-insensitively across
 * product name, SKU, description and category name using OR semantics.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(failure("UNAUTHORIZED", UNAUTHORIZED_MESSAGE), { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const parsed = searchQuerySchema.safeParse({
    q: sp.get("q") ?? "",
    page: sp.has("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.has("pageSize") ? Number(sp.get("pageSize")) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(failure("VALIDATION_ERROR", VALIDATION_MESSAGE), { status: 400 });
  }

  const { q, page, pageSize } = parsed.data;
  const { skip, take } = paginate(page, pageSize);
  // Empty q = full active catalog (no OR filter). Prisma `contains` is
  // literal, so no sentinel wildcard is used (fix CRITICAL-1).
  const where = q
    ? {
        ...whereActive,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { category: { name: { contains: q, mode: "insensitive" as const } } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : whereActive;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  const items: ProductSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    basePrice: row.basePrice.toString(),
    isActive: row.isActive,
    category: { id: row.category.id, name: row.category.name },
    variants: row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      salePrice: variant.salePrice.toString(),
      stock: variant.stock,
      isActive: variant.isActive,
    })),
  }));

  const result: ActionResult<Paginated<ProductSummary>> = success({ items, page, pageSize, total });
  return NextResponse.json(result, { status: 200 });
}