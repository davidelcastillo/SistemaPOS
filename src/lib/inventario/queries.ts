/**
 * Active-query builders shared by Server Actions and GET Route Handlers.
 * Every active catalog/list query must spread `whereActive` so soft-deleted
 * rows never surface in active results (SD-R1/R2).
 */

export const whereActive = { isActive: true } as const;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function paginate(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export interface VariantSummary {
  id: string;
  sku: string;
  salePrice: string;
  stock: number;
  isActive: boolean;
}

export interface ProductSummary {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  isActive: boolean;
  category: { id: string; name: string };
  variants: VariantSummary[];
}

export interface InactiveItem {
  id: string;
  sku: string;
  stock: number;
  salePrice: string;
  isActive: boolean;
  productId: string;
  productName: string;
  categoryName: string;
}