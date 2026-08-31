/**
 * Ventas server actions — Módulo 3 (Ventas/Caja). Dueño: Ventas.
 *
 * FASE 0: shell estructural, sin lógica de negocio.
 *
 * Mapa de exposición:
 * - abrir/cerrar caja, procesar venta → Server Actions ($transaction) → Vitest
 *   integración PostgreSQL
 * - búsqueda paso 1 (SWR) → GET /api/ventas/search → API tests
 * - historial filtros (SWR) → GET /api/ventas?date=&page= → API tests
 *
 * Implementación: design del módulo Ventas (HU-3.x).
 */