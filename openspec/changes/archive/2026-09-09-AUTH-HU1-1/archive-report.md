# Archive Report — AUTH-HU1-1 — Autenticación y manejo de credenciales (HU-1.1)

**Change**: `AUTH-HU1-1` (Módulo 1 Auth, HU-1.1)
**Fecha de archivo**: 2026-09-09
**Archivado en**: `openspec/changes/archive/2026-09-09-AUTH-HU1-1/`
**Rama de trabajo**: `feat/auth-hu1-1-pr6-frontend-cierre`
**Modo de store**: hybrid (openspec + engram)
**Veredicto canónico**: `pass_with_warnings` — 0 blockers, 0 critical findings

## Intent

Implementar la autenticación fundacional del POS con NextAuth v4 sobre Next.js 16: Credentials Provider con `authorize` (bcrypt salt 10 + Prisma), JWT/sesión con `role` (`admin`/`cashier`), Server Action `registerUser` (solo admin), UI `/login` reactiva, migración `init` de Prisma (17 modelos), seed del primer admin y migración `middleware.ts` → `proxy.ts`. Destraba M3/M4/M6 y la migración del compañero (M2). HU-1.2 (matriz por rol en proxy) queda fuera de este cambio.

## Estado final (al cierre, no al verificar)

Los hechos siguientes provienen del estado final del cambio (tasks persistidas + hechos finales del orquestador) y prevalecen sobre cualquier snapshot intermedio:

- **Requisitos**: 11/11 completos, **escenarios**: 31/31 compliant (auth R-1..R-7, base-config R-6/R-7, module-exposure R-2, project-structure R-4).
- **Tasks**: 32/32 marcadas (`tasks.md`: 21 backend + F1–F11 frontend, todas `[x]`). Sin reconciliación excepcional: el artefacto persistido ya reflejaba el estado final.
- **Tests**: `npm test` 184/184 en 25 archivos (43 del cambio + ~136 de inventario del compañero + 5 de Fase 0), exit 0.
- **E2E**: `npx playwright test` 8 passed / 1 skipped. El skip es `e2e/inventario-admin.spec.ts:33` (del compañero, `test.skip` documentado) — no pertenece al cambio.
- **Coverage** (v8): 91.87 stmts / 91.32 branch / 82.69 funcs / 92.4 lines — sobre el umbral 80 del DoD.
- **Gates**: `tsc --noEmit` 0 errores, `lint` 0, `build` exit 0 (`ƒ Proxy (Middleware)`, sin warnings de deprecación), `prisma validate` OK, `migrate status` sin drift (1 migración `20260906194453_init`), seed idempotente re-ejecutado (`already exists, skipping`).
- **Warnings W1/W2/W3**: los tres corregidos. W1 (delta base-config `proxyConfig` → `export const config`, 2 menciones) y W2 (`docs/mapa-exposicion.md` `middleware` → `proxy.ts`) se corrigieron en el flujo frontend (PR #12, commits verificados). W3 se corrigió en esta fase de archive (ver abajo).
- **Sugerencias abiertas no bloqueantes** (heredadas del verify, para chores futuros): S1 (test mal nombrado en `authenticate.test.ts:74`), S2 (sin tabla consolidada TDD en apply-progress), S4 (rama sin ejercicio en `src/lib/auth.ts` L25), S5 (bloque `nextjs-agent-rules` regenerado por `next dev`), S6 (`NEXT_PUBLIC_APP_ENV` ausente del `.env`, fuera del alcance de HU-1.1).
- **Cadena de PRs #6–#12 sin mergear** (feature-branch-chain sobre `feat/auth-hu1-1-pr6-frontend-cierre`; PR #6 tracker con base `main`, a retargetear a `develop` al merge).

## Specs promovidas a baseline

| Dominio | Acción | Detalle |
|---|---|---|
| `auth` | Creada (`openspec/specs/auth/spec.md`) | Nueva capability: R-1..R-7 (provider + route handler, authorize Zod→BD→bcrypt, JWT/sesión con role, registerUser solo admin, UI /login, migración init, seed). Copia mecánica byte-idéntica del delta (`diff -r` exit 0, sin salida). |
| `base-config` | Actualizada | ADDED R-6 (`.env` con `NEXTAUTH_URL`/`NEXTAUTH_SECRET`) y R-7 (rename `middleware.ts` → `proxy.ts` con `export const config`). R-1..R-5 preservados byte por byte (ver `git diff`: solo hunk de append). |
| `project-structure` | Actualizada | MODIFIED R-4 (hot files `middleware.ts` → `proxy.ts`, +2 scenarios, nota `Previously`). R-1/R-2/R-3/R-5 preservados. Incluye la corrección W3. |
| `module-exposure` | Actualizada | MODIFIED R-2 (Auth por `/api/auth/*` + SA `registerUser` + `proxy.ts`, +2 scenarios, nota `Previously`). R-1/R-3/R-4/R-5 preservados. |
| `data-model`, `data-contract` | No tocadas | Sin delta en este cambio (`git diff` limpio en ambas). Restricción colaborativa respetada. |

Composición ejecutada con el comando nativo `gentle-ai sdd-archive-compose` (exit 0 en los 3 dominios con baseline existente). Los archivos instalados conservan la convención CRLF del worktree, sin BOM.

## W3 corregido (evidencia)

Hallazgo W3 del verify consolidado: `specs/project-structure/spec.md:21` decía "AND `proxyConfig` mantiene la matriz de rutas vigente" cuando la realidad (design §1 + codemod + `src/proxy.ts:41`) es `export const config`.

- Corrección aplicada en el delta **antes** de promover y de mover a archive: `proxyConfig` → ``export const config`` (1 línea, sin tocar `src/proxy.ts`).
- Confirmado en el baseline promovido: `openspec/specs/project-structure/spec.md`, scenario "Modificación de archivo caliente" — "AND `export const config` mantiene la matriz de rutas vigente".
- La mención restante de `proxyConfig` en el delta `base-config` (R-7) es una aclaración negativa intencional ("el codemod NO lo renombra a `proxyConfig` — ver design §1"), idéntica al design. No es normativa y se conserva a propósito.

## Descubrimiento técnico: `sdd-archive-compose` no tolera CRLF (registrado para futuros archives)

Durante esta fase, el comando nativo rechazó los tres deltas con `DELTA: delta spec declares no ADDED, MODIFIED, REMOVED, or RENAMED requirements`. Bisectado con pruebas aisladas en TEMP: el formato del proyecto (`## ADDED/MODIFIED Requirements` + `### Requirement:`) **sí** es reconocido; la causa es que los archivos del repo usan finales CRLF (checkout Windows, `core.autocrlf=true`) y el parser no reconoce las cabeceras de sección con `\r`.

Adaptación aplicada (documentada, sin merge manual del modelo): normalización LF solo en copias TEMP → composición nativa (exit 0, única evidencia aceptada) → instalación con retorno a CRLF sin BOM vía shell → `git diff` confirma hunks exclusivamente del delta. **No** se usó merge Read/Edit del modelo. Los futuros archives en checkouts CRLF deben repetir la normalización o corregir el parser.

Efectos colaterales byte-nivel, visibles y auditables en `git diff` (no silenciosos): el output del composer no inserta línea en blanco entre el último scenario previo y el `### Requirement` anexado, y agrega newline final donde el baseline no lo tenía. Se conserva el output nativo sin retocarlo para no romper la cadena de evidencia.

## Readback mecánico (evidencia verbatim)

- Copia `auth` (nueva capability): `diff -r delta destino` → sin salida, exit 0.
- Move a archive (`git mv` + snapshot previo + `diff -r` snapshot vs destino) → sin salida, exit 0. Fuente ausente tras el move. Snapshot TEMP eliminado tras el readback.
- Diffs de composición verificados por `git diff`: solo hunks del delta en los 3 dominios (ver sección Specs promovidas).

## Aviso de coordinación al compañero (inventario)

El merge con `origin/develop` ya está integrado en la rama; no se revirtió ni modificó nada de inventario/descuentos ni `e2e/inventario-admin.spec.ts`. Al mergear, coordinar:

1. **Migración canónica**: `20260906194453_init` (17 modelos, dueño David) es la migración base aplicada y sin drift. Nuevas migraciones del compañero deben encadenarse sobre ella, nunca reeditarla.
2. **Contrato de sesión compartido**: `src/lib/auth.ts` (callbacks JWT/sesión con `id`+`role`), `src/types/next-auth.d.ts` (aumentación) y `src/lib/validations/` (`result.ts` + `DUPLICATE_EMAIL`, `auth.ts` + `loginSchema`) son superficie compartida: cambios solo con coordinación. Incluye el swap de `session.ts` pendiente de acordar.
3. **`.env`**: requiere `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (generado con `crypto.randomBytes(32)`, base64, 44 chars). Gitignoreado, no versionar; sin secret válido NextAuth emite `[NO_SECRET]` y no firma JWT (probado con harness aislado en verify).

## Qué queda pendiente para el merge (fuera del alcance de archive)

- Retarget de la cadena PRs #6–#12 a `develop` + revisión del compañero con receipt (condición del DoD para merge).
- `docs/auth.md` creado/actualizado como parte del DoD documental (ver apply-progress F9).
- Commit de este archive (renames + baselines + este reporte) — decisión de entrega del orquestador/repo policy, no de esta fase.

## Contenido del archive

`openspec/changes/archive/2026-09-09-AUTH-HU1-1/`: `proposal.md`, `exploration.md`, `design.md`, `tasks.md` (32/32), `apply-progress.md`, `verify-report.md` (canónico `pass_with_warnings`), `specs/auth|base-config|project-structure|module-exposure/spec.md`, `archive-report.md` (este archivo, aditivo post-move y excluido del readback).

## Trazabilidad

Artefactos leídos del filesystem (hybrid; el change se operó sobre openspec, sin topics Engram previos — `mem_search` "AUTH-HU1-1" sin resultados): todas las rutas bajo `openspec/changes/AUTH-HU1-1/` (exploration, proposal, design, tasks, apply-progress, verify-report, 4 deltas), baselines `openspec/specs/{project-structure,base-config,module-exposure,data-model,data-contract}/spec.md`, `src/proxy.ts:41` (`export const config`), y el archive previo `2026-08-31-FASE-0-SDD-Estructural` como referencia de convención. Este reporte se persiste además en Engram (`sdd/AUTH-HU1-1/archive-report`).
