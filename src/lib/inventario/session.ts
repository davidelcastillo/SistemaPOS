import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Session boundary for the inventario module.
 *
 * DEVIATION from design.md: design assumes `auth()` exists in `src/lib/auth.ts`,
 * but HU-1.1 is still pending (the file only exports `authOptions` and it is
 * read-only for this module). This wrapper keeps the module compilable today and
 * becomes a one-line swap (`return auth()`) once David lands HU-1.1.
 *
 * `isAdmin` normalizes case because the DB `Role` enum is `ADMIN|CASHIER` while
 * the next-auth augmentation in `src/types/next-auth.d.ts` declares
 * `"admin"|"cashier"` — the runtime value is decided by HU-1.1.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

export function isAdmin(role: string): boolean {
  return role.toLowerCase() === "admin";
}