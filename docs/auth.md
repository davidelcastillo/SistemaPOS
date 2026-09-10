# Módulo Auth — Autenticación y Control de Accesos (HU-1.1)

> **Módulo 1 (Auth)** · Dueño: David · Estado: implementado (backend + frontend HU-1.1).

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
        /dashboard <── page.tsx (getServerSession redirect)
```

- `authorize` retorna `null` para credenciales inválidas (Zod, password, email)
  sin revelar si el email existe (R-2).
- El callback `jwt` setea `token.role` desde el usuario autenticado (R-3/R-4).
- `proxy.ts`: ruta protegida sin token → `NextResponse.redirect('/login')`.

## Frontend (HU-1.1, R-5)

- **`src/app/(auth)/login/page.tsx`**: client component con `react-hook-form` +
  `zodResolver(loginSchema)` (`src/lib/validations/auth.ts`, compartido con el
  server). Valida antes de llamar a la red; `signIn("credentials", { redirect: false })`
  mantiene el control de estados en la página (loading en el botón, error
  "Credenciales inválidas"). Éxito → `router.push(callbackUrl || "/dashboard")`
  (misma semántica que el redirect de `src/app/page.tsx`; la matriz por rol es
  HU-1.2). Estilo `.STYLES.md` (flat, bordes 1px, foco accent, sin sombras).
- **`src/components/providers.tsx`**: wrapper client que monta `SessionProvider`
  en `src/app/layout.tsx` (patrón oficial NextAuth v4 App Router — importar
  `SessionProvider` directo desde un Server Component falla con "React Context
  is unavailable in Server Components").
- **E2E**: `e2e/auth.spec.mts` (login ok admin/cashier → /dashboard, malas
  credenciales → error sin salir de /login, campos inválidos sin llamar signIn)
  + scenario B activado en `e2e/smoke.spec.ts` (admin → /dashboard). El fixture
  cashier vive en `e2e/fixtures/cashier.ts` (script `tsx`, ver nota ESM abajo).

### Nota técnica — Prisma ESM + Playwright

El cliente Prisma 7 generado es ESM-only (`import.meta`), y el transform CJS de
Playwright no lo carga desde un spec. Por eso el fixture de E2E se ejecuta con
`tsx` (`e2e/fixtures/cashier.ts`, mismo patrón que `prisma/seed.ts`) y el spec
es `.mts`. Además, Turbopack compila las rutas API de forma lazy: el primer hit
a `/api/auth/*` puede superar el timeout por defecto — el spec hace warm-up en
`beforeAll` y usa timeouts de 30s en las aserciones de URL.

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
- E2E Playwright: `e2e/auth.spec.mts` + `e2e/smoke.spec.ts` (login ok/falla + redirect por sesión).
- Gates: `npm test` (coverage ≥80%), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test`.

## Próximos pasos

- **HU-1.2**: matriz de roles en `proxy.ts` (`token.role`) y destino post-login por rol.
