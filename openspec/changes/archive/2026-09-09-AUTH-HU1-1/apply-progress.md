# Apply Progress: AUTH-HU1-1 — Autenticación y manejo de credenciales (flujo Backend + Flujo Frontend)

> Fase: apply · Flujo: backend (1º de 2, completado) + frontend (2º de 2, completado).
> Estrategia: feature-branch-chain (4 PRs backend + tracker #6; 2 PRs frontend #11/#12).
> Todas las tareas backend (21/21) y frontend (F1–F11) completadas.

## Resumen

Implementado el flujo backend completo de HU-1.1: fundación de datos (enum `Role` lowercase + migración `init` + seed), contrato (DUPLICATE_EMAIL + registerSchema), núcleo auth (authenticate + authorize + route handler + registerUser) y entorno (proxy.ts + redirect + .env + docs). TDD estricto con tests verdes y coverage ≥80%.

## Fase 1: Fundación de datos

- [x] 1.1 Cambiar enum `Role` en `prisma/schema.prisma` a minúsculas (`admin`/`cashier`)
  - Evidencia: commit `feat(auth): lowercase Role enum to match session contract` (PR1). `npx prisma validate` OK. Alineado con `src/types/next-auth.d.ts`. Coordinación migración confirmada por David.
- [x] 1.2 Migración init atómica `npm run db:migrate -- --name init` (17 modelos); sin drift
  - Evidencia: migración `20260906194453_init` aplicada contra `mi-postgres` (5433, Docker arriba). 17 `CREATE TABLE` (226 líneas SQL). `npx prisma migrate status` → `Database schema is up to date!` (R-6).
- [x] 1.3 `tsx` devDep; `migrations.seed` en `prisma.config.ts`; `prisma/seed.ts` idempotente
  - Evidencia: `tsx ^4.23.13` en devDependencies; `seed: "tsx prisma/seed.ts"` en `prisma.config.ts`; seed con `findUnique` por email → skip si existe, bcrypt r10 (R-7).
- [x] 1.4 `npx prisma db seed` dos veces → exactamente 1 admin
  - Evidencia: run 1 `created first admin admin@pos.com`; run 2 `already exists, skipping`. Query de verificación: `[{"email":"admin@pos.com","role":"admin"}]`.

## Fase 2: Contrato de datos

- [x] 2.1 \[RED\] `validations.test.ts`: `DUPLICATE_EMAIL` como código válido (falla)
  - Evidencia: 1 test failed (16 tests, 1 fail).
- [x] 2.2 \[GREEN\] `DUPLICATE_EMAIL` en `ErrorCode`/`ERROR_CODES` de `result.ts` (shared, coordinado)
  - Evidencia: 16/16 pass. Commit `feat(auth): add DUPLICATE_EMAIL to shared result contract` (PR2).
- [x] 2.3 \[RED\] `schemas.test.ts`: registerSchema bordes (ok, email inválido, password <8, role inválido)
  - Evidencia: suite falla por import inexistente (RED).
- [x] 2.4 \[GREEN\] `src/lib/auth/schemas.ts` (registerSchema + `RegisterInput`)
  - Evidencia: 6/6 pass (agrega bordes name vacío y role ausente). Commit `feat(auth): add registerSchema contract...` (PR2).

## Fase 3: Núcleo auth

- [x] 3.1 \[RED\] `authenticate.test.ts`: válido → `{id,role}`; password errónea → null; email inexistente → null
  - Evidencia: suite falla por import inexistente. Requirió `import "dotenv/config"` en `src/test/setup.ts` (DATABASE_URL no se cargaba en Vitest).
- [x] 3.2 \[GREEN\] `src/lib/auth/authenticate.ts` (helper puro: loginSchema → findUnique → bcrypt.compare r10)
  - Evidencia: 5/5 integración contra PostgreSQL. Commit `feat(auth): add pure authenticate helper...` (PR3).
- [x] 3.3 \[RED\] Integración `authenticate` contra PostgreSQL (R-2/R-3): login ok con role; inválido → null; payload inválido sin consultar BD
  - Evidencia: casos cubiertos en la misma suite: ok admin, ok cashier, password errónea, email inexistente, payload inválido (5/5). Fixtures aislados por dominio `@auth.test` para evitar carreras entre workers.
- [x] 3.4 \[GREEN\] `src/lib/auth.ts`: authorize = Zod → authenticate → `{id,email,role}`; callbacks jwt/session tipados (R4 `token.role`)
  - Evidencia: commit `feat(auth): wire credentials authorize into authOptions`. Unit `src/lib/auth.test.ts`: provider registrado, authorize inválido → null, token/session transportan id+role (R-1/R-3). tsc 0 errores.
- [x] 3.5 Crear `src/app/api/auth/[...nextauth]/route.ts` (GET/POST = `NextAuth(authOptions)`); smoke `/api/auth/session` → 200
  - Evidencia: commit `feat(auth): mount NextAuth route handler`. Harness `npm run dev` → `GET /api/auth/session` → **200** `{}`.

## Fase 4: Server Action registerUser

- [x] 4.1 \[RED\] `src/actions/auth.test.ts` (integración): admin ok; cashier → FORBIDDEN; sin sesión → UNAUTHORIZED; email dup → DUPLICATE_EMAIL; Zod → VALIDATION_ERROR
  - Evidencia: 5 failed (registerUser inexistente en shell). `getServerSession` mockeado por escenario; fixtures `@reg.test`.
- [x] 4.2 \[GREEN\] `registerUser` en `src/actions/auth.ts` ("use server"; getServerSession rol admin; bcrypt.hash r10; P2002 → DUPLICATE_EMAIL; `ActionResult<{id,email,role}>`)
  - Evidencia: 5/5 pass. Password verificada con bcrypt.compare contra el hash almacenado. Commit `feat(auth): add admin-only registerUser server action` (PR3).

## Fase 5: Proxy y entorno

- [x] 5.1 `.env`: `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (`crypto.randomBytes(32)` base64, no versionar)
  - Evidencia: `.env` completado (gitignored, validado con dotenv: URL ok, secret len 44). Secret generado con `crypto.randomBytes(32)`. Documentado el patrón en `docs/auth.md`.
- [x] 5.2 Codemod `npx @next/codemod@canary middleware-to-proxy .` → `src/proxy.ts`; borrado `src/middleware.ts`; `export const config` conservado
  - Evidencia: codemod 0 errors. Commit `refactor(auth): migrate middleware to proxy convention (Next 16)` (PR4). `npm run build`: `ƒ Proxy (Middleware)` sin warning de deprecación.
- [x] 5.3 Redirect por sesión en `src/proxy.ts` (`getToken`; protegida sin token → `/login`; `token.role` punto de extensión HU-1.2)
  - Evidencia: commit `feat(auth): redirect unauthenticated requests to /login in proxy`. Harness `npm run dev`: `/dashboard` sin sesión → **307 Location: /login**; `/login` → 200; `/api/auth/session` → 200.

## Fase 6: Verificación y cierre

- [x] 6.1 `npm test` verde + coverage ≥80% superficie probada
  - Evidencia: **43/43 tests**, 7 files. Coverage All files: 96.15 stmts / 87.5 branch / 88.88 funcs / 95.91 lines (≥80%). Gates en cada PR y al cierre.
- [x] 6.2 `npm run build` compila; sin warning de deprecación middleware
  - Evidencia: `✓ Compiled successfully in 10.8s`. Ruta `ƒ Proxy (Middleware)`; cero advertencias de middleware/proxy.
- [x] 6.3 Crear `docs/auth.md` (DoD); avisar compañero de archivos calientes
  - Evidencia: `docs/auth.md` creado (alcance, flujo, seguridad, migración/seed, testing, próximos pasos). Archivos calientes tocados: `prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`, `package.json`, `.env`, `src/lib/validations/result.ts` (shared), `src/lib/auth.ts`, `src/proxy.ts` (era `middleware.ts`) — aviso al compañero en el PR tracker #6.

## Cadena de PRs (feature-branch-chain)

```text
main
 └── feat/auth-hu1-1  → PR #6 (tracker, draft/no-merge)
      └── feat/auth-hu1-1-pr1-datos     → PR #7 (enum + migración init + seed)  [size:exception migración]
           └── feat/auth-hu1-1-pr2-contrato  → PR #8 (DUPLICATE_EMAIL + registerSchema)
                └── feat/auth-hu1-1-pr3-wiring  → PR #9 (authenticate + authorize + route handler + registerUser)  [size:exception 450]
                     └── feat/auth-hu1-1-pr4-entorno  → PR #10 (proxy + redirect + .env + docs)
```

## Desviaciones y notas

- **proxyConfig**: el design (decisión 1, no reabierta) conserva `export const config`; el codemod NO renombra a `proxyConfig` (corrige el delta spec base-config R-7 que lo mencionaba).
- **size:exception**: PR #7 (migración generada ~295 líneas, no divisible) y PR #9 (450 vs 400; corte cohesivo del design, tests TDD con código) — aceptados por el usuario.
- **`src/test/setup.ts`**: se agregó `import "dotenv/config"` para habilitar integración contra PostgreSQL en Vitest.
- **Lint markdown pre-existente**: 8 errores en `archive-report.md` de Fase 0 corregidos (chore en tracker) para dejar el gate lint en verde.
- **.env.example**: creado localmente pero cubierto por el patrón `.env*` del `.gitignore`; no se versiona.
- **AGENTS.md**: bloque `nextjs-agent-rules` regenerado por `next dev`; commiteado en PR4 (chore) para mantener el árbol limpio.

---

## Flujo Frontend (2º de 2) — UI /login + SessionProvider + E2E + correcciones W1/W2

> Rama base del flujo: `feat/auth-hu1-1-pr4-entorno` (PR #10). PRs: #11 (F1–F6, UI login) → #12 (F7–F11, W1/W2 + docs + cierre). Estrategia: feature-branch-chain (resuelta).

## Fase 7: Fundación frontend

- [x] F1 Instalar `@hookform/resolvers` (latest, compat Zod v4); avisar compañero (hot)
  - Evidencia: `@hookform/resolvers ^5.9.1` en `package.json` (auto-detecta Zod v4, verificado con Context7). Commit `feat(auth): add @hookform/resolvers for login form validation` (PR #11). Hot file: `package.json` (+lockfile) — listado en el aviso al compañero (tracker #6).
- [x] F2 `src/app/layout.tsx`: envolver `{children}` con `SessionProvider` (hot, coordinado)
  - Evidencia: `SessionProvider` montado vía wrapper client `src/components/providers.tsx` (patrón oficial NextAuth v4 App Router — importar `SessionProvider` directo desde layout Server Component falla con "React Context is unavailable in Server Components"). Commit `feat(auth): provide session state to the app via SessionProvider` (PR #11). Hot file: `src/app/layout.tsx` — listado en el aviso.

## Fase 8: E2E RED + UI login GREEN (R-5)

- [x] F3 \[RED\] `e2e/auth.spec.ts` (implementado como `e2e/auth.spec.mts`): login ok admin/cashier → `/dashboard`; credenciales inválidas → "Credenciales inválidas" sin salir de `/login`; campos inválidos sin llamar signIn
  - Evidencia RED: contra el placeholder (Fase 0) el spec falla (`waiting for getByLabel('Email')` — no existe form). Nota: el fixture cashier se crea/elimina vía `e2e/fixtures/cashier.ts` (script `tsx`, porque el cliente Prisma generado es ESM-only y el transform CJS de Playwright no lo carga — mismo patrón que `prisma/seed.ts`). Commit `test(auth): add E2E login flow spec against placeholder` (PR #11).
- [x] F4 \[GREEN\] `src/app/(auth)/login/page.tsx`: client RHF + `zodResolver(loginSchema)`; `signIn("credentials",{redirect:false})`; loading/error; éxito → `router.push(callbackUrl || "/dashboard")`; estilo `.STYLES.md` (flat, bordes 1px, foco accent, sin sombras)
  - Evidencia GREEN: 4/4 E2E pasan (admin → /dashboard, cashier → /dashboard, malas credenciales → error + permanece en /login, campos inválidos → errores por campo sin llamar signIn — verificado con listener de red). Redirect por rol es HU-1.2 (en HU-1.1 ambas roles → `/dashboard`, consistente con `src/app/page.tsx`). Commit `feat(auth): build reactive login page with react-hook-form` (PR #11).
- [x] F5 `e2e/smoke.spec.ts`: habilitar scenario B (quitar `test.skip`) — admin → `/dashboard`
  - Evidencia: scenario B activo, siembra sesión vía flujo real de login y verifica redirect de `/` → `/dashboard`. Commit `test(auth): enable authenticated redirect smoke scenario` (PR #11).
- [x] F6 Gate: `npm test` + `npm run build` verdes
  - Evidencia: `npm test` 43/43 (coverage 96.15 stmts / 87.5 branch / 88.88 funcs / 95.91 lines, ≥80); `npx tsc --noEmit` 0; `npm run lint` 0; `npm run build` OK (`/login` static, `/api/auth/[...nextauth]` dynamic, `ƒ Proxy (Middleware)` sin warning de deprecación); `npx playwright test` 6/6 (auth 4 + smoke 2).

## Fase 9: Correcciones verify (W1/W2)

- [x] F7 W1: `specs/base-config/spec.md` R-7: `proxyConfig` → `export const config` (2 menciones)
  - Evidencia: las 2 menciones de `proxyConfig` reemplazadas por `export const config` (requirement + scenario "Rename sin regresión"), alineado con design §1 y el codemod real. `src/proxy.ts` NO se tocó. Commit `docs(sdd): align base-config delta and exposure map with proxy convention` (PR #12).
- [x] F8 W2: `docs/mapa-exposicion.md`: `src/middleware.ts` → `src/proxy.ts` (líneas 12, 33-35, 52, 57)
  - Evidencia: 4 referencias corregidas (tabla módulo 1, matriz de roles del proxy, plan de cobertura ×2). Sin referencias `middleware` restantes en el mapa. Mismo commit que F7 (PR #12).
- [x] F9 `docs/auth.md`: sección flujo frontend (UI login, SessionProvider, E2E)
  - Evidencia: sección "Frontend (HU-1.1, R-5)" + nota técnica Prisma ESM/Playwright + testing E2E en gates. Commit `docs(auth): document login UI, SessionProvider and E2E flow` (PR #12).

## Fase 10: Verificación y cierre frontend

- [x] F10 `npx playwright test` completo verde (login ok admin/cashier + fallo + redirect + smoke)
  - Evidencia: **6/6 E2E** (auth 4: admin → /dashboard, cashier → /dashboard, malas credenciales → "Credenciales inválidas" en /login, campos inválidos sin llamar signIn; smoke 2: no-auth → /login, admin → /dashboard). Gates finales: `npm test` 43/43 (coverage 96.15/87.5/88.88/95.91), `npx tsc --noEmit` 0, `npm run lint` 0, `npm run build` OK.
- [x] F11 Avisar compañero de hot files en tracker #6; work-unit commits por unidad (PR #11, PR #12)
  - Evidencia: comentario en PR tracker #6 con hot files del frontend (`src/app/layout.tsx`, `src/components/providers.tsx`, `package.json` +`@hookform/resolvers`). Commits por unidad de trabajo: PR #11 = 7 commits (docs sdd, resolvers, SessionProvider, spec E2E, login page, smoke B, progress F1-F6); PR #12 = 4 commits (W1/W2, docs/auth, warm-up smoke, cierre tasks/progress).

## Cadena de PRs actualizada (feature-branch-chain)

```text
main
 └── feat/auth-hu1-1  → PR #6 (tracker, draft/no-merge)
      └── feat/auth-hu1-1-pr1-datos     → PR #7
           └── feat/auth-hu1-1-pr2-contrato  → PR #8
                └── feat/auth-hu1-1-pr3-wiring  → PR #9
                     └── feat/auth-hu1-1-pr4-entorno  → PR #10
                          └── feat/auth-hu1-1-pr5-frontend-ui  → PR #11 (F1–F6)
                               └── feat/auth-hu1-1-pr6-frontend-cierre → PR #12 (F7–F11)  📍
```

## Desviaciones y notas del flujo frontend

- **Playwright + Prisma ESM**: el cliente Prisma 7 generado usa `import.meta` (ESM-only); el transform CJS de Playwright no lo carga desde un spec. Solución: fixture en script `tsx` (`e2e/fixtures/cashier.ts`) invocado con `execSync`, y spec como `.mts`.
- **Dev server lento (network drive)**: Turbopack compila las rutas API de forma lazy; el primer hit a `/api/auth/*` puede superar el timeout por defecto de expect. Solución: warm-up de `/api/auth/session` + `/api/auth/providers` en `beforeAll` (ambos specs) y timeout 30s en las aserciones de URL post-login.
- **redirect por rol diferido**: HU-1.1 redirige ambas roles a `/dashboard` (consistente con `page.tsx`); la matriz por rol (cashier → /ventas) es HU-1.2 en `proxy.ts`.
- **Lint markdown**: el apply-progress con dos H1 viola `markdown/no-multiple-h1` → la sección frontend se documenta como H2.
- **`SessionProvider` directo en layout falla**: requiere wrapper client (`src/components/providers.tsx`) — patrón oficial NextAuth v4 App Router.
