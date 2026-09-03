# Module Exposure Specification

## Purpose

Mapa de exposición por módulo: qué mecanismo expone la lógica de cada módulo (Server Actions para mutaciones, Route Handlers GET para lecturas SWR, lógica pura en `src/lib/<modulo>/`) y qué herramienta de prueba valida cada operación. El módulo fundacional es Auth (HU-1.1 + HU-1.2); su spec detallada se elabora en su propia fase/HU, no en esta.

## Requirements

### Requirement: R-1 — Política de exposición

Las mutaciones MUST exponerse como Server Actions (sin URL ni JSON, validación Zod server-side, `$transaction` y `revalidatePath`). Las lecturas reactivas con SWR MUST exponerse como Route Handlers GET. La lógica pura MUST vivir en `src/lib/<modulo>/`.

#### Scenario: Mutación transaccional

- GIVEN una venta (wizard)
- WHEN se consolida la operación
- THEN se expone como Server Action con `$transaction`

#### Scenario: Lectura reactiva

- GIVEN la búsqueda con debounce del paso 1 de ventas
- WHEN la UI consume datos vía SWR
- THEN el endpoint es un Route Handler GET

### Requirement: R-2 — Mapa por módulo

Cada módulo MUST exponer según el mapa del proposal: Auth (SA registro + NextAuth login/logout + middleware); Inventario (SA CRUD/soft-delete + GET búsqueda); Ventas/Caja (SA caja + venta + GET búsqueda/historial); Compras (SA crear compra + GET modal/historial); Descuentos (SA CRUD + switch + motor puro); Dashboard (SA anulación + GET KPIs/ticket).

#### Scenario: Dashboard

- GIVEN el módulo dashboard
- WHEN se consultan KPIs
- THEN se exponen por Route Handler GET
- AND la anulación de venta es un Server Action

### Requirement: R-3 — Cashier en /compras solo lectura

El rol `cashier` MUST tener acceso de solo lectura a `/compras`; la creación de compras MUST requerir rol `admin` con validación server-side.

#### Scenario: Cashier intenta escribir compra

- GIVEN un cashier autenticado
- WHEN intenta crear una compra
- THEN la operación se rechaza server-side por rol

### Requirement: R-4 — Herramienta de prueba por módulo

Cada operación MUST ser testeada con la herramienta del mapa: Server Actions y lógica pura → Vitest de integración contra PostgreSQL (Docker); Route Handlers GET → API tests (supertest); flujos de navegador (auth + middleware) → E2E Playwright.

#### Scenario: Integración de Server Action

- GIVEN la Server Action de crear compra
- WHEN se escribe su prueba
- THEN es un test de integración Vitest contra PostgreSQL

#### Scenario: API test de Route Handler

- GIVEN el GET de búsqueda de inventario
- WHEN se escribe su prueba
- THEN es un API test (supertest)

### Requirement: R-5 — Módulo fundacional Auth

Auth (HU-1.1 login/bcrypt/JWT y HU-1.2 middleware por rol) MUST ser el destino del primer ciclo de desarrollo; su spec detallada NO es parte de la Fase 0.

#### Scenario: Alcance de la Fase 0

- GIVEN la Fase 0 completada
- WHEN se inicia el primer ciclo por HU
- THEN el destino es Auth (HU-1.1 + HU-1.2) con su propia spec