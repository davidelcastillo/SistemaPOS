/**
 * Auth server actions — Módulo 1 (Auth). Dueño: Auth.
 *
 * FASE 0: shell estructural, sin lógica de negocio.
 *
 * Mapa de exposición:
 * - `registerUser` (Server Action) → Vitest integración PostgreSQL
 * - login/logout/sesión → NextAuth `/api/auth/*` + middleware → E2E + Vitest
 *
 * Implementación: design de Auth (HU-1.1 registro/login con bcrypt + Zod).
 */