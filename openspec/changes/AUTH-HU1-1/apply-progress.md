# Apply Progress: AUTH-HU1-1 — Autenticación y manejo de credenciales (flujo Backend)

> Fase: apply · Flujo: backend (1º de 2) · Estrategia: feature-branch-chain (4 PRs + tracker).
> Todas las tareas completadas (21/21). La UI `/login`, `SessionProvider` y E2E pertenecen al flujo frontend.

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

- [x] 2.1 [RED] `validations.test.ts`: `DUPLICATE_EMAIL` como código válido (falla)
  - Evidencia: 1 test failed (16 tests, 1 fail).
- [x] 2.2 [GREEN] `DUPLICATE_EMAIL` en `ErrorCode`/`ERROR_CODES` de `result.ts` (shared, coordinado)
  - Evidencia: 16/16 pass. Commit `feat(auth): add DUPLICATE_EMAIL to shared result contract` (PR2).
- [x] 2.3 [RED] `schemas.test.ts`: registerSchema bordes (ok, email inválido, password <8, role inválido)
  - Evidencia: suite falla por import inexistente (RED).
- [x] 2.4 [GREEN] `src/lib/auth/schemas.ts` (registerSchema + `RegisterInput`)
  - Evidencia: 6/6 pass (agrega bordes name vacío y role ausente). Commit `feat(auth): add registerSchema contract...` (PR2).

## Fase 3: Núcleo auth

- [x] 3.1 [RED] `authenticate.test.ts`: válido → `{id,role}`; password errónea → null; email inexistente → null
  - Evidencia: suite falla por import inexistente. Requirió `import "dotenv/config"` en `src/test/setup.ts` (DATABASE_URL no se cargaba en Vitest).
- [x] 3.2 [GREEN] `src/lib/auth/authenticate.ts` (helper puro: loginSchema → findUnique → bcrypt.compare r10)
  - Evidencia: 5/5 integración contra PostgreSQL. Commit `feat(auth): add pure authenticate helper...` (PR3).
- [x] 3.3 [RED] Integración `authenticate` contra PostgreSQL (R-2/R-3): login ok con role; inválido → null; payload inválido sin consultar BD
  - Evidencia: casos cubiertos en la misma suite: ok admin, ok cashier, password errónea, email inexistente, payload inválido (5/5). Fixtures aislados por dominio `@auth.test` para evitar carreras entre workers.
- [x] 3.4 [GREEN] `src/lib/auth.ts`: authorize = Zod → authenticate → `{id,email,role}`; callbacks jwt/session tipados (R4 `token.role`)
  - Evidencia: commit `feat(auth): wire credentials authorize into authOptions`. Unit `src/lib/auth.test.ts`: provider registrado, authorize inválido → null, token/session transportan id+role (R-1/R-3). tsc 0 errores.
- [x] 3.5 Crear `src/app/api/auth/[...nextauth]/route.ts` (GET/POST = `NextAuth(authOptions)`); smoke `/api/auth/session` → 200
  - Evidencia: commit `feat(auth): mount NextAuth route handler`. Harness `npm run dev` → `GET /api/auth/session` → **200** `{}`.

## Fase 4: Server Action registerUser

- [x] 4.1 [RED] `src/actions/auth.test.ts` (integración): admin ok; cashier → FORBIDDEN; sin sesión → UNAUTHORIZED; email dup → DUPLICATE_EMAIL; Zod → VALIDATION_ERROR
  - Evidencia: 5 failed (registerUser inexistente en shell). `getServerSession` mockeado por escenario; fixtures `@reg.test`.
- [x] 4.2 [GREEN] `registerUser` en `src/actions/auth.ts` ("use server"; getServerSession rol admin; bcrypt.hash r10; P2002 → DUPLICATE_EMAIL; `ActionResult<{id,email,role}>`)
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
