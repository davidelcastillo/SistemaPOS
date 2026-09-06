import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next 16) — migrated from middleware.ts via the official
 * `middleware-to-proxy` codemod. Runs on the Node.js runtime (default), so
 * `getToken`/Prisma work without edge workarounds.
 *
 * HU-1.1 (minimal behavior): a protected route without a session token is
 * redirected to `/login`. The role matrix is HU-1.2 — `token.role` is the
 * extension point for role-based branching.
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
export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

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