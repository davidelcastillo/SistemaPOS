# Delta para Module Exposure — AUTH-HU1-1

## MODIFIED Requirements

### Requirement: R-2 — Mapa por módulo

Cada módulo MUST exponer según el mapa del proposal: Auth (SA `registerUser` solo admin + NextAuth login/logout vía route handler `/api/auth/*` + request interception en `proxy.ts`); Inventario (SA CRUD/soft-delete + GET búsqueda); Ventas/Caja (SA caja + venta + GET búsqueda/historial); Compras (SA crear compra + GET modal/historial); Descuentos (SA CRUD + switch + motor puro); Dashboard (SA anulación + GET KPIs/ticket).
(Previously: Auth usaba `middleware.ts`; ahora el request interception vive en `proxy.ts` — Next 16)

#### Scenario: Dashboard

- GIVEN el módulo dashboard
- WHEN se consultan KPIs
- THEN se exponen por Route Handler GET
- AND la anulación de venta es un Server Action

#### Scenario: Login/logout de Auth

- GIVEN el módulo auth
- WHEN un cliente inicia o cierra sesión
- THEN la operación se expone por el route handler `/api/auth/*`
- AND la protección de rutas se evalúa en `proxy.ts`

#### Scenario: Registro de Auth

- GIVEN el módulo auth
- WHEN un admin crea un usuario
- THEN la operación es la Server Action `registerUser`
- AND se valida rol admin server-side antes de insertar