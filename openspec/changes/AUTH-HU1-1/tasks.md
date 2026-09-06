# Tasks: AUTH-HU1-1 — Autenticación y manejo de credenciales (flujo Backend, 1º de 2)

## Review Workload Forecast

| Campo | Valor |
|---|---|
| Líneas cambiadas estimadas | ~430–500 autoradas + migración init generada (~500) |
| Riesgo presupuesto 400 líneas | High |
| PRs encadenados recomendados | Yes |
| Split sugerido | PR 1 → PR 2 → PR 3 → PR 4 |
| Estrategia de entrega | ask-on-risk |
| Estrategia de cadena | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
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

- [ ] 1.1 Cambiar enum `Role` en `prisma/schema.prisma` a minúsculas (`admin`/`cashier`); coordinar compañero; `docker ps`
- [ ] 1.2 Migración init atómica `npm run db:migrate -- --name init` (17 modelos); `npx prisma migrate status` sin drift (R-6)
- [ ] 1.3 `tsx` devDep en `package.json`; `migrations.seed` en `prisma.config.ts`; crear `prisma/seed.ts` idempotente (admin, bcrypt r10)
- [ ] 1.4 `npx prisma db seed` dos veces → exactamente 1 admin (R-7)

## Fase 2: Contrato de datos

- [ ] 2.1 \[RED\] `src/lib/validations/validations.test.ts`: `DUPLICATE_EMAIL` como código válido (falla)
- [ ] 2.2 \[GREEN\] Agregar `DUPLICATE_EMAIL` a `ErrorCode`/`ERROR_CODES` en `src/lib/validations/result.ts` (shared, coordinación)
- [ ] 2.3 \[RED\] `src/lib/auth/schemas.test.ts`: registerSchema bordes (ok, email inválido, password <8, role inválido)
- [ ] 2.4 \[GREEN\] Crear `src/lib/auth/schemas.ts` (registerSchema + `RegisterInput` z.infer)

## Fase 3: Núcleo auth (helper puro → authorize → route handler)

- [ ] 3.1 \[RED\] `src/lib/auth/authenticate.test.ts`: válido → `{id,role}`; password errónea → null; email inexistente → null
- [ ] 3.2 \[GREEN\] Crear `src/lib/auth/authenticate.ts` (helper puro: loginSchema → findUnique → bcrypt.compare r10)
- [ ] 3.3 \[RED\] Integración `authenticate` contra PostgreSQL (R-2/R-3): login ok con role; inválido → null; payload inválido sin consultar BD
- [ ] 3.4 \[GREEN\] Completar `src/lib/auth.ts`: authorize = Zod → authenticate → `{id,email,role}`; callbacks jwt/session tipados (R4 `token.role`)
- [ ] 3.5 Crear `src/app/api/auth/[...nextauth]/route.ts` (GET/POST = `NextAuth(authOptions)`); smoke `/api/auth/session` → 200

## Fase 4: Server Action registerUser

- [ ] 4.1 \[RED\] `src/actions/auth.test.ts` (integración): admin ok; cashier → FORBIDDEN; sin sesión → UNAUTHORIZED; email dup → DUPLICATE_EMAIL; Zod → VALIDATION_ERROR
- [ ] 4.2 \[GREEN\] Implementar `registerUser` en `src/actions/auth.ts` ("use server"; getServerSession rol admin; bcrypt.hash r10; P2002 → DUPLICATE_EMAIL; `ActionResult<{id,email,role}>`)

## Fase 5: Proxy y entorno

- [ ] 5.1 `.env`: `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (`crypto.randomBytes(32)` base64, no versionar)
- [ ] 5.2 Codemod `npx @next/codemod@canary middleware-to-proxy .` → `src/proxy.ts`; borrar `src/middleware.ts`; conservar `export const config`
- [ ] 5.3 Redirect por sesión en `src/proxy.ts` (`getToken`; protegida sin token → `/login`; `token.role` punto de extensión HU-1.2)

## Fase 6: Verificación y cierre

- [ ] 6.1 `npm test` verde + coverage ≥80% superficie probada
- [ ] 6.2 `npm run build` compila; sin warning de deprecación middleware
- [ ] 6.3 Crear `docs/auth.md` (DoD); avisar compañero de archivos calientes tocados