# Plan de Trabajo — David · Módulos 1, 3, 4 y 6 (Auth, Ventas/Caja, Compras, Dashboard)

> **Proyecto:** Sistema POS (`proyecto-pos`) · **Repositorio:** `github.com/davidelcastillo/SistemaPOS`
> **Este archivo es tu CONTRATO DE TRABAJO.** Pasáselo a TU agente de Opencode/Gentle-AI como instrucción de trabajo antes de ejecutar cualquier HU.
> **Contraparte:** tu amigo (dueño de Módulos 2 y 5). Nunca toques sus archivos.

---

## 1. Contexto del proyecto

- **Stack:** Next.js 16.3.1 (App Router) + TypeScript + Prisma 7.9.1 (adapter-pg, `prisma.config.ts`) + PostgreSQL (Docker) + NextAuth v4 (JWT + bcrypt) + Tailwind v4 + Zod v4 + SWR.
- **Roles:** `admin` y `cashier`. **No existe** rol `branch_user` ni portal externo (fuera de alcance).
- **Fase 0 COMPLETADA y archivada** (SDD Estructural). Ya existe:
  - Estructura `src/app/(routes)/<modulo>/` + `(auth)`, `src/actions/<modulo>.ts`, `src/lib/<modulo>/`, `src/lib/validations/`.
  - Shells de Server Actions por módulo (`src/actions/auth.ts`, `ventas.ts`, `compras.ts`, `dashboard.ts`), `src/middleware.ts` (matriz de roles), `src/lib/auth.ts`, `src/lib/prisma.ts`, tipos `src/types/next-auth.d.ts`.
  - Contrato compartido: `ActionResult<T>` + validaciones base en `src/lib/validations/` (`result.ts`, `ids.ts`, `pagination.ts`, `payment.ts`, `auth.ts`).
  - `schema.prisma` con el modelo completo del dominio (17 modelos, SIN migrar aún).
  - Mapa de exposición definitivo: `docs/mapa-exposicion.md`.
- **Metodología obligatoria:** `docs/Desarrollo-Modular-IA.md` + `AGENTS.md` (raíz). SDD completo por HU: `explore → propose → spec → design → tasks → apply → verify → archive`.

---

## 2. Tu alcance (módulos que te pertenecen)

### M1 — Autenticación y Control de Accesos (FUNDACIONAL — arrancá acá)
- **HU-1.1** Autenticación y manejo de credenciales con NextAuth (Credentials Provider, bcrypt salt 10, JWT con rol, formulario `/login` con estados de carga y errores descriptivos).
  - **Responsabilidad única TUYA:** ejecutar la **migración inicial** de Prisma (schema completo de Fase 0) — `npm run db:migrate -- --name init`. Coordinar con tu amigo ANTES de ejecutarla.
  - Completar `.env`: `NEXTAUTH_URL` y `NEXTAUTH_SECRET` (hoy solo existe `DATABASE_URL`).
  - Decidir en el design: `middleware.ts` → `proxy.ts` (Next 16 deprecó el nombre; el apply de Fase 0 dejó `middleware.ts` funcionando con warning) y validar NextAuth v4 + Next 16 edge runtime.
- **HU-1.2** Restricción de rutas y middleware por rol: no autenticado → `/login`; `cashier` → solo `/login`, `/ventas`, `/inventario` (+ `/compras` GET por decisión de negocio); `admin` → acceso global.

### M3 — Punto de Venta, Caja Diaria y Ventas (`/ventas`)
- **HU-3.1** Control de caja diaria (apertura con monto inicial, cierre con arqueo y saldo esperado; bloquea compras/ventas si no hay caja abierta).
- **HU-3.2** Wizard Paso 1: búsqueda textual + selección de producto/variante con validación de stock.
- **HU-3.3** Wizard Paso 2: descuentos acumulativos (conecta con el motor de M5 de tu amigo).
- **HU-3.4** Wizard Paso 3: método de pago (cash / mp_transfer / mp_posnet — integración MP deshabilitada, solo estructura) + `$transaction` atómica (venta + ítems + descuentos + stock).
- **HU-3.5** Listado histórico en `/ventas` con filtro por día/jornada.

### M4 — Gestión de Compras a Proveedores y Egresos (`/compras`)
- **HU-4.1** Vincular compra con caja diaria y egresos (requiere caja abierta; egreso en efectivo descuenta el saldo).
- **HU-4.2** Wizard Paso 1: búsqueda textual + carga de productos/variantes con cantidad y costo unitario. **Incluye la decisión de negocio:** se pueden CREAR productos desde el modal (reusando el modal de creación de `/inventario` de tu amigo) — está dentro de esta HU, sin HU separada.
- **HU-4.3** Wizard Paso 2: método de pago al proveedor (cash / transfer) + `$transaction` (cabecera + ítems + incremento de stock).
- **HU-4.4** Listado histórico y auditoría en `/compras` (paginado, filtro por fecha/jornada). **Cashier SOLO LECTURA** (decisión de negocio: ver lista/detalle; crear compra es solo admin server-side).

### M6 — Dashboard, Métricas y Reportes (`/dashboard`) — SOLO ADMIN
- **HU-6.1** KPIs (Total Ventas, Egresos/Compras, Ganancia Neta) + desglose por los 3 métodos de pago, con SWR y refresh.
- **HU-6.2** Historial detallado con paginación server-side y filtros combinables (fecha, estado de caja, método de pago, búsqueda textual).
- **HU-6.3** Detalle interno de transacción + reimpresión de ticket 80mm con marca de agua "Copia".
- **HU-6.4** Anulación de venta con reversión atómica de stock (`$transaction`: soft-delete + stock + caja).

> Orden interno: M1 → M3 → M4 → M6 (M3 y M4 dependen de caja; M6 depende de ventas/compras).

---

## 3. Estructura de archivos (tus zonas)

| Archivo | Acción | Rol |
| --- | --- | --- |
| `src/app/(auth)/login/page.tsx` | Modificar | Login M1 |
| `src/app/api/auth/[...nextauth]/route.ts` | Crear | NextAuth M1 |
| `src/app/(routes)/ventas/page.tsx` | Modificar | Página M3 |
| `src/app/(routes)/compras/page.tsx` | Modificar | Página M4 |
| `src/app/(routes)/dashboard/page.tsx` | Modificar | Página M6 |
| `src/actions/auth.ts`, `ventas.ts`, `compras.ts`, `dashboard.ts` | Modificar (shells existen) | Server Actions |
| `src/lib/auth.ts`, `src/middleware.ts` | Modificar (shells existen) | Auth M1 (tus archivos calientes) |
| `src/lib/ventas/`, `src/lib/compras/`, `src/lib/dashboard/` | Crear | Lógica pura + schemas |
| `src/app/api/ventas/search/route.ts`, `.../route.ts` | Crear | Route Handlers GET (SWR) |
| `src/app/api/compras/search/route.ts`, `.../route.ts` | Crear | Route Handlers GET (SWR) |
| `src/app/api/dashboard/kpis/route.ts`, `.../tickets/[id]/print/route.ts` | Crear | Route Handlers GET (SWR/PDF) |
| `src/components/ventas/`, `src/components/compras/`, `src/components/dashboard/` | Crear | Componentes |
| `src/lib/validations/` (compartido) | Agregar schemas SOLO con coordinación | Contrato compartido |
| `prisma/schema.prisma` + migraciones | **Dueño único: vos** | Migración init en HU-1.1 |

### PROHIBIDO (archivos de tu amigo)
- `src/actions/inventario.ts`, `src/actions/descuentos.ts`
- `src/app/(routes)/inventario/`, `.../inactivos/`, `.../descuentos/` (y sus componentes/lib)
- `src/app/api/inventario/*`, `src/app/api/descuentos/*`
- Si M3/M4 necesitan datos de productos, IMPORTÁS la lógica/consulta de tu amigo, no la reescribís.

---

## 4. Cómo exponer tu lógica (mapa de exposición)

| Operación | Exposición | Ubicación | Prueba |
| --- | --- | --- | --- |
| login/logout/sesión | NextAuth `/api/auth/*` + middleware | `src/lib/auth.ts`, `src/middleware.ts` | E2E + Vitest integración |
| registro | SA `registerUser` | `src/actions/auth.ts` | Vitest integración PostgreSQL |
| abrir/cerrar caja, procesar venta | **Server Actions** (`$transaction`) | `src/actions/ventas.ts` | Vitest integración PostgreSQL |
| búsqueda paso 1 (SWR) | **GET** `/api/ventas/search?q=` | `src/app/api/ventas/search/route.ts` | API tests |
| historial ventas (SWR) | **GET** `/api/ventas?date=&page=` | `src/app/api/ventas/route.ts` | API tests |
| crear compra (stock+, egreso) | SA `createPurchase` (**solo admin**) | `src/actions/compras.ts` | Vitest integración PostgreSQL |
| búsqueda modal + historial compras | **GET** `/api/compras/search`, `/api/compras` | `src/app/api/compras/*` | API tests |
| KPIs + agregaciones (SWR) | **GET** `/api/dashboard/kpis?from=&to=` | `src/app/api/dashboard/kpis/route.ts` | API tests |
| anulación venta (reversión atómica) | SA `voidSale` (**solo admin**) | `src/actions/dashboard.ts` | Vitest integración PostgreSQL |
| reimpresión ticket 80mm | **GET** `/api/dashboard/tickets/[id]/print` (PDF) | `src/app/api/dashboard/tickets/[id]/print/route.ts` | API tests |

Reglas: mutaciones → Server Actions; lecturas reactivas → Route Handlers GET; validación de rol SIEMPRE en el servidor. Toda mutación multi-paso con `$transaction` (venta: Sale+Items+stock+caja; compra: Purchase+Items+stock+caja; anulación: soft-delete+stock+caja).

---

## 5. Contrato de datos

- Reusá `ActionResult<T>` (`src/lib/validations/result.ts`) para TODAS las respuestas de acciones: bordes tipados (validación, operación fallida, estados vacíos, concurrencia, unicidad, soft-delete).
- Schemas Zod: `src/lib/<modulo>/schemas.ts` (propios) y `src/lib/validations/` SOLO si son compartidos (con coordinación).
- Búsquedas: `contains` + `mode: 'insensitive'` con debounce 300 ms; **sin lectores de código de barras** (restricción del negocio).
- Métodos de pago: `cash`, `mp_transfer`, `mp_posnet` (estructura lista; integración MP deshabilitada).

---

## 6. Orden de trabajo (SDD por módulo)

Para CADA módulo, con pre-flight SDD (modo interactivo, artifact store both, ask-on-risk, 400 líneas):

1. **M1 (Auth):** HUs 1.1 → 1.2. Incluye migración init de Prisma y `.env` completo. Destraba middleware por rol, caja, ventas y dashboard.
2. **M3 (Ventas/Caja):** HUs 3.1 → 3.2 → 3.3 → 3.4 → 3.5 (3.1 destraba las demás).
3. **M4 (Compras):** HUs 4.1 → 4.2 → 4.3 → 4.4.
4. **M6 (Dashboard):** HUs 6.1 → 6.2 → 6.3 → 6.4.

Reglas SDD: delegar el trabajo pesado a los sub-agentes `sdd-*`; revisar el resumen de cada fase; si el forecast de `sdd-tasks` supera 400 líneas, frenar y decidir PRs encadenados (coordinación con tu amigo antes de abrir PRs en la cadena).

---

## 7. Testing (gates obligatorios)

- **Unit:** lógica pura (`src/lib/ventas/`, `src/lib/compras/`, `src/lib/dashboard/`) con Vitest (`npm test`).
- **Integración:** Server Actions contra PostgreSQL Docker — flujos completos (registro → login; abrir caja → venta con descuento → cierre con arqueo; compra → incremento stock; anulación → reversión).
- **API tests:** Route Handlers GET de ventas/compras/dashboard/kpis/tickets.
- **E2E (Playwright):** login, navegación por rol (cashier vs admin), venta completa, cierre de caja, anulación con confirmación.
- **Cobertura:** mantener ≥80% sobre la superficie probada de TUS módulos (gate DoD, ver `docs/mapa-exposicion.md`).
- Correr `npm test` antes de cada `sdd-apply` y E2E antes de `sdd-verify`.

---

## 8. Definition of Done (por HU)

- [ ] Tests de la HU verdes (unit, integración y E2E si aplica).
- [ ] Documentación actualizada (`docs/<modulo>.md`).
- [ ] Artefacto SDD archivado con `sdd-archive`.
- [ ] Revisión cruzada de tu amigo y PR validado con su receipt (repo compartido).
- [ ] Cobertura ≥80% sobre tu superficie.

---

## 9. Dependencias con tu amigo (coordinación obligatoria)

- **Tu amigo depende de vos:** la migración init (HU-1.1) y el middleware funcional (HU-1.2) para poder testear su integración contra la BD y proteger sus rutas. Cuando cierres HU-1.1, avisale para que arranque M2.
- **Vos dependés de él:** HU-3.2/4.2 necesitan sus productos/variantes (M2) y HU-3.3 su motor de descuentos (M5).
- **Reglas de coordinación:**
  - `prisma/schema.prisma` + migraciones: dueño único VOS; pedile a él cualquier cambio de modelo y aplicá la migración.
  - No toques `src/actions/inventario.ts` ni `descuentos.ts`; importá su lógica si la necesitás.
  - El `package.json` (dependencias nuevas) se modifica con acuerdo del equipo.
  - Nunca edites una migración ya aplicada; crear una nueva.

**Secuencia recomendada:** HU-1.1 (vos) → HU-1.2 (vos) → aviso a tu amigo → HU-2.x (amigo) → HU-3.x/4.x (vos) → HU-5.x (amigo) → HU-6.x (vos).