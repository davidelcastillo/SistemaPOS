import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/**
 * Root page — redirect by session state.
 *
 * Authenticated users land on /dashboard; unauthenticated visitors are sent
 * to /login. In Fase 0 no credentials validate (authorize → null), so the
 * unauthenticated branch is the one exercised by the smoke test.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  redirect(session ? "/dashboard" : "/login");
}