import { NextResponse } from "next/server";

/**
 * Proxy (Next 16) — migrated from middleware.ts via the official
 * `middleware-to-proxy` codemod (HU-1.1).
 *
 * Role matrix — FASE 0 (structural shell). The access matrix is documented
 * here; role-based enforcement lands in HU-1.2 (proxy by role). HU-1.1 adds
 * the minimal session redirect: no token on a protected route -> /login.
 *
 * | Route               | Public | Cashier        | Admin |
 * |---------------------|--------|----------------|-------|
 * | /login, /api/auth/* | yes    | yes            | yes   |
 * | /ventas             | no     | yes            | yes   |
 * | /inventario         | no     | yes            | yes   |
 * | /compras (GET)      | no     | yes (read)     | yes   |
 * | /inactivos          | no     | no             | yes   |
 * | /descuentos         | no     | no             | yes   |
 * | /dashboard          | no     | no             | yes   |
 *
 * Mutations are always re-validated server-side by role (e.g. createPurchase
 * is admin-only even though cashier can read /compras).
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect every route except: NextAuth API, static assets, metadata files
     * and the public login/register pages.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|register).*)",
  ],
};