# Base Config Specification

## Purpose

Configuración base de tooling: Playwright ejecutable con smoke de redirect, coverage Vitest con umbral en el DoD, lint de `docs/` limpio y verificación de configs existentes. La migración inicial de Prisma NO es parte de esta capability (se aplica en el design de Auth).

## Requirements

### Requirement: R-1 — Playwright configurado y ejecutable

`npm run test:e2e` MUST ser ejecutable: `playwright.config.ts` con `webServer` (dev server), `baseURL`, proyecto chromium y `testDir`. Requiere `npx playwright install chromium`.

#### Scenario: E2E levanta el dev server

- GIVEN `playwright.config.ts` configurado
- WHEN se ejecuta `npm run test:e2e`
- THEN Playwright levanta el dev server, corre los specs y reporta resultados

### Requirement: R-2 — Smoke de redirect en `/`

La suite e2e MUST incluir un smoke base sobre `/`: sin sesión redirige a `/login`; con sesión activa redirige al destino autenticado (`/dashboard`).

#### Scenario: Usuario no autenticado

- GIVEN un visitante sin sesión
- WHEN navega a `/`
- THEN es redirigido a `/login`

#### Scenario: Usuario autenticado

- GIVEN una sesión válida de admin
- WHEN navega a `/`
- THEN es redirigido a `/dashboard`

### Requirement: R-3 — Coverage en el DoD con umbral 80%

`@vitest/coverage-v8` MUST instalarse y configurarse en `vitest.config.mts` con umbral mínimo de 80% (statements, branches, functions, lines). El coverage es gate del DoD.

#### Scenario: Cobertura bajo el umbral

- GIVEN una suite con cobertura < 80%
- WHEN se ejecuta `npm test`
- THEN el comando falla indicando el umbral no alcanzado

#### Scenario: Cobertura en o sobre el umbral

- GIVEN cobertura ≥ 80%
- WHEN se ejecuta `npm test`
- THEN la suite pasa y se genera el reporte de coverage

### Requirement: R-4 — Lint limpio incluyendo `docs/`

El lint MUST pasar incluyendo `docs/` (3 errores markdown existentes corregidos: `docs/AGENTS.md` ×2, `docs/HU-proyectoPOS.md` ×1). `docs/` MUST NOT ignorarse en ESLint.

#### Scenario: Errores markdown corregidos

- GIVEN 3 errores markdown en docs/
- WHEN se corrige el markdown
- THEN `npm run lint` pasa sin ignorar la carpeta

### Requirement: R-5 — Configs existentes verificadas

`tsconfig.json` (strict, alias `@/*`), `eslint.config.mjs`, `vitest.config.mts` y `next.config.ts` existentes MUST permanecer verdes: `tsc --noEmit` y `npm test` sin regresión tras la Fase 0.

#### Scenario: Sin regresión de typecheck

- GIVEN los configs existentes del scaffold
- WHEN se ejecuta `tsc --noEmit` tras la Fase 0
- THEN no aparecen errores de tipos nuevos
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
