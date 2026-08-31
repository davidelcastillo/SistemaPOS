# Exploration: FASE 0 – SDD Estructural (Sistema POS)

> Cambio: `FASE-0-SDD-Estructural` | Proyecto: `proyecto-pos` | Fase: explore
> Fuente de verdad del dominio: `docs/HU-proyectoPOS.md` (297 líneas, 6 módulos, 22 HUs).
> Contexto previo: `sdd-init/proyecto-pos` (Engram obs #250) — scaffold temprano, Strict TDD activo (`npm test`).

## Current State

Scaffold de Create Next App recién inicializado. Existe: `src/app/{page,layout}.tsx` (boilerplate sin tocar), `src/lib/prisma.ts` (singleton PrismaPg, hot file), `src/lib/utils.ts` (+test), `src/test/setup.ts`, `src/components/__tests__/example.test.tsx`, `prisma/schema.prisma` (SIN modelos: solo generator + datasource), `prisma.config.ts` (DATABASE_URL desde env). Configs presentes y correctos: `tsconfig.json` (strict, alias `@/*` → `./src/*`), `eslint.config.mjs` (js+ts+react+json+markdown+css), `vitest.config.mts` (jsdom, setup, alias), `next.config.ts` (reactCompiler), `postcss.config.mjs` (Tailwind v4).

**Ausencias verificadas**: NO existe `src/middleware.*`, `src/actions/`, `src/app/**/route.ts`, `src/lib/auth.ts`, route groups `(routes)`, `playwright.config.*`, `openspec/`, ni coverage configurado. `page.tsx` y `layout.tsx` siguen siendo boilerplate ("Create Next App", `lang="en"`).

**Tests**: `npm test` (vitest run) verde — 2 archivos / 5 tests. Typecheck `tsc --noEmit` verde. Lint rojo SOLO por 3 errores markdown en `docs/` (docs/AGENTS.md ×2, docs/HU-proyectoPOS.md ×1) — ningún error de código.

## Dominio del negocio (fuente: HUs)

### Módulos funcionales detectados (6)

| # | Módulo | Rutas | HUs | Roles |
|---|--------|-------|-----|-------|
| 1 | Autenticación y Control de Accesos | `/login`, middleware global | HU-1.1, HU-1.2 | admin + cashier |
| 2 | Inventario, Categorías y Productos | `/inventario`, `/inactivos` | HU-2.1–2.5 | admin (gestión), cashier (solo lectura `/inventario`) |
| 3 | Punto de Venta, Caja Diaria y Ventas | `/ventas` (wizard 3 pasos) | HU-3.1–3.5 | admin + cashier |
| 4 | Compras a Proveedores y Egresos | `/compras` (modal 2 pasos) | HU-4.1–4.4 | admin + cashier |
| 5 | Motor de Descuentos y Promociones | `/descuentos` | HU-5.1–5.3 | SOLO admin |
| 6 | Dashboard, Métricas y Reportes | `/dashboard` | HU-6.1–6.4 | SOLO admin |

### Entidades principales y relaciones (modelo macro)

- **User** — credenciales (email, password bcrypt), rol `admin | cashier`. Relaciones: 1—N CashRegister (`opened_by`), 1—N Sale/Purchase (operador).
- **Category** — nombre único, descripción opcional. 1—N **Product**.
- **Product** (maestro) — nombre, descripción, precio base, `is_active`. 1—N **Variant**.
- **Attribute / AttributeValue** — atributos dinámicos (color, talle, accesorios) con valores; **AttributeValue N:N Variant** (combinaciones N a N, HU-2.2).
- **Variant** — SKU único, precio venta, stock, `is_active`. N—1 Product; 1—N SaleItem/PurchaseItem (impacto de stock).
- **CashRegister** — turno diario: `status: open|closed`, monto inicial, saldo esperado (arqueo), `opened_by`. 1—N Sale/Purchase (HU-3.1, HU-4.1).
- **Sale** — cabecera: total, método de pago (`cash | mp_transfer | mp_posnet`), `is_active` (para anulación HU-6.4). 1—N **SaleItem** (variantId, cantidad, precio unitario, descuento aplicado).
- **Purchase** — cabecera de compra: total, método (`cash | transfer`). 1—N **PurchaseItem** (variantId, cantidad, costo unitario).
- **Discount** — nombre, tipo (`percentage | fixed`), valor, `is_active`; condiciones combinables N:N con Category/Product/Variant + `min_quantity` (HU-5.2).
- **Provider** *(decisión pendiente)* — Módulo 4 nombra proveedores pero no hay HU de CRUD; decidir entidad vs campo libre en Purchase.

### Roles / actores

- **admin**: acceso global (todas las rutas), gestión de inventario, descuentos, dashboard, anulación de ventas.
- **cashier**: solo `/login`, `/ventas`, `/inventario` (HU-1.2 explícito); en `/inventario` solo consulta de existencias/precios (HU-2.3).

### Flujos de negocio clave

1. **Login → middleware por rol**: petición evaluada en `src/middleware.ts`; no autenticado → `/login`; cashier bloqueado fuera de sus 3 rutas; admin libre (HU-1.2).
2. **Jornada de caja**: apertura obligatoria (monto inicial) → bloquea ventas/compras sin caja abierta → cierre con arqueo (monto inicial + ventas efectivo − egresos vs. dinero físico) (HU-3.1, HU-4.1).
3. **Venta (wizard)**: búsqueda textual debounce → selección variante + validación stock → descuentos (motor Módulo 5) → pago (efectivo / MP transfer / MP posnet — integración MP desactivada, solo estructura) → `$transaction`: Sale + SaleItems + descuento de stock + caja (HU-3.2/3.3/3.4).
4. **Compra a proveedor**: caja abierta obligatoria → búsqueda/carga de ítems (HU-4.2 nota pendiente: crear productos desde modal) → pago (efectivo/transferencia) → `$transaction`: Purchase + PurchaseItems + incremento de stock + egreso de caja (HU-4.3).
5. **Anulación de venta (admin)**: `$transaction` — soft-delete en Sale + reversión de stock en Variant + ajuste de caja efectivo (HU-6.4).
6. **Motor de descuentos**: reglas combinables (categorías + productos + variantes + cantidad mínima) evaluadas sobre los ítems del carrito; `is_active=false` las excluye de inmediato (HU-5.2/5.3).

## SDD Estructural — decisiones preliminares

### 1. Estructura de directorios recomendada (metodología + AGENTS.md)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (routes)/                    # páginas por módulo (dueño único por módulo)
│   │   ├── ventas/page.tsx          # Módulo 3
│   │   ├── compras/page.tsx         # Módulo 4
│   │   ├── inventario/page.tsx      # Módulo 2
│   │   ├── inactivos/page.tsx       # Módulo 2 (solo admin)
│   │   ├── descuentos/page.tsx      # Módulo 5 (solo admin)
│   │   └── dashboard/page.tsx       # Módulo 6 (solo admin)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth v4
│   │   └── <modulo>/route.ts        # Route Handlers GET (búsquedas/historial/dashboard)
│   ├── page.tsx                     # redirect según sesión (login | dashboard)
│   ├── layout.tsx                   # HOT — actualizar metadata (fuera de "Create Next App")
│   └── globals.css
├── components/
│   ├── ui/                          # primitivas compartidas
│   └── <modulo>/                    # ventas/, inventario/, compras/, descuentos/, dashboard/
├── actions/
│   ├── auth.ts                      # registro de usuarios (Módulo 1)
│   ├── inventario.ts                # Módulo 2
│   ├── ventas.ts                    # Módulo 3
│   ├── compras.ts                   # Módulo 4
│   ├── descuentos.ts                # Módulo 5
│   └── dashboard.ts                 # Módulo 6 (anulación)
├── lib/
│   ├── auth.ts                      # HOT — config NextAuth (Credentials + JWT + bcrypt)
│   ├── prisma.ts                    # HOT — existe (singleton PrismaPg)
│   ├── utils.ts                     # existe
│   ├── validations/                 # schemas compartidos (auth, pagination, payment)
│   └── <modulo>/                    # lógica de negocio + schemas.ts por módulo
│       ├── inventario/  ├── ventas/  ├── compras/
│       ├── descuentos/  └── dashboard/
├── middleware.ts                    # HOT — protege rutas por rol (HU-1.2)
├── generated/prisma/                # NO tocar (Prisma 7)
└── test/setup.ts
```

### 2. Config base pendiente (falta configurar en este cambio)

- **playwright.config.ts**: `test:e2e` declarado pero no ejecutable (sin config ni specs). Requiere `webServer` (next dev), `baseURL`, proyecto chromium, `testDir`.
- **Coverage**: `@vitest/coverage-v8` ausente en devDeps; sin thresholds en `vitest.config.mts`.
- **Lint limpio**: 3 errores markdown en `docs/` — corregir markdown o ignorar `docs/` en `eslint.config.mjs`.
- **`layout.tsx`**: metadata boilerplate ("Create Next App", `lang="en"`) → título/idioma del POS.
- **`page.tsx`**: reemplazar boilerplate por redirect condicional según sesión.
- **`src/lib/auth.ts`**: config NextAuth (Credentials Provider, JWT con `id`+`role`, bcrypt 10 rounds) — archivo caliente, requiere acuerdo del equipo.
- **`schema.prisma`**: definir modelos macro del dominio (los campos detallados van en design del módulo fundacional).

### 3. Mapa de Exposición por Módulo (propuesto)

Regla del proyecto: mutaciones → **Server Actions** (sin URL ni JSON, lógica transaccional, Zod server-side, `revalidatePath`); lecturas reactivas/paginadas/filtros vía **SWR** → **Route Handlers GET** (SWR requiere endpoints HTTP); lógica pura → `src/lib/<modulo>/` con tests unitarios; flujos de navegador → **E2E Playwright** (auth + middleware).

| Módulo | Operación | Exposición | Herramienta de prueba |
|---|---|---|---|
| 1 Auth | login/logout/sesión | NextAuth `/api/auth/*` + middleware | Vitest integración (validación+bcrypt) + E2E |
| 1 Auth | registro de usuarios | Server Action | Vitest integración PostgreSQL |
| 2 Inventario | CRUD categorías/productos/variantes, soft-delete, reactivar | Server Actions (`$transaction`) | Vitest integración PostgreSQL |
| 2 Inventario | búsqueda textual debounce (SWR) | Route Handler GET | API tests (supertest) |
| 3 Ventas/Caja | abrir/cerrar caja, procesar venta (wizard) | Server Actions (`$transaction`) | Vitest integración PostgreSQL |
| 3 Ventas | búsqueda productos/variantes (paso 1) | Route Handler GET | API tests |
| 3 Ventas | historial `/ventas` con filtros (SWR) | Route Handler GET paginado | API tests |
| 4 Compras | crear compra (stock+, egreso caja) | Server Actions (`$transaction`) | Vitest integración PostgreSQL |
| 4 Compras | búsqueda modal + historial `/compras` | Route Handler GET | API tests |
| 5 Descuentos | CRUD reglas + switch `is_active` | Server Actions | Vitest integración PostgreSQL |
| 5 Descuentos | motor de cálculo (lógica pura) | `src/lib/descuentos/` | Vitest unit |
| 6 Dashboard | KPIs + agregaciones (SWR refresh) | Route Handler GET | API tests |
| 6 Dashboard | anulación de venta (reversión atómica) | Server Action | Vitest integración PostgreSQL |
| 6 Dashboard | reimpresión ticket 80mm (pdf-lib) | Route Handler GET (PDF binario) | API tests |

### 4. Contrato de Datos Tipado (política Zod)

- **Ubicación**: schemas compartidos en `src/lib/validations/` (auth, paginación, métodos de pago, ids) — se modifican SOLO con coordinación del equipo; schemas por módulo en `src/lib/<modulo>/schemas.ts` — los modifica el dueño del módulo.
- **Tipos derivados**: `z.infer<typeof X>` exportados; el contrato es un tipo verificado por el compilador (no JSON informal).
- **Bordes del contrato** (obligatorios por HU): errores de validación descriptivos (HU-1.1 "Credenciales inválidas"), estados vacíos (listas sin resultados, caja sin abrir), concurrencia (stock suficiente, caja abierta antes de operar, `$transaction` para venta/compra/anulación), unicidad (nombre de categoría, SKU), soft-delete (`is_active`).

### 5. Módulo Fundacional propuesto

**Módulo 1 — Autenticación y Control de Accesos** (auth + sesiones + usuarios).

Justificación: destraba TODO el sistema — (1) el middleware por rol protege las rutas de los otros 5 módulos (HU-1.2); (2) caja diaria, ventas y compras requieren el usuario autenticado (`opened_by`, operador en cada registro); (3) dashboard/descuentos exigen rol `admin`; (4) el stack ya trae NextAuth v4 + bcrypt instalados; (5) sin sesión válida ningún flujo de negocio es testeable de forma significativa. Primer slice vertical: registro/login con Zod + bcrypt + JWT con `id` y `role`, y middleware por rol.

## Approaches (comparación)

1. **Route groups por módulo `(routes)/<modulo>` + `(auth)`** (recomendado)
   - Pros: aísla páginas por dueño (mapa de archivos = mapa de requerimientos), URLs limpias, groups no aportan segmento a la URL; `(auth)` separa páginas públicas de protegidas.
   - Cons: grupos anidados requieren disciplina de convención.
   - Effort: Low.

2. **Rutas planas sin route groups**
   - Pros: estructura mínima.
   - Cons: mezcla páginas de auth con rutas protegidas, no agrupa por módulo/dueño, dificulta la propiedad de archivos.
   - Effort: Low.

3. **Variantes con atributos dinámicos (Attribute/AttributeValue + join N:N)** (recomendado)
   - Pros: cumple HU-2.2 ("combinaciones N a N de colores, talles y atributos") sin migrar schema por cada atributo nuevo; el catálogo evoluciona en runtime.
   - Cons: consultas con más joins; complejidad de validación de combinaciones únicas.
   - Effort: Medium.

4. **Variantes con atributos fijos (columnas color/talle/accesorio)**
   - Pros: modelo trivial.
   - Cons: rompe el requisito N a N dinámico (HU-2.2); schema changes por cada atributo nuevo; descartado por las HUs.
   - Effort: Low (pero insuficiente).

## Recommendation

Adoptar **estructura con route groups** (opción 1) + **variantes con atributos dinámicos** (opción 3). Server Actions para toda mutación transaccional; Route Handlers GET solo para lecturas reactivas SWR (búsqueda debounce, historiales paginados, dashboard). Módulo fundacional: Auth (Módulo 1). Incluir en el proposal la configuración base pendiente (playwright.config, coverage, lint limpio, metadata) como tareas del cambio FASE 0.

## Risks / Deudas técnicas

- **E2E no operativo**: `test:e2e` declarado sin `playwright.config.*` ni specs — la capacidad existe pero no es ejecutable; configurar en FASE 0 o acordar diferirlo.
- **Lint rojo**: 3 errores markdown en `docs/` (docs/AGENTS.md ×2, docs/HU-proyectoPOS.md ×1) — decidir corregir o ignorar `docs/`.
- **Coverage ausente**: falta `@vitest/coverage-v8` y thresholds.
- **Integración depende de Docker PostgreSQL** levantado para los tests de integración (Vitest).
- **Discrepancia de roles**: las HUs definen `admin`/`cashier`, pero `AGENTS.md` raíz menciona rol `branch_user` y ruta externa `/sucursal/[branchId]/inventory` (solo GET) que NO aparece en las HUs — resolver antes del design del modelo User y del middleware.
- **Contradicción de rutas cashier**: HU-1.2 limita a cashier a `/login`, `/ventas`, `/inventario`, pero Módulo 4 (compras) declara rol cashier — requiere decisión de negocio (¿cashier opera `/compras`?).
- **HU-4.2 incompleta**: nota "FALTA AGREGAR QUE EN EL PASO UNO SE CREEN PRODUCTOS" — requisito sin HU numerada; el Módulo 3 menciona `/compras` en su objetivo (probable typo, es del Módulo 4).
- **Proveedores sin HU de CRUD**: decidir entidad `Provider` vs campo libre en Purchase.
- **Archivos calientes**: `layout.tsx`, `middleware.ts`, `lib/auth.ts`, `lib/prisma.ts`, `package.json` requieren acuerdo del equipo antes de modificarse.

## Ready for Proposal

**Sí.** El dominio está mapeado (6 módulos, 22 HUs, entidades y flujos clave), el mapa de exposición está decidido con justificación y el módulo fundacional (Auth) identificado. El proposal debe resolver primero: discrepancia de roles (branch_user vs cashier), alcance cashier en `/compras`, entidad Provider, y el alcance de la config base (playwright/coverage/lint) dentro de FASE 0.