```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f1dac4fa541c07fc6470620bdb0bd35fc416ed3baa1fc0edc7bc132ea0e251bb
verdict: fail
blockers: 0
critical_findings: 0
requirements: 6/11
scenarios: 22/31
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:faa105bf00f34811993686e26c41bf2876d893222d184f20450d8058217185d1
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:2a93b384b06c22209d3d076f4d98b0a576dfc94ed1ce56a054dee88b2309e706
```

## Verification Report — AUTH-HU1-1 (flujo backend)

**Change**: `AUTH-HU1-1` — Autenticación y manejo de credenciales (HU-1.1), flujo backend (1º de 2)
**Versión de spec**: N/A (sin versionado de specs)
**Modo**: Strict TDD (runner: `npm test` / Vitest 4.1.11)
**Rama verificada**: `feat/auth-hu1-1-pr4-entorno` (árbol limpio al inicio y al cierre)
**Revisión de evidencia**: `evidence_revision` = identidad del árbol candidato del intento `backend-verify` (ledger `sdd-attempt`, ordinal 2, token `sha256:c7ac5072…`); los hashes de test/build corresponden a las re-ejecuciones propias de esta verificación.

### Completeness
| Métrica | Valor |
|---|---|
| Tareas totales | 21 |
| Tareas completas | 21 |
| Tareas incompletas | 0 |

Confirmado contra `tasks.md` (21/21 `[x]`), `apply-progress.md`, topic Engram `sdd/AUTH-HU1-1/apply-progress` (obs #344, sin drift de contenido) y estado nativo (`taskProgress.allComplete: true`, `verify: ready`, sin `blockedReasons`).

### Ejecución de build y tests (independiente, re-ejecutada en esta fase)
**Build**: ✅ `npm run build` → exit 0, `✓ Compiled successfully`, ruta `ƒ Proxy (Middleware)`, cero warnings de deprecación middleware/proxy.

**Tests**: ✅ `npm test` (`vitest run`) → exit 0, **43/43 tests en 7 archivos**.
```text
Test Files  7 passed (7)
     Tests  43 passed (43)
Duration  38.74s (integración contra PostgreSQL Docker `mi-postgres` :5433)
```

**Coverage** (v8, incluido por defecto en la corrida): All files **96.15% stmts / 87.5% branch / 88.88% funcs / 95.91% lines** → ✅ sobre el umbral 80/80/80/80 configurado en `vitest.config.mts` (`thresholds`). Umbral del DoD (mapa de exposición): ≥80% sobre superficie probada → ✅.

**Resto de gates re-ejecutados**:
| Gate | Comando | Exit | Resultado |
|---|---|---|---|
| Tipos | `npx tsc --noEmit` | 0 | sin errores |
| Linter | `npm run lint` | 0 | sin errores |
| Schema | `npx prisma validate` | 0 | `The schema at prisma\schema.prisma is valid` |
| Migraciones | `npx prisma migrate status` | 0 | `Database schema is up to date!` (1 migración `20260906194453_init`, sin drift) |
| Seed idempotencia | `npx prisma db seed` | 0 | `Seed: admin admin@pos.com already exists, skipping.` |
| Smoke runtime | `npm run dev` + curl/HTTP | — | ver sección "Evidencia runtime" |

### Evidencia runtime (ejecutada por verify, no tomada del apply)
- **Route handler (R-1)**: `GET /api/auth/session` → 200 con `{}` sin sesión y 200 con usuario autenticado. `/login` público → 200.
- **Credenciales a nivel HTTP**: `POST /api/auth/callback/credentials` (con CSRF de `/api/auth/csrf`): contraseña incorrecta → **401** y sesión permanece `{}`; credenciales válidas (`admin@pos.com`) → **200** y `GET /api/auth/session` retorna `{"user":{"email":"admin@pos.com","id":"cmtq835q5…","role":"admin"}}` → **JWT firmado con `NEXTAUTH_SECRET` y sesión con `id`+`role` consumible** (R-2/R-3, base-config R-6).
- **Proxy (base-config R-7)**: `GET /dashboard` sin sesión → **307** con `Location: http://localhost:3000/login`; con cookie de sesión → **200**. `POST /api/auth/signout` → 302 y sesión vuelve a `{}` (login/logout por route handler — module-exposure).
- **BD runtime (`mi-postgres`, BD `postgres`)**: tabla `users` con exactamente **1 fila**: `admin@pos.com`, `role=admin`, hash con prefijo **`$2b$10$`** (bcrypt cost 10 verificado a nivel BD) y longitud 60. Esquema `public` con **17 tablas de modelos** + `_prisma_migrations` (18 tablas totales) → R-6 (17 modelos) y R-7.
- **Cadencia de PRs**: `gh pr list` confirma #6 (tracker, draft, base `main`), #7 (base `feat/auth-hu1-1`), #8 (base PR1), #9 (base PR2), #10 (base PR3, actual) — sin merges; coincide con apply-progress.

### Matriz de cumplimiento de specs (11 requisitos / 31 escenarios)
Leyenda: ✅ COMPLIANT (test/evidencia runtime pasó) · ⚠️ PARTIAL · ❌ UNTESTED (diferido documentado).

**specs/auth/spec.md (R-1..R-7 — 20 escenarios)**

| Req | Escenario | Test / Evidencia | Resultado |
|---|---|---|---|
| R-1 | Route handler responde | smoke HTTP: `GET /api/auth/session` → 200 (`{}`/usuario) | ✅ COMPLIANT |
| R-1 | Provider credentials registrado | `src/lib/auth.test.ts` > `registers the credentials provider with an authorize function` | ✅ COMPLIANT |
| R-2 | Credenciales válidas | `src/lib/auth/authenticate.test.ts` > `returns the user with id and role for valid credentials` (+ HTTP login 200) | ✅ COMPLIANT |
| R-2 | Contraseña incorrecta | `authenticate.test.ts` > `returns null for a wrong password` (+ HTTP 401, sesión `{}`) | ✅ COMPLIANT |
| R-2 | Usuario inexistente | `authenticate.test.ts` > `returns null for a missing email without revealing existence` | ✅ COMPLIANT |
| R-2 | Payload inválido (Zod) | `authenticate.test.ts` > `rejects an invalid payload via Zod before touching the database` + `src/lib/auth.test.ts` > `returns null from authorize for an invalid payload` | ✅ COMPLIANT |
| R-3 | Role admin en token y sesión | `src/lib/auth.test.ts` > `stores id and role in the token…` + `exposes id and role on the session…` (+ HTTP session `role:"admin"`) | ✅ COMPLIANT |
| R-3 | Role cashier en token y sesión | `authenticate.test.ts` > caso cashier (`role === "cashier"`) + `auth.test.ts` > `keeps the existing role on later token refreshes` | ✅ COMPLIANT |
| R-4 | Admin crea usuario | `src/actions/auth.test.ts` > `creates a user when an admin invokes it with valid data` (+ `bcrypt.compare` sobre el hash almacenado) | ✅ COMPLIANT |
| R-4 | Cashier intenta registrar | `actions/auth.test.ts` > `rejects a cashier with FORBIDDEN without touching the database` (verifica fila inexistente en BD) | ✅ COMPLIANT |
| R-4 | Usuario no autenticado | `actions/auth.test.ts` > `rejects an unauthenticated caller with UNAUTHORIZED` (rechazo previo a cualquier acceso a BD por orden del código) | ✅ COMPLIANT |
| R-4 | Email duplicado | `actions/auth.test.ts` > `rejects a duplicate email with DUPLICATE_EMAIL` (P2002) | ✅ COMPLIANT |
| R-4 | Datos inválidos (Zod) | `actions/auth.test.ts` > `rejects invalid data with VALIDATION_ERROR before touching the database` | ✅ COMPLIANT |
| R-5 | Login exitoso (UI) | (ninguno) — UI `/login` es placeholder Fase 0; pertenece al flujo frontend | ❌ UNTESTED (diferido FE) |
| R-5 | Credenciales inválidas en UI | (ninguno) — diferido FE | ❌ UNTESTED (diferido FE) |
| R-5 | Errores de validación de campos | (ninguno) — diferido FE (el contrato Zod ya está probado server-side) | ❌ UNTESTED (diferido FE) |
| R-6 | Migración aplicada | `npx prisma validate` + BD runtime: 17 tablas de modelos | ✅ COMPLIANT |
| R-6 | Sin drift tras aplicar | `npx prisma migrate status` → `Database schema is up to date!` | ✅ COMPLIANT |
| R-7 | Seed crea el primer admin | BD runtime: 1 usuario `admin@pos.com`, `role=admin`, hash `$2b$10$` | ✅ COMPLIANT |
| R-7 | Seed idempotente | `npx prisma db seed` re-ejecutado → `already exists, skipping` + `count=1` | ✅ COMPLIANT |

**specs/base-config/spec.md (deltas — 5 escenarios)**

| Req | Escenario | Test / Evidencia | Resultado |
|---|---|---|---|
| R-6 (.env) | Entorno con secret válido | HTTP: login de credenciales 200 → JWT firmado y sesión válida con `id`+`role`; build sin errores | ✅ COMPLIANT |
| R-6 (.env) | Secret ausente o débil | No ejecutable sin mutar el `.env` compartido (el loader de Next re-carga el valor; v4 no advierte por secret corto en dev). Higiene estática: `.env` gitignoreado (`.gitignore:36`), sin secret hardcodeado en `src/`/`prisma/` | ❌ UNTESTED (diferido, ver S3) |
| R-7 (proxy) | Rename sin regresión | `src/proxy.ts` existe con `proxy()`; `src/middleware.ts` inexistente. Nota: se conserva `export const config` (NO `proxyConfig`) — desvío decidido en design §1 | ⚠️ PARTIAL |
| R-7 (proxy) | Runtime Node habilitado | build `ƒ Proxy (Middleware)` sin warning de deprecación; proxy funciona en runtime (redirect + login passthrough) | ✅ COMPLIANT |
| R-7 (proxy) | Comportamiento de redirect preservado | curl: `/dashboard` sin sesión → 307 → `http://localhost:3000/login`; con sesión → 200 | ✅ COMPLIANT |

**specs/module-exposure/spec.md (delta R-2 — 3 escenarios)**

| Req | Escenario | Test / Evidencia | Resultado |
|---|---|---|---|
| R-2 (mapa) | Dashboard | Módulo dashboard (M6) no existe en este cambio; es declaración del mapa para un cambio futuro | ❌ UNTESTED (diferido M6) |
| R-2 (mapa) | Login/logout de Auth | HTTP: login 200 + `signout` 302 → sesión `{}`; evaluación de ruta protegida en `src/proxy.ts` | ✅ COMPLIANT |
| R-2 (mapa) | Registro de Auth | `src/actions/auth.test.ts` (5 casos) — SA `registerUser`, rol admin validado server-side | ✅ COMPLIANT |

**specs/project-structure/spec.md (delta R-4 — 3 escenarios)**

| Req | Escenario | Test / Evidencia | Resultado |
|---|---|---|---|
| R-4 (estructura) | Helper usado por dos módulos | Política estructural; este cambio no crea helpers transversales (solo `src/lib/validations/*` compartidos ya coordinados) | ❌ UNTESTED (diferido, política) |
| R-4 (estructura) | Modificación de archivo caliente | Proceso: hot files tocados con avisos registrados en tasks/apply-progress y cadena de PRs #6-#10; matcher vigente preservado en `export const config` | ⚠️ PARTIAL |
| R-4 (estructura) | Auth como módulo con lógica propia | Estático: `src/lib/auth.ts` completado por el dueño (commits propios); sin ediciones de módulos ajenos | ⚠️ PARTIAL |

**Resumen de cumplimiento**: 22/31 escenarios compliant · 3 PARTIAL (evidencia estática/de proceso o desvío documentado) · 6 UNTESTED diferidos (3 al flujo frontend, 1 a M6, 1 política estructural, 1 camino negativo de env). Requisitos completos: 6/11 (R-1, R-2, R-3, R-4, R-6, R-7 de auth); R-5 (auth) íntegramente diferido al flujo frontend; los 4 requisitos de deltas quedan parcialmente verificados (ver arriba).

### Correctness (evidencia estática)
| Requisito | Estado | Nota |
|---|---|---|
| R-1 Provider + route handler | ✅ Implementado | `src/app/api/auth/[...nextauth]/route.ts` monta `NextAuth(authOptions)` (GET/POST); `/api/auth/*` excluido del matcher del proxy (público) |
| R-2 authorize (Zod → BD → bcrypt) | ✅ Implementado | `authenticate.ts`: `loginSchema.safeParse` ANTES de BD, `prisma.user.findUnique`, `bcrypt.compare`; retorno `null` uniforme (sin enumeración de usuarios) |
| R-3 JWT/sesión con role | ✅ Implementado | Callbacks `jwt`/`session` transportan `id`+`role`; augmentación tipada en `src/types/next-auth.d.ts`; caso "sin role válido no obtiene sesión" cubierto por test (`session.user.role` indefinido si el token no lo trae) |
| R-4 registerUser admin-only | ✅ Implementado | `src/actions/auth.ts`: `getServerSession` → UNAUTHORIZED/FORBIDDEN, Zod antes de BD, `bcrypt.hash(pw,10)`, P2002→`DUPLICATE_EMAIL`, `ActionResult<T>` tipado |
| R-5 UI /login reactiva | ➖ Diferido FE | Página actual es placeholder de Fase 0 (`src/app/(auth)/login/page.tsx`) |
| R-6 Migración init (17 modelos) | ✅ Implementado | `prisma/migrations/20260906194453_init` única y atómica; sin drift |
| R-7 Seed primer admin | ✅ Implementado | `prisma/seed.ts` idempotente (`findUnique` → skip), bcrypt r10; `migrations.seed` en `prisma.config.ts`; `tsx` en devDependencies |
| base-config R-6 .env NextAuth | ✅ Implementado | Claves presentes (sin valores impresos); secret ~32 bytes base64; sin versionar ni hardcodear |
| base-config R-7 proxy rename | ✅ Implementado (con desvío W1) | `proxy()` + runtime Node; `config` conservado según design §1 |
| module-exposure R-2 mapa Auth | ✅ Implementado | login/logout por `/api/auth/*`, registro por SA `registerUser`, interceptación en `proxy.ts` |
| project-structure R-4 hot files | ✅ Implementado | Coordinación registrada en tasks/apply-progress/PRs |

### Coherencia (design — 8 decisiones)
| Decisión | ¿Seguida? | Nota |
|---|---|---|
| 1. Codemod middleware→proxy, `export const config` conservado, runtime Node, redirect mínimo por sesión | ✅ Sí | `src/proxy.ts` con `getToken({req, secret})` + redirect; matcher preservado; extensión `token.role` para HU-1.2 |
| 2. NextAuth v4: authorize en `lib/auth.ts`, delegación a helper puro | ✅ Sí | `authorize → authenticate()`; route handler GET/POST exportados |
| 3. Contrato: `registerSchema` en `src/lib/auth/schemas.ts`; enum `Role` lowercase | ✅ Sí | Enum `admin`/`cashier` en `schema.prisma`; alineado con `next-auth.d.ts` (sin mapper) |
| 4. `registerUser` con sesión→Zod→hash→create, P2002→DUPLICATE_EMAIL | ✅ Sí | Orden exacto; `revalidatePath` omitido (sin listado en HU-1.1) |
| 5. Seed idempotente + `migrations.seed` en `prisma.config.ts` + `tsx` | ✅ Sí | Verificado con doble ejecución (apply) y re-ejecución (verify) |
| 6. Login UI | ➖ Diferido | Flujo frontend (fuera de este verify) |
| 7. Migración init atómica coordinada | ✅ Sí | 1 migración; coordinación registrada |
| 8. Testing: integración Vitest+PostgreSQL de `authenticate`/`registerUser`, coverage ≥80% | ✅ Sí | 10 tests de integración; coverage 96.15/87.5 sobre superficie |

Desviación documentada: el delta base-config R-7 menciona `proxyConfig`; design §1 (decisión no reabierta) y la realidad del codemod conservan `export const config` → WARNING W1 (texto de spec a corregir).

### TDD Compliance (Strict TDD)
| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | apply-progress reporta RED/GREEN por tarea (2.1/2.2, 2.3/2.4, 3.1/3.2, 3.3/3.4, 4.1/4.2); sin tabla consolidada "TDD Cycle Evidence" (ver S2) |
| All tasks have tests | ✅ | 10/21 tareas de código tienen suite propia; 11/21 son tareas de infra/proceso verificadas por gates de comandos (`prisma validate/status`, `db seed` ×2, build, smoke) — sin objeto unit-testeable |
| RED confirmed (tests exist) | ⚠️ | Los 5 archivos de test existen y son sustanciales; 1 par RED→GREEN committeado visible en historia (`049a10b` test → `33998cd` feat `DUPLICATE_EMAIL`); el resto del RED fue estado transitorio (solo atestiguado por apply-progress, no reconstruible desde git — esperable: cada commit debe compilar) |
| GREEN confirmed (tests pass) | ✅ | 43/43 al pasar en la re-ejecución propia de verify (incluidos los 10 de integración contra PostgreSQL) |
| Triangulation adequate | ✅ | 31 escenarios mapeados: 22 con caso(s) de prueba propios; bordes múltiples por comportamiento (ok/inexistente/password errónea/Zod/roles/duplicado); sin varianza trivial |
| Safety Net for modified files | ✅ | Suite completa (43) corrida antes del cierre en cada PR (apply) y re-ejecutada íntegra en verify |

**TDD Compliance**: 5/6 checks pasados, 1 parcial (RED transitorio documentado).

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|---|---|---|---|
| Unit | 28 | 3 | Vitest 4.1.11 (jsdom) — `auth.test.ts` (6), `schemas.test.ts` (6), `validations.test.ts` (16, contratos compartidos) |
| Integration | 10 | 2 | Vitest + Prisma + PostgreSQL Docker (`mi-postgres`) — `authenticate.test.ts` (5), `actions/auth.test.ts` (5) |
| E2E | 0 ejecutados en este flujo | 1 existente | Playwright — `e2e/smoke.spec.ts` (Fase 0, escenario B en `test.skip`); `auth.spec.ts` pertenece al flujo frontend |
| **Total suite** | **43** | **7** | (incluye 5 tests pre-existentes de Fase 0: `utils.test.ts` 4, `example.test.tsx` 1) |

La lógica de negocio crítica (`registerUser`) está cubierta por integración contra PostgreSQL real — capada adecuada para su exposición (Server Action).

### Changed File Coverage (v8, archivos del cambio)
| File | Stmts % | Branch % | Líneas no cubiertas | Rating |
|---|---|---|---|---|
| `src/actions/auth.ts` | 93.75 | 90 | L65 (`throw` de errores no-P2002) | ⚠️ Acceptable |
| `src/lib/auth.ts` | 90 | 75 | L25 (v8) + rama `if (session.user)` falsa | ⚠️ Acceptable |
| `src/lib/auth/authenticate.ts` | 100 | 100 | — | ✅ Excellent |
| `src/lib/auth/schemas.ts` | 100 | 100 | — | ✅ Excellent |
| `src/lib/validations/auth.ts` | 100 | 100 | — | ✅ Excellent |
| `src/lib/validations/result.ts` | 100 | 100 | — | ✅ Excellent |

**Cobertura promedio de archivos cambiados**: ~97.3% stmts — sobre el umbral 80% del DoD.

### Assertion Quality
Sin tautologías, sin loops fantasma (los loops iteran literales no vacíos), sin tests solo-de-humo, mocks ≤ aserciones (1 `vi.mock` de `getServerSession` vs 20+ aserciones en su suite); las aserciones type-only (`typeof … === "function"`, `toBeTypeOf`) van acompañadas de aserciones de valor en el mismo test.

**Assertion quality**: ✅ todas las aserciones verifican comportamiento real — 1 hallazgo de nomenclatura (S1).

### Quality Metrics
**Linter**: ✅ 0 errores (`npm run lint`, exit 0)
**Type Checker**: ✅ 0 errores (`npx tsc --noEmit`, exit 0)

### Consistencia apply-progress ↔ repositorio
✅ Sin drift: todos los paths citados existen (route handler, `proxy.ts`, `seed.ts`, `prisma.config.ts`, tests, `docs/auth.md`, migración única); commits citados presentes en `git log`; PRs #6-#10 verificados con `gh`; árbol limpio; secret no versionado (`git check-ignore .env` → `.gitignore:36`) y sin asignaciones hardcodeadas en `src/`/`prisma/`. Nota menor: la BD local real es `postgres` (el ejemplo de AGENTS.md menciona `proyecto-pos` como nombre de BD) — todo el stack apunta consistentemente a la misma BD, sin impacto.

### Issues Found
**CRITICAL**: ninguno.

**WARNING**:
- **W1 — Texto del delta base-config R-7 desactualizado respecto de la decisión de diseño**: menciona `config` → `proxyConfig`, pero design §1 (decisión confirmada, no reabierta) y la realidad del codemod conservan `export const config`. `src/proxy.ts:41-48` usa `config` y el matcher queda vigente. Corregir el texto del delta antes/durante `sdd-archive` para no codificar un requisito falso en la baseline.
- **W2 — Doc drift en baseline**: `docs/mapa-exposicion.md` aún referencia `src/middleware.ts` (líneas 12, 33-35, 52, 57) mientras la implementación renombró a `src/proxy.ts` (Next 16). El DoD exige documentación actualizada; actualizar el mapa al cerrar (la tabla del módulo 1 y el plan de cobertura).

**SUGGESTION**:
- **S1 — Test mal nombrado**: `src/lib/auth/authenticate.test.ts:74` — el nombre `returns null for a non-admin role user (cashier)` contradice su aserción (`expect(user?.role).toBe("cashier")`, correcta según R-3). Renombrar (touch-up) en el flujo frontend o en un chore.
- **S2 — Formato TDD**: apply-progress no incluye la tabla consolidada "TDD Cycle Evidence"; la evidencia RED/GREEN existe por tarea. Consolidar en futuros apply-progress.
- **S3 — Escenario "Secret ausente o débil" no ejecutable en verify**: el loader de env de Next re-carga el valor desde `.env` cuando la variable de proceso se limpia (empty string), y NextAuth v4 en dev no emite warning por secret corto; ejecutarlo exigiría mutar el `.env` compartido (prohibido en verify). Higiene verificada estáticamente; diferir a un harness controlado (p. ej. entorno efímero sin `.env`) o documentar como aceptado.
- **S4 — Ramas sin ejercicio en `src/lib/auth.ts`** (branch 75%, ≥80 global): camino `if (session.user)` falsy del callback `session` y L25 señalada por v8. Opcional: test del callback con `session.user` ausente.

### Diferidos legítimos (NO son fallos del flujo backend)
1. **R-5 completo (3 escenarios UI `/login`)** → flujo frontend (2º flujo SDD): react-hook-form + zodResolver + estados carga/error; la página actual es el placeholder de Fase 0.
2. **E2E Playwright `e2e/auth.spec.ts`** (login → /dashboard, errores descriptivos) → flujo frontend. `e2e/` contiene solo `smoke.spec.ts` de Fase 0 (escenario B en `test.skip` hasta que exista flujo de login).
3. **Matriz de roles por ruta en proxy (HU-1.2)** → cambio futuro; `proxy.ts` deja `token.role` como punto de extensión.
4. **module-exposure / Dashboard (KPIs por GET + `voidSale` SA)** → módulo M6, cambio futuro; el escenario declara el mapa, no código de este cambio.
5. **project-structure / Helper transversal** → política de ubicación para helpers futuros; sin objeto ejecutable en este cambio.
6. **base-config R-6 "Secret ausente o débil"** → ver S3 (requiere entorno controlado).

### Verdict
**FAIL** (veredicto canónico del **cambio completo** por evidencia incompleta — NO por defectos del backend).

- **Bloqueantes: 0 · Hallazgos críticos: 0.** Todos los gates del flujo backend pasaron en re-ejecución propia (43/43 tests, coverage ≥80, tsc/lint/prisma/build en 0, login HTTP real con JWT firmado, migración sin drift, seed idempotente).
- La cobertura de escenarios del cambio es 22/31 y de requisitos 6/11: los 9 escenarios/5 requisitos restantes pertenecen estructuralmente al **flujo frontend** (R-5 + E2E), a un **cambio futuro (M6)**, a una **política estructural** o a un **camino negativo de env no ejecutable sin mutar `.env`** (diferidos 1-6 arriba, documentados y aprobados por el orchestrator como legítimos de este flujo).
- Estado resultante: reporte válido y persistible, **no archive-ready**. El cambio `AUTH-HU1-1` abarca Front+Back en 2 flujos SDD; su verificación final (y el archive) requieren completar el flujo frontend y re-verificar.

**Próximo paso recomendado**: ejecutar el flujo **frontend** de AUTH-HU1-1 (R-5 + `SessionProvider` + E2E `auth.spec.ts`), corregir W1/W2 antes del cierre, y re-emitir verificación con cobertura completa (entonces PASS → `sdd-archive`).
