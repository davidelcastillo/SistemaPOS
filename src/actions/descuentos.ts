/**
 * Descuentos server actions — Módulo 5 (Descuentos). Dueño: Descuentos.
 *
 * FASE 0: shell estructural, sin lógica de negocio.
 *
 * Mapa de exposición:
 * - CRUD + switch `is_active` → Server Actions → Vitest integración PostgreSQL
 * - motor de cálculo (puro) → src/lib/descuentos/engine.ts → Vitest unit
 * - listado reglas (SWR) → GET /api/descuentos → API tests
 *
 * Implementación: design del módulo Descuentos (HU-5.x).
 */