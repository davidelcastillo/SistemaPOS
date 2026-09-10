"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Root providers — client boundary for NextAuth session state (App Router).
 *
 * `next-auth/react` exports no `"use client"` directive, so importing
 * `SessionProvider` directly from a Server Component layout fails with
 * "React Context is unavailable in Server Components". This wrapper is the
 * official NextAuth v4 pattern for the root layout.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}