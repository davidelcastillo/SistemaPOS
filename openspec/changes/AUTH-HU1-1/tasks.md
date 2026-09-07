# Tasks: AUTH-HU1-1 — Autenticación y manejo de credenciales (Backend 1º completado + Flujo Frontend 2º)

## Review Workload Forecast

| Campo | Valor |
|---|---|
| Líneas cambiadas estimadas | ~430–500 autoradas + migración init generada (~500) |
| Riesgo presupuesto 400 líneas | High |
| PRs encadenados recomendados | Yes |
| Split sugerido | PR 1 → PR 2 → PR 3 → PR 4 |
| Estrategia de entrega | ask-on-risk |
| Estrategia de cadena | feature-branch-chain (resuelta) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Unidades de trabajo sugeridas

| Unidad | Meta | PR | Test enfocado | Harness runtime | Límite de rollback |
|---|---|---|---|---|---|
| 1 | Fundación: enum Role lowercase, migración init, seed | PR 1 | `npx prisma migrate status` + `npx prisma db seed` ×2 | `docker ps` + `npm run db:migrate -- --name init` (Postgres local) | Revertir enum + borrar migración init + `prisma migrate reset` |
| 2 | Contrato: `result.ts` +`DUPLICATE_EMAIL`, `schemas.ts`, `authenticate.ts` + unit | PR 2 | `npx vitest run src/lib/auth src/lib/validations` | N/A — lógica pura/Zod sin BD | Revertir archivos de contrato, sin tocar BD |
| 3 | Wiring: `lib/auth.ts`, route handler, `registerUser` + integración | PR 3 | `npx vitest run src/lib/auth src/actions/auth.test.ts` | Postgres Docker migrado + seed | Revertir SA y route handler, sin tocar BD |
| 4 | `proxy.ts` (codemod) + redirect + `.env` | PR 4 | `npm run build` | `npm run dev`: ruta protegida sin sesión → /login | Restaurar `middleware.ts` + quitar vars `.env` |

> Archivos calientes (aviso compañero): `src/middleware.ts`→`proxy.ts`, `src/lib/auth.ts`, `package.json` (+tsx), `.env`, `src/lib/validations/result.ts` (shared), `prisma/schema.prisma` + `prisma/migrations/`.

## Fase 1: Fundación de datos (dueño David)

- [x] 1.1 Cambiar enum `Role` en `prisma/schema.prisma` a minúsculas (`admin`/`cashier`); coordinar compañero; `docker ps`
- [x] 1.2 Migración init atómica `npm run db:migrate -- --name init` (17 modelos); `npx prisma migrate status` sin drift (R-6)
- [x] 1.3 `tsx` devDep en `package.json`; `migrations.seed` en `prisma.config.ts`; crear `prisma/seed.ts` idempotente (admin, bcrypt r10)
- [x] 1.4 `npx prisma db seed` dos veces → exactamente 1 admin (R-7)

## Fase 2: Contrato de datos

- [x] 2.1 \[RED\] `src/lib/validations/validations.test.ts`: `DUPLICATE_EMAIL` como código válido (falla)
- [x] 2.2 \[GREEN\] Agregar `DUPLICATE_EMAIL` a `ErrorCode`/`ERROR_CODES` en `src/lib/validations/result.ts` (shared, coordinación)
- [x] 2.3 \[RED\] `src/lib/auth/schemas.test.ts`: registerSchema bordes (ok, email inválido, password <8, role inválido)
- [x] 2.4 \[GREEN\] Crear `src/lib/auth/schemas.ts` (registerSchema + `RegisterInput` z.infer)

## Fase 3: Núcleo auth (helper puro → authorize → route handler)

- [x] 3.1 \[RED\] `src/lib/auth/authenticate.test.ts`: válido → `{id,role}`; password errónea → null; email inexistente → null
- [x] 3.2 \[GREEN\] Crear `src/lib/auth/authenticate.ts` (helper puro: loginSchema → findUnique → bcrypt.compare r10)
- [x] 3.3 \[RED\] Integración `authenticate` contra PostgreSQL (R-2/R-3): login ok con role; inválido → null; payload inválido sin consultar BD
- [x] 3.4 \[GREEN\] Completar `src/lib/auth.ts`: authorize = Zod → authenticate → `{id,email,role}`; callbacks jwt/session tipados (R4 `token.role`)
- [x] 3.5 Crear `src/app/api/auth/[...nextauth]/route.ts` (GET/POST = `NextAuth(authOptions)`); smoke `/api/auth/session` → 200

## Fase 4: Server Action registerUser

- [x] 4.1 \[RED\] `src/actions/auth.test.ts` (integración): admin ok; cashier → FORBIDDEN; sin sesión → UNAUTHORIZED; email dup → DUPLICATE_EMAIL; Zod → VALIDATION_ERROR
- [x] 4.2 \[GREEN\] Implementar `registerUser` en `src/actions/auth.ts` ("use server"; getServerSession rol admin; bcrypt.hash r10; P2002 → DUPLICATE_EMAIL; `ActionResult<{id,email,role}>`)

## Fase 5: Proxy y entorno

- [x] 5.1 `.env`: `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (`crypto.randomBytes(32)` base64, no versionar)
- [x] 5.2 Codemod `npx @next/codemod@canary middleware-to-proxy .` → `src/proxy.ts`; borrar `src/middleware.ts`; conservar `export const config`
- [x] 5.3 Redirect por sesión en `src/proxy.ts` (`getToken`; protegida sin token → `/login`; `token.role` punto de extensión HU-1.2)

## Fase 6: Verificación y cierre

- [x] 6.1 `npm test` verde + coverage ≥80% superficie probada
- [x] 6.2 `npm run build` compila; sin warning de deprecación middleware
- [x] 6.3 Crear `docs/auth.md` (DoD); avisar compañero de archivos calientes tocados

---

## Flujo Frontend (2º) — UI /login + SessionProvider + E2E + correcciones W1/W2

### Review Workload Forecast (flujo frontend)

| Campo | Valor |
|---|---|
| Líneas cambiadas estimadas | ~280–350 |
| Riesgo presupuesto 400 líneas | Medium |
| PRs encadenados recomendados | Yes |
| Split sugerido | PR #11 (UI) → PR #12 (E2E + W1/W2) |
| Estrategia de entrega | ask-on-risk (resuelta: encadenados) |
| Estrategia de cadena | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Unidades de trabajo sugeridas

| Unidad | Meta | PR (base) | Test enfocado | Harness runtime | Límite de rollback |
|---|---|---|---|---|---|
| 1 | Fundación + UI login | PR #11 (base: rama PR #10) | `npm run build` + `npm test` | `npm run dev`: login admin@pos.com → /dashboard; malas credenciales → "Credenciales inválidas" | Revertir `src/app/(auth)/login/page.tsx` + `src/app/layout.tsx` + dep (sin BD) |
| 2 | E2E auth + W1/W2 | PR #12 (base: rama PR #11) | `npx playwright test e2e/auth.spec.ts` | Playwright webServer (`next dev`) + seed admin | Revertir `e2e/auth.spec.ts`, `e2e/smoke.spec.ts`, delta `base-config`, `docs/mapa-exposicion.md` |

> Archivos calientes (aviso compañero): `src/app/layout.tsx`, `package.json`. `src/proxy.ts` y `src/lib/auth.ts` NO se tocan (implementados).

## Fase 7: Fundación frontend

- [ ] F1 Instalar `@hookform/resolvers` (latest, compat Zod v4) en `package.json`; avisar compañero (hot)
- [ ] F2 `src/app/layout.tsx`: envolver `{children}` con `SessionProvider` (hot, coordinado)

## Fase 8: E2E RED + UI login GREEN (R-5)

- [ ] F3 \[RED\] `e2e/auth.spec.ts`: login ok admin/cashier → `/dashboard`; credenciales inválidas → "Credenciales inválidas" sin salir de `/login`; campos inválidos sin llamar signIn (falla contra placeholder)
- [ ] F4 \[GREEN\] `src/app/(auth)/login/page.tsx`: client RHF + `zodResolver(loginSchema)`; `signIn("credentials",{redirect:false})`; loading/error; éxito → `router.push(callbackUrl \|\| "/dashboard")`; estilo `.STYLES.md` (flat, bordes 1px, foco accent, sin sombras)
- [ ] F5 `e2e/smoke.spec.ts`: habilitar scenario B (quitar `test.skip`) — admin → `/dashboard`
- [ ] F6 Gate: `npm test` + `npm run build` verdes

## Fase 9: Correcciones verify (W1/W2)

- [ ] F7 W1: `openspec/changes/AUTH-HU1-1/specs/base-config/spec.md` R-7: `proxyConfig` → `export const config` (2 menciones); NO tocar `src/proxy.ts`
- [ ] F8 W2: `docs/mapa-exposicion.md`: `src/middleware.ts` → `src/proxy.ts` (líneas 12, 33-35, 52, 57)
- [ ] F9 Opcional: `docs/auth.md`: sección flujo frontend (UI login, SessionProvider, E2E) si aporta

## Fase 10: Verificación y cierre frontend

- [ ] F10 `npx playwright test e2e/auth.spec.ts` verde (login ok admin/cashier + fallo + redirect)
- [ ] F11 Avisar compañero de hot files en tracker #6; work-unit commits por unidad (PR #11, PR #12)