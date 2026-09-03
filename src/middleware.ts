import { NextResponse } from "next/server";

/**
 * Role matrix — FASE 0 (structural shell).
 *
 * Actual role validation lands in HU-1.2 (Auth design). This shell documents
 * the agreed access matrix and runs a no-op pass-through so the app builds
 * and the smoke redirect is exercised by page.tsx.
 *
 * | Route               | Public | Cashier        | Admin |
 * |---------------------|--------|----------------|-------|
 * | /login, /api/auth/* | ✅     | ✅             | ✅    |
 * | /ventas             | ❌     | ✅             | ✅    |
 * | /inventario         | ❌     | ✅             | ✅    |
 * | /compras (GET)      | ❌     | ✅ (solo leer) | ✅    |
 * | /inactivos          | ❌     | ❌             | ✅    |
 * | /descuentos         | ❌     | ❌             | ✅    |
 * | /dashboard          | ❌     | ❌             | ✅    |
 *
 * Mutations are always re-validated server-side by role (e.g. createPurchase
 * is admin-only even though cashier can read /compras).
 */
export function middleware() {
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