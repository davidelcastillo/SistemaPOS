import useSWR from "swr";
import type { Category } from "@/generated/prisma/client";
import type { Paginated, ProductSummary, InactiveItem } from "@/lib/inventario/queries";
import type { ActionResult } from "@/lib/validations/result";

/**
 * Inventario client — typed fetchers + SWR hooks against the GET Route
 * Handlers (FASE-0 exposure map: reactive reads as REST, mutations as SAs).
 *
 * `unpackResult` is exported separately (pure) so the UI can unwrap any
 * `ActionResult` and so tests can exercise it without fetch.
 */
export function unpackResult<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new Error(`${result.error.code}: ${result.error.message}`);
}

async function fetchApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ActionResult<T> | null;
    if (body && !body.ok) throw new Error(`${body.error.code}: ${body.error.message}`);
    throw new Error(`HTTP ${response.status}`);
  }
  return unpackResult((await response.json()) as ActionResult<T>);
}

/** GET /api/inventario/search?q= — reactive product search (SE-R1). */
export function searchProducts(q: string): Promise<Paginated<ProductSummary>> {
  const params = new URLSearchParams({ q, page: "1", pageSize: "100" });
  return fetchApi(`/api/inventario/search?${params.toString()}`);
}

/** GET /api/inventario/categories — active categories for product forms (CM-R3). */
export function fetchCategories(): Promise<Category[]> {
  return fetchApi("/api/inventario/categories");
}

/** GET /api/inventario/inactive — soft-deleted variants, admin-only (SD-R3). */
export function fetchInactive(): Promise<Paginated<InactiveItem>> {
  return fetchApi("/api/inventario/inactive");
}

/** SWR hook — debounced search handled by the caller (SE-R2); SWR dedupes. */
export function useSearchProducts(q: string) {
  return useSWR(q.trim() ? ["search", q.trim()] : null, () => searchProducts(q.trim()));
}

/** SWR hook — catalog list for `/inventario`: full list on empty query, else search. */
export function useProductSearch(query: string) {
  const q = query.trim() === "" ? "*" : query.trim();
  return useSWR(["search", q], () => searchProducts(q));
}

/** SWR hook — category select options for the product form. */
export function useCategories() {
  return useSWR(["categories"], fetchCategories);
}

/** SWR hook — inactive variants for `/inactivos` (SD-R3). */
export function useInactive() {
  return useSWR(["inactive"], fetchInactive);
}