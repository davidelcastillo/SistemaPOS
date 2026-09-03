import { z } from "zod";

/**
 * Shared pagination contract — defaults and bounds used by SWR list endpoints.
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export type PaginationInput = z.infer<typeof paginationSchema>;