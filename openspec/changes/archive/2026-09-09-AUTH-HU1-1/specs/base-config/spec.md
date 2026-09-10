# Delta para Base Config — AUTH-HU1-1

## ADDED Requirements

### Requirement: R-6 — `.env` completo con variables NextAuth

El `.env` MUST definir `NEXTAUTH_URL` (URL canónica, `http://localhost:3000` en dev) y `NEXTAUTH_SECRET` (32 bytes aleatorios generados con `crypto.randomBytes`, base64). `NEXTAUTH_SECRET` MUST NOT hardcodearse ni versionarse; sin él, NextAuth MUST NOT firmar JWT válidos.

#### Scenario: Entorno con secret válido

- GIVEN `.env` con `NEXTAUTH_URL` y `NEXTAUTH_SECRET` generado
- WHEN se inicia la app y se autentica un usuario
- THEN NextAuth firma el JWT y la sesión es válida

#### Scenario: Secret ausente o débil

- GIVEN `.env` sin `NEXTAUTH_SECRET` o con valor hardcodeado
- WHEN se inicia la app
- THEN NextAuth falla o emite advertencia de secret insuficiente
- AND ningún JWT se emite correctamente

### Requirement: R-7 — Proxy renombrado desde middleware (Next 16)

El archivo `src/middleware.ts` MUST renombrarse a `src/proxy.ts` (codemod oficial `middleware-to-proxy`), con la función `middleware()` → `proxy()` y el `export const config` conservado (el codemod NO lo renombra a `proxyConfig` — ver design §1). Proxy MUST ejecutar en runtime Node.js (sin workarounds edge) y usar la misma API `NextRequest`/`NextResponse`.

#### Scenario: Rename sin regresión

- GIVEN el shell de middleware existente (Fase 0)
- WHEN se ejecuta el codemod `middleware-to-proxy`
- THEN existe `src/proxy.ts` con `proxy()` y `export const config`
- AND desaparece `src/middleware.ts`

#### Scenario: Runtime Node habilitado

- GIVEN `src/proxy.ts` renombrado
- WHEN la app compila y corre
- THEN no hay warning de deprecación de middleware
- AND `getServerSession`/Prisma funcionan sin hacks edge

#### Scenario: Comportamiento de redirect preservado

- GIVEN el matcher y los redirects previos (público `/login`, `/api/auth`)
- WHEN una petición a ruta protegida sin sesión llega al proxy
- THEN redirige a `/login` igual que antes del rename