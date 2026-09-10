# Design: AUTH-HU1-1 — Autenticación y manejo de credenciales (HU-1.1)

## Enfoque técnico

Implementar autenticación fundacional con NextAuth v4 sobre Next.js 16: `authorize` (bcrypt r10 + Prisma + Zod), JWT/sesión con `role`, Server Action `registerUser` (solo admin), UI `/login` reactiva, migración `init` de Prisma (17 modelos) y seed del primer admin. El design cubre **Front + Back** y se divide en 2 flujos SDD (backend primero, luego frontend). Decisiones confirmadas por el equipo se materializan; el resto se resuelve abajo con justificación.

## Decisiones de diseño (8 puntos)

### 1. proxy.ts — decisión final
**Opción elegida:** migrar con codemod oficial `npx @next/codemod@canary middleware-to-proxy .`.
- El codemod renombra **archivo** (`src/middleware.ts` → `src/proxy.ts`) y **función** (`middleware()` → `proxy()`). El `export const config = { matcher }` **se conserva igual** (no se renombra a `proxyConfig`; corrección a propuesta). Elimina el warning y habilita Node.js runtime.
- Runtime Node: sin `export const runtime`. Prisma y `getServerSession` funcionan sin hacks edge.
- **Comportamiento HU-1.1 (mínimo):** presencia de sesión vía `getToken({ req, secret })`; si no hay token en ruta protegida → `NextResponse.redirect('/login')`. La matriz por rol es HU-1.2 (dejar punto de extensión `token.role`). Matcher actual se preserva.

### 2. NextAuth v4 + Next 16
- `src/lib/auth.ts`: completar `authorize` (ver pt. 4); callbacks `jwt`/`session` ya transportan `id`+`role` (shell correcto).
- Route handler `src/app/api/auth/[...nextauth]/route.ts`: `const handler = NextAuth(authOptions); export { handler as GET, handler as POST }`.
- Servidor: `getServerSession(authOptions)`. Cliente: `signIn`/`useSession` + `SessionProvider` en `layout.tsx`.
- **Riesgo R4:** garantizar que `authorize` retorna `role`; en `jwt` setear `token.role = user.role`.

### 3. Contrato de datos
- `loginSchema` ya en `src/lib/validations/auth.ts` (compartido, usado server+client).
- **Nuevo** `src/lib/auth/schemas.ts` (módulo auth): `registerSchema = z.object({ name: z.string().min(1), email: z.email(), password: z.string().min(8), role: z.enum(["admin","cashier"]) })`. Tipos derivados con `z.infer`.
- Bordes: validación Zod antes de BD; unicidad email; sin soft-delete en User.
- **Corrección de casing:** el enum `Role` de `schema.prisma` (`ADMIN`/`CASHIER`) se cambia a **minúsculas** (`admin`/`cashier`) para alinearse con la unión de `next-auth.d.ts` y evitar un mapper. (Dueño David, migración aún no aplicada.)

### 4. Server Action `registerUser`
- `src/actions/auth.ts` (`"use server"`): `getServerSession` → si no admin → `failure("FORBIDDEN"|"UNAUTHORIZED")`. Validar con `registerSchema`. `bcrypt.hash(pw, 10)` → `prisma.user.create`. Email duplicado → capturar `P2002` → `failure("DUPLICATE_EMAIL", "El email ya está registrado")`. `revalidatePath` no aplica (sin lista de usuarios en HU-1.1). Retorna `ActionResult<{id,email,role}>`.
- `authorize` delega a helper puro `src/lib/auth/authenticate.ts` (`{user|null}`) para testabilidad.

### 5. Seed del primer admin
- `prisma/seed.ts`: idempotente (`findUnique` por email; si existe, no crea). Crea `role:"admin"`, password `bcrypt.hash("admin123",10)`.
- Config: en `prisma.config.ts` agregar `migrations: { seed: "tsx prisma/seed.ts" }`. Ejecutar `npx prisma db seed` (Prisma 7 **no** auto-seedea en migrate).
- Agregar `tsx` como devDependency.

### 6. Login UI
- `src/app/(auth)/login/page.tsx`: client component `"use client"` con `react-hook-form` + `zodResolver(loginSchema)`. `signIn("credentials",{ email, password, redirect:false })` → estados `loading`/`error` ("Credenciales inválidas"). Éxito → `router.push(callbackUrl || "/dashboard")`; `page.tsx` redirige por sesión. Estilo `.STYLES.md` (flat, sin sombras, bordes 1px, foco accent).

### 7. Migración init
- `npm run db:migrate -- --name init` (dueño David, coordinado, contenedor PostgreSQL arriba: `docker ps`). `npm run db:generate` ya funciona. Atómica, 17 modelos.

### 8. Testing
- **Backend:** unit de `schemas.ts`; integración Vitest + PostgreSQL Docker de `authenticate` (R-2/R-3) y `registerUser` (R-4). Coverage ≥80% sobre superficie.
- **Frontend:** E2E Playwright scenario B (login ok/falla + redirect por rol) con admin semilla.

## División Backend / Frontend (2 flujos SDD)

| Flujo | Archivos |
|---|---|
| **Backend** (tasks→apply→verify→archive) | `src/lib/auth.ts`, `src/lib/auth/schemas.ts` (N), `src/lib/auth/authenticate.ts` (N), `src/actions/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` (N), `src/proxy.ts` (rename) + borrar `src/middleware.ts`, `prisma/seed.ts` (N), `prisma.config.ts`, `.env`*, `src/lib/validations/result.ts`\* (+`DUPLICATE_EMAIL`), `prisma/schema.prisma`\* (enum lowercase), `prisma/migrations/`, tests `src/lib/auth/*.test.ts` + `src/actions/auth.test.ts` |
| **Frontend** (tasks→apply→verify→archive) | `src/app/(auth)/login/page.tsx`, `src/app/layout.tsx`\* (`SessionProvider`), `package.json`\* (+`@hookform/resolvers`; `tsx` va en backend), `e2e/auth.spec.ts` |

\* = archivo caliente / coordinación. (N) = nuevo.

## Flujo de datos

```text
Browser ──login form──> /login (client: RHF+zodResolver)
        signIn("credentials") ──> /api/auth/* ── authorize()
                                        ├─ loginSchema (Zod) ──> prisma.user.findUnique
                                        └─ bcrypt.compare ──> JWT{id,role}
        /dashboard <── page.tsx (getServerSession redirect)
Admin ──registerUser SA──> /actions/auth.ts ──> prisma.user.create (bcrypt.hash)
proxy.ts: ruta protegida sin token ──> redirect /login
```

## Matriz de amenazas (Applicability-Driven)

| Boundary | Aplicabilidad | Razón |
|---|---|---|
| Documentation-like paths | N/A | No se clasifica ni ejecuta archivos por ruta. |
| Git repo selection | N/A | Sin comandos `git` en el diseño. |
| Commit state | N/A | Sin automatización de commit. |
| Push state | N/A | Sin push/PR automation. |
| PR commands | N/A | Sin comandos de PR. |

No se inventan RED tests: el cambio no toca fronteras de shell/VCS.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| PostgreSQL caído al migrar | `docker ps` / `compose up -d` antes de apply |
| `@hookform/resolvers` vs Zod v4 | Compatible (auto-detecta v4); instalar latest |
| `NEXTAUTH_SECRET` débil | `crypto.randomBytes(32)`; nunca hardcodear |
| `token.role` undefined (R4) | Tipado estricto + test de integración |
| Enum casing desalineado | Cambiar `Role` a minúsculas antes de migrar |

## Archivos calientes afectados (aviso compañero)

| Archivo | Acción | Coordinación |
|---|---|---|
| `src/middleware.ts` → `src/proxy.ts` | Rename + Node runtime | Sí (hot) |
| `src/lib/auth.ts` | Completar authorize | Dueño David |
| `package.json` | +`@hookform/resolvers` (FE) / +`tsx` (BE) | Sí (hot) |
| `.env` | +`NEXTAUTH_URL`/`NEXTAUTH_SECRET` | Sí |
| `src/lib/validations/result.ts` | +`DUPLICATE_EMAIL` | Sí (shared) |
| `src/app/layout.tsx` | +`SessionProvider` | Sí (hot) |
| `prisma/migrations/`, `prisma/schema.prisma` | init + enum | Dueño David |
| `prisma/seed.ts` (N), `prisma.config.ts` | seed | Dueño David |
