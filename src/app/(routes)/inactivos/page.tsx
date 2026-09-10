import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/inventario/session";
import { InactiveList } from "@/components/inventario/inactive-list";

/**
 * Inactivos page (SD-R3) — admin-only. Cashiers are redirected to the active
 * catalog; the route handler keeps the real gate (FORBIDDEN).
 */
export default async function InactivosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/inventario");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Productos desactivados</h1>
        <p className="mt-1 text-sm text-[#4A4A4A]">Catálogo inactivo — reactivalo para que vuelva a venderse</p>
      </div>
      <InactiveList />
    </main>
  );
}