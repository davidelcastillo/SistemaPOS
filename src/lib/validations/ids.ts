import { z } from "zod";

/**
 * Shared id contract — Prisma cuid() primary keys (Zod v4 top-level format).
 */
export const cuidSchema = z.cuid();

export type Cuid = z.infer<typeof cuidSchema>;