/**
 * Dashboard server actions — Módulo 6 (Dashboard). Dueño: Dashboard.
 *
 * FASE 0: shell estructural, sin lógica de negocio.
 *
 * Mapa de exposición:
 * - `voidSale` (Server Action, SOLO admin — reversión atómica) → Vitest
 *   integración PostgreSQL
 * - KPIs (SWR) → GET /api/dashboard/kpis?from=&to= → API tests
 * - reimpresión ticket 80mm → GET /api/dashboard/tickets/[id]/print (PDF) →
 *   API tests
 *
 * Implementación: design del módulo Dashboard (HU-6.x).
 */