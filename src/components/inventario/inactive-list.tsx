"use client";

import { useInactive } from "@/lib/inventario/client";
import { InactiveTable } from "@/components/inventario/inactive-table";

/**
 * Client `/inactivos` workspace: SWR fetch of soft-deleted variants (SD-R3)
 * with the admin-only reactivation flow (SD-R4).
 */
export function InactiveList() {
  const { data, error, isLoading, mutate } = useInactive();

  if (isLoading) {
    return (
      <div data-testid="inactive-table-loading" className="space-y-2" role="status" aria-label="Cargando inactivos">
        {[0, 1].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-[2px] bg-[#4A4A4A]/10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-[2px] border border-[#C0392B] bg-[#C0392B]/5 px-4 py-3 text-sm text-[#C0392B]">
        {error.message}
      </div>
    );
  }

  return <InactiveTable items={data?.items ?? []} onReactivated={mutate} />;
}