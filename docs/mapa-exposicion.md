# Mapa de Exposición por Módulo — Sistema POS

> Definido en FASE 0 (design `openspec/changes/FASE-0-SDD-Estructural/design.md`).
> Política: **mutaciones → Server Actions** (sin URL ni JSON, Zod server-side,
> `$transaction`, `revalidatePath`); **lecturas reactivas SWR → Route Handlers
> GET**; **lógica pura → `src/lib/<modulo>/`**.

## Tabla definitiva

| Módulo | Operación | Exposición | Ubicación | Prueba |
|---|---|---|---|---|
| 1 Auth | login/logout/sesión | NextAuth `/api/auth/*` + middleware | `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts`, `src/middleware.ts` | E2E + Vitest integración |
| 1 Auth | registro | SA `registerUser` | `src/actions/auth.ts` | Vitest integración PostgreSQL |
| 2 Inventario | CRUD categorías/productos/variantes, soft-delete, reactivar | Server Actions (`$transaction`) | `src/actions/inventario.ts` | Vitest integración PostgreSQL |
| 2 Inventario | búsqueda debounce (SWR) | GET `/api/inventario/search?q=` | `src/app/api/inventario/search/route.ts` | API tests |
| 2 Inventario | listado inactivos | GET `/api/inventario/inactive` | `src/app/api/inventario/inactive/route.ts` | API tests |
| 3 Ventas/Caja | abrir/cerrar caja, procesar venta | Server Actions (`$transaction`) | `src/actions/ventas.ts` | Vitest integración PostgreSQL |
| 3 Ventas | búsqueda paso 1 (SWR) | GET `/api/ventas/search?q=` | `src/app/api/ventas/search/route.ts` | API tests |
| 3 Ventas | historial filtros (SWR) | GET `/api/ventas?date=&page=` | `src/app/api/ventas/route.ts` | API tests |
| 4 Compras | crear compra (stock+, egreso caja) | SA `createPurchase` (**solo admin**) | `src/actions/compras.ts` | Vitest integración PostgreSQL |
| 4 Compras | búsqueda modal + historial | GET `/api/compras/search`, `/api/compras` | `src/app/api/compras/{search,route}.ts` | API tests |
| 5 Descuentos | CRUD + switch `is_active` | Server Actions | `src/actions/descuentos.ts` | Vitest integración PostgreSQL |
| 5 Descuentos | motor de cálculo (puro) | `src/lib/descuentos/engine.ts` | — | Vitest unit |
| 5 Descuentos | listado reglas (SWR) | GET `/api/descuentos` | `src/app/api/descuentos/route.ts` | API tests |
| 6 Dashboard | KPIs + agregaciones (SWR) | GET `/api/dashboard/kpis?from=&to=` | `src/app/api/dashboard/kpis/route.ts` | API tests |
| 6 Dashboard | anulación venta (reversión atómica) | SA `voidSale` (**solo admin**) | `src/actions/dashboard.ts` | Vitest integración PostgreSQL |
| 6 Dashboard | reimpresión ticket 80mm | GET `/api/dashboard/tickets/[id]/print` (PDF) | `src/app/api/dashboard/tickets/[id]/print/route.ts` | API tests |

## Roles

- **Cashier en `/compras` solo lectura** (decisión resuelta): los GET de compras
  están abiertos a cashier; `createPurchase` valida rol `admin` **server-side**.
- Matriz de roles del middleware (HU-1.2): público `/login` + `/api/auth`;
  cashier `/ventas`, `/inventario`, `/compras` (GET); admin todo +
  `/inactivos`, `/descuentos`, `/dashboard` (solo admin).
- La validación de rol se hace SIEMPRE en el servidor (Server Action), nunca solo
  en la UI.

## Transacciones

Toda mutación multi-paso usa `$transaction` (venta: Sale+Items+stock+caja;
compra: Purchase+Items+stock+caja; anulación: soft-delete+stock+caja; alta
producto: Product+Variants+atributos).

---

## Plan de cobertura progresiva (gate DoD)

FASE 0 configura el umbral de **80%** (`@vitest/coverage-v8`) como gate del DoD
en `vitest.config.mts`. Con Vitest v4, el reporte mide **solo los archivos
importados por tests** (los shells sin tests — `lib/auth.ts`, `middleware.ts`,
páginas — no arrastran el porcentaje hasta que su módulo agregue pruebas).

Plan por módulo (desde Auth):

1. **Auth (HU-1.1/1.2)**: tests de integración de `registerUser`/`login` contra
   PostgreSQL + API tests → cubre `lib/auth.ts` + `middleware.ts` + acciones.
2. **Inventario (HU-2.x)**: integración de CRUD + API tests de search/inactive →
   cubre `actions/inventario.ts` y `lib/inventario/`.
3. **Ventas (HU-3.x)**: integración de caja/venta + API tests → cubre
   `actions/ventas.ts` y `lib/ventas/`.
4. **Compras (HU-4.x)**: integración de `createPurchase` + API tests → cubre
   `actions/compras.ts`.
5. **Descuentos (HU-5.x)**: unit del motor + integración de CRUD → cubre
   `lib/descuentos/` y `actions/descuentos.ts`.
6. **Dashboard (HU-6.x)**: API tests de KPIs/ticket + integración de `voidSale`
   → cubre `actions/dashboard.ts`.

Cada módulo debe mantener ≥80% sobre su superficie probada antes de cerrar su
Definition of Done. El reporte de FASE 0 es la línea base (solo `utils` +
validaciones compartidas).