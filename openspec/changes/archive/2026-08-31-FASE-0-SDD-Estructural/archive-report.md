# Archive Report: FASE 0 – SDD Estructural (Sistema POS)

**Change**: FASE-0-SDD-Estructural
**Project**: proyecto-pos
**Archived on**: 2026-08-31
**Archived to**: `openspec/changes/archive/2026-08-31-FASE-0-SDD-Estructural/`
**Artifact store**: hybrid (openspec/ + Engram)
**Intent**: Intentional archive with documented fail — user-selected.

---

## 1. Resumen

La Fase 0 (SDD Estructural) establece las bases arquitectónicas del Sistema POS: estructura por módulo (route groups + propiedad de archivos), tooling base (Playwright, coverage Vitest 80%, lint docs limpio), modelo relacional Prisma macro completo (17 modelos, 5 enums) sin migración, contrato de datos tipado Zod compartido con `ActionResult<T>`, y mapa de exposición SA/GET por módulo. El ciclo SDD se cierra tras implementación completa (21/21), verificación con envelope fail válido y esta archival con fail documentado.

## 2. Estado final (a cierre)

Estado reportado en el momento del archivo; ver jerarquía de autoridad abajo.

| Área | Estado final |
|------|--------------|
| Tareas | 21/21 completadas (persisted tasks artifact, verificadas en archive) |
| Build | `npx tsc --noEmit` exit 0, 0 errores |
| Lint | `npm run lint` exit 0, 0 errores (`docs/` NO ignorado, spec R-4) |
| Tests | `npm test` 21 passed (3 files), exit 0; coverage v8 100% (superficie medida) |
| Prisma | `npx prisma validate` OK (17 modelos, 5 enums); sin migración creada |
| E2E smoke | scenario A passed (redirect `/login`), scenario B `test.skip` → Auth |
| Verificación | 27/27 requisitos con evidencia; 22/35 scenarios COMPLIANT; 13 PARTIAL (diferidos) |
| Envelope verify | `verdict: fail` válido (0 CRITICAL, 0 blockers) — archivo intencional con fail documentado |
| PRs | Cadena feature-branch-chain de 5 PRs (PR #1 tracker DRAFT + PR #2–#5 OPEN), URLs en apply-progress |

## 3. Fail documentado (intencional)

La verificación produjo un envelope canónico **`fail`** válido (referencia verify-report obs. #260):

- `requirements: 27/27` con evidencia.
- `scenarios: 22/35` COMPLIANT; **13 PARTIAL** — diferidos por **scope de Fase 0**, todos con evidencia estática de estructura/contrato/mapa.
- `critical_findings: 0`, `blockers: 0`.

**Justificación del fail (aceptado por el usuario con "Archivar con fail documentado")**: los 13 scenarios PARTIAL corresponden a bordes y enforcement cuyo diseño/implementación pertenece a los ciclos de módulo posteriores (Auth HU-1.1/HU-1.2, y HU 2.x–6.x). La Fase 0 materializa solo la base estructural y deja la lógica de negocio funcional a esos ciclos. Por lo tanto, el fail es esperado y no bloqueante dentro del scope de Fase 0: no hay CRITICALs, no hay blockers, y las verificaciones gate (test/lint/tsc/prisma validate/e2e smoke A) están verdes. El cierre se efectúa dejando trazabilidad del fail y su justificación para los siguientes ciclos.

Detalle de los 13 PARTIAL (todos con evidencia estática):
1. BC R-2 S2 (usuario autenticado → /dashboard) — `test.skip`, se activa en Auth E2E (design D9).
2. BC R-3 S1 (cobertura < umbral falla) — config evidenciada, no demostrable sin romper suite.
3. DC R-1 S2 (schema de módulo en `lib/<modulo>/schemas.ts`) — diferido a módulos.
4. DC R-4 (estados vacíos — lista-vacía a nivel query) — mecanismo probado, query diferida.
5. DC R-5 (stock insuficiente — operación) — borde `STOCK_INSUFFICIENT` probado, operación diferida.
6. DC R-6 S1 (SKU duplicado — rechazo) — borde `DUPLICATE_SKU` probado, rechazo diferido.
7. DC R-6 S2 (filtro `is_active`) — política documentada, query diferida.
8. ME R-1 S1 (mutación transaccional) — mapa + shells comment-only, implementación con módulos.
9. ME R-1 S2 (lectura reactiva GET) — mapa documentado, handlers con módulos.
10. ME R-2 (Dashboard KPIs GET + voidSale SA) — mapa documentado.
11. ME R-3 (cashier intenta escribir compra) — matriz middleware + mapa, enforcement HU-4.x.
12. ME R-4 S1 (integración de Server Action) — política documentada.
13. ME R-4 S2 (API test de Route Handler) — política documentada.

## 4. Especificaciones promovidas (delta → baseline)

Las 5 specs delta (New, greenfield) son specs completas y se promovieron a `openspec/specs/{domain}/spec.md` por copia mecánica con readback `diff` vacío:

| Domain | Spec baseline |
|--------|---------------|
| `base-config` | `openspec/specs/base-config/spec.md` (R-1..R-5) |
| `data-contract` | `openspec/specs/data-contract/spec.md` (R-1..R-6) |
| `data-model` | `openspec/specs/data-model/spec.md` (R-1..R-6) |
| `module-exposure` | `openspec/specs/module-exposure/spec.md` (R-1..R-5) |
| `project-structure` | `openspec/specs/project-structure/spec.md` (R-1..R-5) |

## 5. Observaciones Engram leídas (traceability)

- #258 pre-flight SDD Fase 0 + chain_strategy feature-branch-chain
- #254 `sdd/FASE-0-SDD-Estructural/proposal`
- #257 `sdd/FASE-0-SDD-Estructural/tasks`
- #255 `sdd/FASE-0-SDD-Estructural/spec`
- #256 `sdd/FASE-0-SDD-Estructural/design`
- #259 `sdd/FASE-0-SDD-Estructural/apply-progress`
- #260 `sdd/FASE-0-SDD-Estructural/verify-report`
- #253 `sdd/FASE-0-SDD-Estructural/explore`

Artifact Engram persistiendo en archive: `sdd/FASE-0-SDD-Estructural/archive-report`.

**Native Review Receipt Gate**: `reviewGate` estructuralmente ausente — kill switch off / sin review descubierto para este candidate. Archive procede bajo política ordinaria; no se requiere receipt.

## 6. Cadena de PRs (feature-branch-chain)

| PR | Rama head | Rama base | Estado |
|----|-----------|-----------|--------|
| #1 | feat/fase-0-sdd-estructural (tracker) | main | DRAFT (sin merge hasta integrar hijos) |
| #2 | feat/fase0/pr1-base-config | tracker | OPEN |
| #3 | feat/fase0/pr2-structure | PR1 branch | OPEN |
| #4 | feat/fase0/pr3-contract | PR2 branch | OPEN |
| #5 | feat/fase0/pr4-data-model | PR3 branch | OPEN |

## 7. Desviaciones documentadas (desde apply-progress #259)

1. `middleware.ts` (Next 16 deprecado): se implementó según contrato; Auth debe decidir migrar a `proxy.ts` (codemod `middleware-to-proxy`).
2. Lint: 11 errores (no 4) corregidos — fences y label refs en design/tasks.
3. Vitest v4 removió `coverage.all`; se omitió `include` para medir solo importados (estrategia progresiva).
4. Vitest: `e2e/**` agregado a `test.exclude`.
5. `eslint.config.mjs` ignora generados + AGENTS.md raíz; `docs/` NO ignorado.
6. **17 modelos (no 16)**: schema autoritativo del design define 17; prosa corregida en apply.
7. Playwright webServer sigue redirects (`/` → 307 → `/login`); timeout 300s.

## 8. Pendientes para la siguiente fase (Auth / HU planning)

WARNINGs que apuntan a Auth (HU-1.1 / HU-1.2) y próximos ciclos:
1. `.env` sin `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — requerido antes de HU-1.1 (sesión real).
2. Decidir migración `middleware.ts` → `proxy.ts` (Next 16 nativo) junto con validación real de roles.
3. Migración inicial Prisma: materializar el schema completo (17 modelos) en UNA migración `init` en Auth (spec DM R-6); NO staged.
4. Validar NextAuth v4 + Next 16 edge runtime (`getServerSession` + middleware) en Auth design.
5. Coverage 80% progresivo por módulo: cada módulo suma tests de integración/API (plan en `docs/mapa-exposicion.md`).
6. La spec de Auth debe reflejar la decisión cashier-lectura en `/compras` (ajusta texto de HU-1.2).

## 9. Próximo cambio recomendado

Planificar **Fase 1 / primera HU (Auth: HU-1.1 + HU-1.2)** desde `docs/HU-proyectoPOS.md`, resolviendo los pendientes de la sección 8.

## 10. Reglas de archive aplicadas

- Sync delta specs a baseline ANTES de mover (hecho).
- Archival MECÁNICA con `diff -r` vacío (mandatory readback, incluido en el resultado).
- `archive-report.md` es aditivo y excluido de la comparación source/destino.
- `reviewGate` ausente → sin gate de receipt que bloquee.
- Sin CRITICALs en verify-report → sin bloqueo de archive.
- Cambio movido con prefijo ISO `2026-08-31`.
- Cierre intencional con fail documentado (user override explícito).
