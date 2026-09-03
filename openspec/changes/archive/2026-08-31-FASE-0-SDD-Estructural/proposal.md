# Proposal: FASE 0 – SDD Estructural (Sistema POS)

## Intent

Bases arquitectónicas del POS previas a la primera HU: estructura por módulo, config base, modelo relacional macro, mapa de exposición y contrato de datos tipado.

## Scope

### In Scope

- Estructura por módulo: `(auth)`, `(routes)/<modulo>`, `components/<modulo>`, `actions/<modulo>.ts`, `lib/<modulo>/` + `schemas.ts`, `lib/validations/`, `middleware.ts`; 6 módulos del dominio.
- Config base: `playwright.config.ts` + spec smoke (`test:e2e` no ejecutable); lint `docs/` limpio (3 errores markdown; lint es gate); `@vitest/coverage-v8` + thresholds solo si el DoD lo exige.
- Decisiones arquitectónicas (abajo): modelo macro, mapa de exposición, contrato Zod, módulo fundacional; `layout.tsx`/`page.tsx` sin boilerplate.

**Supuestos (resueltos):** solo `admin`/`cashier` (sin `branch_user` ni `/sucursal/*`); cashier en `/compras` solo lectura (escribir = admin); `Provider` en modelo sin CRUD (asociado al crear compra); portal externo fuera; crear producto desde modal de compra en HU-4.2.

### Out of Scope

- Portal externo; CRUD de proveedores en pantalla; API Mercado Pago (solo estructura, HU-3.4).
- Implementación funcional de módulos 2–6 (SDDs posteriores).
- Entidad Sucursal y tablas Movimiento/Stock: sucursal única; stock en `Variant`; movimientos derivados de ítems/caja.

## Capabilities

- **New:** `project-structure` (directorios), `base-config` (Playwright/lint/coverage/metadata), `data-model` (modelo Prisma), `data-contract` (Zod), `module-exposure` (SA vs GET + prueba).
- **Modified:** None (greenfield, sin specs previas).

## Approach

Route groups por módulo + atributos dinámicos N:N (`Attribute/AttributeValue`, HU-2.2). Mutaciones → Server Actions (`$transaction`, Zod, `revalidatePath`); lecturas SWR → GET; lógica pura → `lib/<modulo>/`.

## Modelo relacional macro

User 1—N {CashRegister, Sale, Purchase}; Category 1—N Product; Product 1—N Variant; Attribute/AttributeValue N:N Variant; Variant (SKU, stock) 1—N {SaleItem, PurchaseItem}; CashRegister 1—N {Sale, Purchase}; Sale 1—N SaleItem; Purchase 1—N {PurchaseItem, Provider}; Provider 1—N Purchase; Discount N:N {Category, Product, Variant} + min_quantity.

## Mapa de exposición

- Auth: SA registro; NextAuth login/logout + middleware → integ/E2E.
- Inventario: SA CRUD/soft-delete; GET búsqueda → integ/API.
- Ventas/Caja: SA caja + venta; GET búsqueda/historial → integ/API.
- Compras: SA crear compra; GET modal/historial → integ/API.
- Descuentos: SA CRUD + switch; motor puro → integ/unit.
- Dashboard: SA anulación; GET KPIs + ticket → integ/API.

## Contrato de datos tipado

`lib/validations/`: compartidos (auth, paginación, pagos, ids), solo con coordinación; `lib/<modulo>/schemas.ts`: del módulo (dueño). Tipos `z.infer`. Bordes: errores descriptivos (HU-1.1), estados vacíos, concurrencia (stock, caja abierta, `$transaction`), unicidad (categoría, SKU), soft-delete (`is_active`).

## Módulo fundacional: Auth

Destraba middleware por rol (protege los 5 módulos), caja/ventas/compras (operador autenticado), dashboard/descuentos (admin). Stack trae NextAuth v4 + bcrypt. HU iniciales: **HU-1.1** (login, bcrypt, JWT `id`+`role`) y **HU-1.2** (middleware). Primer slice: registro/login Zod + bcrypt + JWT + middleware.

## Affected Areas

`src/app/(routes)/*`+`(auth)` (New); `src/components/<modulo>/` (New); `src/actions/*.ts`+`src/lib/<modulo>/`+`validations/` (New); `src/middleware.ts`+`src/lib/auth.ts` (New, hot); `prisma/schema.prisma` (Modified); `playwright.config.ts`/`vitest.config.mts` (New/Modified); `layout.tsx`/`page.tsx` (Modified, hot); `docs/*.md` lint (Modified).

## Risks

- Coverage sin decisión del equipo → Med; condicionar al DoD.
- Cashier edite `/compras` → Med; validación de rol server-side.
- Tests integración requieren Docker PostgreSQL → Med; documentar setup local.

## Rollback Plan

Aditiva: `git revert` restaura el scaffold. `schema.prisma` sin migración destructiva (migración inicial en design de Auth). `package.json` restaurable desde lockfile.

## Dependencies

PostgreSQL local (Docker); `npx playwright install chromium`; acuerdo del equipo en archivos calientes y coverage.

## Success Criteria

- [ ] `npm test`, `tsc --noEmit` y lint verdes (incl. docs/).
- [ ] `npm run test:e2e` ejecutable con spec smoke.
- [ ] `src/` cumple la convención por módulo; `schema.prisma` con modelos macro; mapa y política Zod consistentes con AGENTS.md.