import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * NextAuth route handler (R-1): mounts the Credentials provider at
 * `/api/auth/*`. GET/POST serve the session, sign-in, sign-out and
 * CSRF endpoints. This route stays public (excluded by the proxy matcher).
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };