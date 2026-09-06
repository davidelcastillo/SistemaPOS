# Proposal: AUTH-HU1-1 — Autenticación y manejo de credenciales (HU-1.1)

## Intent

Implementar la autenticación fundacional del POS con NextAuth v4 sobre Next.js 16: Credentials Provider con `authorize` (bcrypt salt 10 + Prisma), JWT/sesión que transporta `role` (`admin`/`cashier`), Server Action `registerUser` (solo admin), UI `/login` reactiva, migración `init` de Prisma (17 modelos) y completar `.env`. Destraba M3/M4/M6 y la migración del compañero (M2).

## Scope

### In Scope
- Credentials Provider + `authorize` (bcrypt 10, Prisma, validación Zod previa a BD).
- JWT callbacks `id`+`role` (cliente/servidor) y tipos `next-auth.d.ts`.
- Route handler `src/app/api/auth/[...nextauth]/route.ts`.
- Server Action `registerUser` (bcrypt + Zod + inserción; solo rol admin vía SA).
- UI `/login` (`react-hook-form` + `zodResolver` + estados carga/error "Credenciales inválidas").
- Migración `init` (`npm run db:migrate -- --name init`), atómica y coordinada.
- `.env`: `NEXTAUTH_URL` + `NEXTAUTH_SECRET` (generado con `crypto.randomBytes(32)`).
- `middleware.ts` → `proxy.ts` (codemod oficial Next 16, runtime Node).
- Seed del primer admin (script Prisma, documentado en design).
- Tests: integración (registerUser, authorize) + E2E (login → /dashboard).

### Out of Scope
- Registro público (`/register` fuera de alcance; alta solo vía SA admin).
- HU-1.2: restricción de rutas por rol (matriz en proxy).
- Cambio de contraseña (perfil de usuario futuro).
- Modificación de modelos (`data-model` ya completo; solo se aplica migración).

## Capabilities

### New Capabilities
- `auth`: autenticación NextAuth (credentials, JWT rol, bcrypt, registerUser, proxy, route handler, UI login).

### Modified Capabilities
- `base-config`: agregar requisito de `NEXTAUTH_URL` / `NEXTAUTH_SECRET` y `proxy.ts`.
- `project-structure`: R-4 hot files `middleware.ts` → `proxy.ts` + `proxyConfig`.
- `module-exposure`: R-2 Auth usa `proxy.ts` (no middleware) + route handler NextAuth.

## Approach

- **Back**: completar `src/lib/auth.ts` (`authorize` con `bcrypt.hash/compare` r10 y `prisma.user.findUnique`); `registerUser` valida Zod y rol admin antes de insertar. Crear route handler NextAuth. Aplicar migración `init` con contenedor levantado.
- **Front**: `src/app/(auth)/login/page.tsx` client component con `react-hook-form` + `zodResolver(loginSchema)`, `signIn("credentials")` y estados de carga/error. Instalar `@hookform/resolvers` (v4, compatible zod v4).
- **Proxy**: ejecutar `npx @next/codemod@latest middleware-to-proxy .`; renombrar `middleware()`→`proxy()` y `config`→`proxyConfig`. Runtime Node habilita Prisma y `getServerSession` sin edge hacks.
- **Seed**: script `prisma/seed.ts` que crea el primer admin; documentado en design.
- **Flujo SDD**: este proposal cubre design Front+Back; luego 2 flujos separados (backend tasks→apply→verify→archive; frontend igual).

## Affected Areas (archivos calientes — aviso compañero)

| Archivo | Acción |
| `src/middleware.ts`→`proxy.ts` | Rename + runtime Node (COORDINAR) |
| `src/lib/auth.ts` | Completar `authorize` (propio) |
| `package.json` | +`@hookform/resolvers` (COORDINAR) |
| `.env` | +`NEXTAUTH_URL`/`NEXTAUTH_SECRET` (COORDINAR) |
| `prisma/migrations/` | migración `init` (dueño David) |
| `src/app/api/auth/[...nextauth]/route.ts` | Nuevo (propio) |
| `src/actions/auth.ts` | `registerUser` (propio) |
| `src/app/(auth)/login/page.tsx` | UI (propio) |

## Risks

| Riesgo | Prob. | Mitigación |
| PostgreSQL caído al migrar | Med | `docker ps` / `compose up -d` antes de apply |
| `@hookform/resolvers` vs zod v4 | Baja | verificar compatibilidad Context7 al instalar |
| `NEXTAUTH_SECRET` débil | Baja | `crypto.randomBytes(32)`; no hardcodear |
| `authorize` sin `role` → token roto | Med | tipado estricto + test integración |

## Rollback Plan

Revertir commit de apply; borrar `prisma/migrations/*_init` y `prisma migrate reset` (dev). Proxy: revertir a `middleware.ts` si fuera necesario (no requerido si codemod limpio). `.env`: quitar variables añadidas.

## Dependencies

- Contenedor PostgreSQL Docker levantado; `@hookform/resolvers`; coordinación compañero (migración + package.json).

## Success Criteria

- [ ] Login admin/cashier con bcrypt r10 y JWT con `role` verificado por test.
- [ ] `/login` muestra errores descriptivos y estado de carga.
- [ ] Migración `init` aplica los 17 modelos sin error.
- [ ] `.env` completo; `proxy.ts` sin warning de deprecación.
- [ ] E2E login → /dashboard verde.
