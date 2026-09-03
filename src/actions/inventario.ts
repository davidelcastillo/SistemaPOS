/**
 * Inventario server actions — Módulo 2 (Inventario). Dueño: Inventario.
 *
 * FASE 0: shell estructural, sin lógica de negocio.
 *
 * Mapa de exposición:
 * - CRUD categorías/productos/variantes, soft-delete, reactivar → Server Actions
 *   ($transaction) → Vitest integración PostgreSQL
 * - búsqueda debounce (SWR) → GET /api/inventario/search → API tests
 * - listado inactivos → GET /api/inventario/inactive → API tests
 *
 * Implementación: design del módulo Inventario (HU-2.x).
 */