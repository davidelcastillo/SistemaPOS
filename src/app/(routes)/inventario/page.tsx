import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/inventario/session";
import { InventoryList } from "@/components/inventario/inventory-list";

/**
 * Inventario page (Módulo 2) — active catalog with reactive search (SE-R1/R2)
 * and role-gated UI (SD-R3: "Ver Desactivados" navigates to `/inactivos`).
 * Read-only for cashiers: mutation buttons render only for admins; the real
 * gate lives server-side in every SA/RH.
 */
export default async function InventarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const admin = isAdmin(session.user.role);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Inventario</h1>
        <p className="mt-1 text-sm text-[#4A4A4A]">Catálogo de productos activos</p>
      </div>
      <InventoryList isAdmin={admin} />
    </main>
  );
}