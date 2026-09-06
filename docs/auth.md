# Módulo Auth — Autenticación y Control de Accesos (HU-1.1)

> **Módulo 1 (Auth)** · Dueño: David · Estado: implementado (flujo backend HU-1.1).
> La UI `/login` y el `SessionProvider` pertenecen al flujo frontend (2º flujo SDD).

## Alcance

Autenticación fundacional del POS con NextAuth v4 sobre Next.js 16:

- **Credentials Provider** con `authorize` (Zod → `findUnique` → bcrypt r10).
- **JWT/sesión** que transporta `id` y `role` (`admin`/`cashier`).
- **Server Action `registerUser`** (solo admin, bcrypt r10, unicidad de email).
- **Migración `init`** de Prisma (17 modelos, atómica).
- **Seed** del primer admin (idempotente).
- **`proxy.ts`** (Next 16) con redirect por sesión; matriz por rol en HU-1.2.

## Estructura

| Archivo | Rol |
|---|---|
| `src/lib/auth.ts` | `authOptions` (NextAuth v4): providers, callbacks JWT/session |
| `src/lib/auth/authenticate.ts` | Helper puro: loginSchema → findUnique → bcrypt.compare |
| `src/lib/auth/schemas.ts` | `registerSchema` + `RegisterInput` (contrato Zod del módulo) |
| `src/actions/auth.ts` | Server Action `registerUser` (admin-only) |
| `src/app/api/auth/[...nextauth]/route.ts` | Route handler NextAuth (GET/POST) |
| `src/proxy.ts` | Request interception (Next 16); redirect por sesión |
| `prisma/seed.ts` | Seed idempotente del primer admin |
| `prisma/migrations/20260906194453_init/` | Migración inicial (17 modelos) |

## Flujo de autenticación

```text
Browser ──signIn("credentials")──> /api/auth/* ── authorize()
                                         ├─ loginSchema (Zod)
                                         ├─ prisma.user.findUnique
                                         └─ bcrypt.compare ──> JWT { id, role }
```

- `authorize` retorna `null` para credenciales inválidas (Zod, password, email)
  sin revelar si el email existe (R-2).
- El callback `jwt` setea `token.role` desde el usuario autenticado (R-3/R-4).
- `proxy.ts`: ruta protegida sin token → `NextResponse.redirect('/login')`.

## Exposición

| Operación | Exposición | Prueba |
|---|---|---|
| login/logout/sesión | NextAuth `/api/auth/*` + `proxy.ts` | Vitest integración + E2E (frontend) |
| registro de usuario | SA `registerUser` (solo admin) | Vitest integración PostgreSQL |

## Seguridad

- Contraseñas SIEMPRE con `bcrypt` (salt rounds = 10).
- `registerUser` valida rol `admin` **server-side** (`getServerSession`).
- Email duplicado → `P2002` → `ActionResult` `DUPLICATE_EMAIL`.
- Validación Zod ANTES de cualquier acceso a BD.
- `NEXTAUTH_SECRET`: 32 bytes aleatorios (`crypto.randomBytes(32)`), nunca hardcodeado.

## Migración y seed

```bash
# Contenedor PostgreSQL arriba (docker ps)
npm run db:migrate -- --name init     # UNA migración atómica, 17 modelos
npx prisma db seed                     # idempotente: crea admin@pos.com si no existe
```

## Testing

- Unit: `schemas` (bordes registerSchema), `authOptions` (callbacks JWT/session).
- Integración PostgreSQL: `authenticate` (R-2/R-3) y `registerUser` (R-4).
- Gates: `npm test` (coverage ≥80%), `npx tsc --noEmit`, `npm run lint`.

## Próximos pasos

- **HU-1.2**: matriz de roles en `proxy.ts` (`token.role`).
- **Flujo frontend**: UI `/login` + `SessionProvider` + E2E Playwright.
