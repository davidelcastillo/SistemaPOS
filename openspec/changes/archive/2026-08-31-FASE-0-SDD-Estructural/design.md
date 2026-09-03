# Design: FASE 0 – SDD Estructural (Sistema POS)

## Technical Approach

Greenfield: se materializan las 5 specs como base arquitectónica sin lógica de negocio funcional. Route groups `(auth)`/`(routes)` por módulo (mapa de archivos = mapa de requerimientos, AGENTS §7); modelo relacional completo en `schema.prisma` (sin ejecutar migración); contrato Zod compartido (`lib/validations/`) con resultado unificado `ActionResult<T>`; mapa de exposición SA/GET fijado; tooling (Playwright + coverage 80% + lint docs limpio). Los shells calientes (`lib/auth.ts`, `middleware.ts`) quedan estructurales: la validación de credenciales (HU-1.1/1.2) se completa en el design de Auth.

## Architecture Decisions

| # | Decisión | Opciones | Tradeoff | Decisión |
|---|---|---|---|---|
| D1 | Route groups | `(routes)/<m>`+`(auth)` vs planas | grupos aíslan por dueño, URLs limpias | Route groups (specs R-1/R-2) |
| D2 | Atributos de variantes | Attribute/AttributeValue N:N vs columnas fijas | N:N dinámico cumple HU-2.2 sin migrar por atributo; más joins | N:N dinámico |
| D3 | Tablas N:N | join tables explícitas vs implícitas Prisma | patrón uniforme + control (`@@id` compuesto) | Explícitas: `VariantAttribute`, `DiscountCategory/Product/Variant` |
| D4 | Enums de pago | 2 enums (`PaymentMethod`, `PurchasePaymentMethod`) vs 1 compartido | tipo seguro: compra no acepta `mp_posnet` | 2 enums |
| D5 | Descuento en venta | snapshot en Sale/SaleItem vs FK a Discount | reglas mutables (`is_active`); el ticket debe reflejar lo aplicado | Snapshot (`discountTotal`, `discountApplied`) |
| D6 | Bordes del contrato | `ActionResult<T>` con códigos vs errores crudos | UI accionable, cubre validación/estados vacíos/concurrencia/unicidad | Resultado discriminado unificado |
| D7 | Migración inicial | completa en Auth vs staged por módulo | schema completo (spec R-1) → `migrate dev` materializa todo; staged rompe R-1 | Inicial = schema completo (ver Migration) |
| D8 | Shells de Auth | `auth.ts`/`middleware.ts` shells en Fase 0 vs diferir | proposal los declara New/hot; smoke R-2 necesita redirect por sesión | Shells estructurales; lógica en Auth |
| D9 | Smoke autenticado | scenario skip hasta Auth vs implementar auth en Fase 0 | Auth es el 1er ciclo post-Fase 0 (spec R-5) | Unauth corre; auth con `test.skip` + TODO Auth |
| D10 | Coverage | jsdom default + `@vitest-environment node` en integración vs todo jsdom | integración contra Postgres no necesita DOM | Docblock por archivo de integración |
| D11 | API tests | invocación directa del handler (Request→Response) vs supertest HTTP | rápido, sin servidor; equivalente a API tests | Invocación directa en Vitest node |

## Directory Structure (resultado)

```text
src/
├── app/
│   ├── (auth)/login/page.tsx              # placeholder (UI en Auth)
│   ├── (routes)/
│   │   ├── ventas/page.tsx  ├── compras/page.tsx  ├── inventario/page.tsx
│   │   ├── inactivos/page.tsx  ├── descuentos/page.tsx  └── dashboard/page.tsx
│   ├── api/                               # se crea con cada design de módulo (mapa D12)
│   ├── page.tsx                           # redirect sesión: /dashboard | /login
│   ├── layout.tsx                         # metadata POS (lang="es")
│   └── globals.css
├── components/{ui,ventas,compras,inventario,descuentos,dashboard}/   # .gitkeep (Fase 0)
├── actions/{auth,inventario,ventas,compras,descuentos,dashboard}.ts  # shells (comment-only)
├── lib/
│   ├── auth.ts         # HOT — authOptions shell (Credentials authorize→null, JWT id/role)
│   ├── prisma.ts       # HOT — existe (singleton PrismaPg)
│   ├── utils.ts        # existe (cn)
│   ├── validations/    # compartidos: auth, pagination, payment, ids, result
│   └── {inventario,ventas,compras,descuentos,dashboard}/   # .gitkeep; schemas.ts en módulo
├── middleware.ts       # HOT — shell: matcher + matriz de roles
└── test/setup.ts
e2e/smoke.spec.ts       # redirect según sesión
```

## Data Model — `prisma/schema.prisma`

Modelos macro (16) + enums (5). Campos detallados refinados por design de módulo; NO ejecutar migración en Fase 0.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role { ADMIN CASHIER }
enum CashRegisterStatus { OPEN CLOSED }
enum PaymentMethod { CASH MP_TRANSFER MP_POSNET }        // Sale HU-3.4
enum PurchasePaymentMethod { CASH TRANSFER }             // Purchase HU-4.3
enum DiscountType { PERCENTAGE FIXED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  password      String                                  // bcrypt 10 rounds
  role          Role
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  cashRegisters CashRegister[]
  sales         Sale[]
  purchases     Purchase[]
  @@map("users")
}

model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  products    Product[]
  discounts   DiscountCategory[]
  @@map("categories")
}

model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  basePrice   Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  variants    Variant[]
  discounts   DiscountProduct[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([categoryId])
  @@map("products")
}

model Variant {
  id              String   @id @default(cuid())
  sku             String   @unique
  salePrice       Decimal  @db.Decimal(10, 2)
  stock           Int      @default(0)
  isActive        Boolean  @default(true)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  attributeValues VariantAttribute[]
  saleItems       SaleItem[]
  purchaseItems   PurchaseItem[]
  discounts       DiscountVariant[]
  @@index([productId])
  @@map("product_variants")
}

model Attribute {
  id     String  @id @default(cuid())
  name   String  @unique                    // "Color", "Talle", "Accesorio"
  values AttributeValue[]
  @@map("attributes")
}

model AttributeValue {
  id          String    @id @default(cuid())
  value       String
  attributeId String
  attribute   Attribute @relation(fields: [attributeId], references: [id])
  variants    VariantAttribute[]
  @@unique([attributeId, value])
  @@map("attribute_values")
}

model VariantAttribute {
  variantId        String
  attributeValueId String
  variant          Variant        @relation(fields: [variantId], references: [id])
  attributeValue   AttributeValue @relation(fields: [attributeValueId], references: [id])
  @@id([variantId, attributeValueId])
  @@map("variant_attributes")
}

model CashRegister {
  id            String             @id @default(cuid())
  status        CashRegisterStatus @default(OPEN)
  openingAmount Decimal            @db.Decimal(10, 2)
  expectedCash  Decimal?           @db.Decimal(10, 2)   // snapshot al cierre (HU-3.1)
  openedAt      DateTime           @default(now())
  closedAt      DateTime?
  openedById    String
  openedBy      User               @relation(fields: [openedById], references: [id])
  sales         Sale[]
  purchases     Purchase[]
  @@map("cash_registers")
}

model Sale {
  id             String        @id @default(cuid())
  total          Decimal       @db.Decimal(10, 2)
  discountTotal  Decimal       @default(0) @db.Decimal(10, 2)
  paymentMethod  PaymentMethod
  isActive       Boolean       @default(true)             // anulación HU-6.4
  cashRegisterId String
  cashRegister   CashRegister  @relation(fields: [cashRegisterId], references: [id])
  userId         String
  user           User          @relation(fields: [userId], references: [id])
  items          SaleItem[]
  createdAt      DateTime      @default(now())
  @@index([cashRegisterId, createdAt])
  @@map("sales")
}

model SaleItem {
  id              String  @id @default(cuid())
  quantity        Int
  unitPrice       Decimal @db.Decimal(10, 2)
  discountApplied Decimal @default(0) @db.Decimal(10, 2)
  saleId          String
  sale            Sale    @relation(fields: [saleId], references: [id])
  variantId       String
  variant         Variant @relation(fields: [variantId], references: [id])
  @@map("sale_items")
}

model Purchase {
  id             String               @id @default(cuid())
  total          Decimal              @db.Decimal(10, 2)
  paymentMethod  PurchasePaymentMethod
  cashRegisterId String
  cashRegister   CashRegister         @relation(fields: [cashRegisterId], references: [id])
  userId         String
  user           User                 @relation(fields: [userId], references: [id])
  providerId     String
  provider       Provider             @relation(fields: [providerId], references: [id])
  items          PurchaseItem[]
  createdAt      DateTime             @default(now())
  @@index([cashRegisterId, createdAt])
  @@map("purchases")
}

model PurchaseItem {
  id         String   @id @default(cuid())
  quantity   Int
  unitCost   Decimal  @db.Decimal(10, 2)
  purchaseId String
  purchase   Purchase @relation(fields: [purchaseId], references: [id])
  variantId  String
  variant    Variant  @relation(fields: [variantId], references: [id])
  @@map("purchase_items")
}

model Provider {
  id        String     @id @default(cuid())
  name      String
  cuit      String?    @unique
  phone     String?
  email     String?
  purchases Purchase[]
  @@map("providers")
}

model Discount {
  id          String        @id @default(cuid())
  name        String
  type        DiscountType
  value       Decimal       @db.Decimal(10, 2)
  minQuantity Int           @default(1)                  // HU-5.2 umbral
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  categories  DiscountCategory[]
  products    DiscountProduct[]
  variants    DiscountVariant[]
  @@map("discounts")
}

model DiscountCategory {
  discountId String
  categoryId String
  discount   Discount  @relation(fields: [discountId], references: [id])
  category   Category  @relation(fields: [categoryId], references: [id])
  @@id([discountId, categoryId])
  @@map("discount_categories")
}

model DiscountProduct {
  discountId String
  productId  String
  discount   Discount @relation(fields: [discountId], references: [id])
  product    Product  @relation(fields: [productId], references: [id])
  @@id([discountId, productId])
  @@map("discount_products")
}

model DiscountVariant {
  discountId String
  variantId  String
  discount   Discount @relation(fields: [discountId], references: [id])
  variant    Variant  @relation(fields: [variantId], references: [id])
  @@id([discountId, variantId])
  @@map("discount_variants")
}
```

### Migración: qué se crea dónde

| Migración | Cuándo | Modelos |
|---|---|---|
| `init` (primera) | design de Auth (HU-1.1) | TODOS los modelos macro + enums: el schema completo de Fase 0 (spec R-1) se materializa en una sola migración atómica |
| Aditivas | designs de HU 2.x–6.x | SOLO campos/índices nuevos refinados por módulo (ej. campos de integración MP en `Sale` cuando se active HU-3.4: `mp_payment_id`, `mp_status`; índices trigram si el volumen de búsqueda lo exige) |

> Alternativa descartada: migración mínima solo `User` en Auth exige sacar los demás modelos de `schema.prisma` en Fase 0 (rompe spec R-1) o staging de schema — ver Open Questions.

## Data Contract (Zod)

- **Compartidos** (`src/lib/validations/`, solo con coordinación): `auth.ts` (login), `pagination.ts`, `payment.ts` (enums de pago), `ids.ts` (cuid), `result.ts` (bordes). **Módulo** (`src/lib/<modulo>/schemas.ts`, dueño): resto.
- **Tipos**: `z.infer<typeof X>`; el compilador alinea frontend-backend (build time).
- **Bordes** unificados en `ActionResult<T>` + mensajes descriptivos (HU-1.1 "Credenciales inválidas"), estados vacíos (lista sin resultados = `ok: true` con array vacío), concurrencia (`STOCK_INSUFFICIENT`, `CASH_REGISTER_CLOSED`), unicidad (`DUPLICATE_SKU`, `DUPLICATE_CATEGORY`), soft-delete (filtros `is_active` en queries).

```ts
// src/lib/validations/result.ts
export type ErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN"
  | "CASH_REGISTER_CLOSED" | "STOCK_INSUFFICIENT"
  | "DUPLICATE_CATEGORY" | "DUPLICATE_SKU" | "NOT_FOUND";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

// src/lib/validations/auth.ts
export const loginSchema = z.object({
  email: z.email("Ingresá un email válido"),
  password: z.string().min(1, "Credenciales inválidas"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// src/lib/inventario/schemas.ts (dueño inventario)
export const createProductSchema = z.object({
  name: z.string().min(1),
  categoryId: ids.cuidSchema,
  basePrice: z.number().positive(),
  variants: z.array(createVariantSchema).min(1), // matriz N:N, SKUs únicos (HU-2.2)
});
```

## Module Exposure Map (definitivo)

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
| 4 Compras | crear compra (stock+, egreso caja) | SA `createPurchase` (solo admin) | `src/actions/compras.ts` | Vitest integración PostgreSQL |
| 4 Compras | búsqueda modal + historial | GET `/api/compras/search`, `/api/compras` | `src/app/api/compras/{search,route}.ts` | API tests |
| 5 Descuentos | CRUD + switch `is_active` | Server Actions | `src/actions/descuentos.ts` | Vitest integración PostgreSQL |
| 5 Descuentos | motor de cálculo (puro) | `src/lib/descuentos/engine.ts` | — | Vitest unit |
| 5 Descuentos | listado reglas (SWR) | GET `/api/descuentos` | `src/app/api/descuentos/route.ts` | API tests |
| 6 Dashboard | KPIs + agregaciones (SWR) | GET `/api/dashboard/kpis?from=&to=` | `src/app/api/dashboard/kpis/route.ts` | API tests |
| 6 Dashboard | anulación venta (reversión atómica) | SA `voidSale` (solo admin) | `src/actions/dashboard.ts` | Vitest integración PostgreSQL |
| 6 Dashboard | reimpresión ticket 80mm | GET `/api/dashboard/tickets/[id]/print` (PDF) | `src/app/api/dashboard/tickets/[id]/print/route.ts` | API tests |

**Cashier en `/compras` solo lectura** (decisión resuelta): GET abiertos a cashier; `createPurchase` valida rol `admin` server-side (spec R-3). Matriz de roles del middleware: público `/login` + `/api/auth`; cashier `/ventas`, `/inventario`, `/compras` (GET); admin todo + `/inactivos`, `/descuentos`, `/dashboard` solo admin. *Nota: la matriz ajusta HU-1.2 (que no menciona `/compras`) — la spec de Auth debe reflejar la decisión resuelta.*

## Base Config

- **`playwright.config.ts`**: `testDir: "./e2e"`, `webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }`, `use: { baseURL: "http://localhost:3000" }`, proyecto chromium. Requiere `npx playwright install chromium` (dependencia ya presente).
- **`e2e/smoke.spec.ts`**: scenario A (sin sesión → `/login`) CORRE en Fase 0; scenario B (sesión admin → `/dashboard`) con `test.skip` + TODO Auth (R-2: B depende de HU-1.1; se activa en la E2E de Auth).
- **`vitest.config.mts`**: `coverage: { provider: "v8", reporter: ["text","html"], include: ["src/lib/**","src/actions/**","src/middleware.ts","src/app/**"], exclude: ["src/generated/**","src/test/**","**/*.test.*","src/components/__tests__/**"], thresholds: { statements:80, branches:80, functions:80, lines:80 } }`. Integración: docblock `// @vitest-environment node` en archivos contra PostgreSQL (jsdom default para componentes).
- **`package.json`**: agregar devDep `@vitest/coverage-v8` (ausente, verificado).
- **Lint docs** (4 errores verificados, `npm run lint`): `docs/AGENTS.md:11` H1 duplicado → demover a `##`; `docs/AGENTS.md:147` fenced-code-block sin lenguaje → ` ```text `; `docs/HU-proyectoPOS.md:3` heading skip 1→3 → `#`→`##` en línea 1; `openspec/.../exploration.md:59` fenced-code-block → ` ```text ` (el 4º, necesario para que el gate pase; spec R-4 cubre los 3 de docs/).
- `tsconfig.json` verificado correcto (strict, alias `@/*`): no tocar (R-5).

## Transversal Strategies

- **Cobertura 80% desde scaffold (~5 tests)**: gate progresivo — Fase 0 agrega unit de `validations/` (+ `utils`) y el smoke; los módulos posteriores acumulan integración/API; el umbral es DoD por módulo (proposal). `include` acotado excluye `generated/` y tests.
- **Smoke E2E autenticado**: storageState/login previo se resuelve en Auth design (login flow E2E); Fase 0 deja el scenario como skip explícito.
- **Seguridad**: bcrypt 10 rounds (solo Auth design, shell ya tipa `password`); JWT con `id`+`role` en callbacks (estructura en shell `auth.ts`); middleware por rol server-side; validación Zod SIEMPRE server-side antes de BD; cashier no escribe compras (server-side).
- **Transacciones**: mutaciones multi-paso SIEMPRE `$transaction` (venta: Sale+Items+stock+caja; compra: Purchase+Items+stock+caja; anulación: soft-delete+stock+caja; alta producto: Product+Variants+atributos) — patrón fijado en el mapa, implementado en cada módulo.
- **Strict TDD**: `npm test` (vitest run + coverage) como gate; RED tests antes de producción por tarea (test_command aprobado).

## Data Flow

```text
Browser ──RSC──▶ page.tsx ──getServerSession(authOptions)──▶ redirect(/dashboard | /login)
Browser ──▶ Server Action ──▶ Zod (ActionResult) ──▶ $transaction(prisma) ──▶ PostgreSQL ──▶ revalidatePath
Browser ──SWR──▶ GET /api/<modulo> ──▶ prisma query (is_active) ──▶ JSON ──▶ SWR cache
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/layout.tsx` | Modify | Metadata POS: título "Sistema POS", `lang="es"` (R-5) |
| `src/app/page.tsx` | Modify | Redirect por sesión (R-5): `getServerSession` → `/dashboard` \| `/login` |
| `src/app/(auth)/login/page.tsx` | Create | Placeholder (UI real en Auth) |
| `src/app/(routes)/{ventas,compras,inventario,inactivos,descuentos,dashboard}/page.tsx` | Create | Placeholders RSC (módulos representados, R-2) |
| `src/lib/auth.ts` | Create (hot) | Shell `authOptions`: Credentials (authorize→null), JWT callbacks `id`+`role` |
| `src/middleware.ts` | Create (hot) | Shell: matcher + matriz de roles |
| `src/actions/{auth,inventario,ventas,compras,descuentos,dashboard}.ts` | Create | Shells comment-only (mapa de propiedad) |
| `src/lib/validations/{auth,pagination,payment,ids,result}.ts` | Create | Schemas compartidos + `ActionResult<T>` |
| `src/components/{ui,ventas,compras,inventario,descuentos,dashboard}/` | Create | `.gitkeep` (primitivas en módulos) |
| `src/lib/{inventario,ventas,compras,descuentos,dashboard}/` | Create | `.gitkeep` (`schemas.ts` en módulo) |
| `prisma/schema.prisma` | Modify | 16 modelos + 5 enums (NO `migrate dev`) |
| `playwright.config.ts` | Create | webServer dev, chromium, testDir e2e |
| `e2e/smoke.spec.ts` | Create | Redirect según sesión (scenario B skip→Auth) |
| `vitest.config.mts` | Modify | Coverage v8 80% + include/exclude |
| `package.json` | Modify | devDep `@vitest/coverage-v8` |
| `docs/AGENTS.md` | Modify | Fix lint ×2 (H1→H2, fence `text`) |
| `docs/HU-proyectoPOS.md` | Modify | Fix lint ×1 (H1→H2) |
| `openspec/.../exploration.md` | Modify | Fix lint ×1 (fence `text`) |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `validations/` (loginSchema, pagination, result), `utils.cn` | Vitest jsdom, bordes del contrato (D6) |
| Integration | Server Actions + `lib/<modulo>/` contra PostgreSQL Docker | Vitest `@vitest-environment node`, `$transaction` real |
| API | Route Handlers GET (search/historial/kpis) | Invocación directa handler (Request→Response), Vitest node |
| E2E | Smoke redirect `/` | Playwright chromium; A corre, B skip→Auth |

## Threat Matrix

`N/A` — el cambio no toca automatización VCS/PR ni clasificación de ejecutables.

| Boundary | Applicability | Reason |
|---|---|---|
| Documentation-like paths | N/A | No se ejecuta Markdown/MDX/README; solo lint de docs |
| Git repository selection | N/A | Sin comandos git compuestos en runtime |
| Commit state | N/A | Sin lógica de index/worktree |
| Push state | N/A | Sin resolución de refs/remote |
| PR commands | N/A | Sin composición de argumentos de PR |

El único subproceso es `webServer` de Playwright (`next dev`, comando fijo, sin input adversarial). El redirect por rol es routing de framework protegido por sesión NextAuth (no entrada de shell).

## Migration / Rollout

Fase 0: aditiva, sin migración (R-6). Roadmap en sección Data Model. Rollback: `git revert`; `schema.prisma` sin migración aplicada.

## Open Questions

- [ ] **Migración inicial**: ¿confirmar "init completa" (schema Fase 0 completo en 1 migración en Auth) vs staged por módulo? La staged exige diferir modelos de `schema.prisma` (rompe spec R-1) — decidir antes del design de Auth.
- [ ] **HU-1.2 vs `/compras` cashier**: la spec de Auth debe reflejar la decisión resuelta (cashier lectura en `/compras`), que ajusta el texto de HU-1.2.
- [ ] **NextAuth v4 + Next 16**: riesgo de integración de middleware (edge runtime / `crypto.subtle`) a validar en Auth design.
- [ ] **`docs/AGENTS.md` obsoleto**: referencia `ssr-sistema-tickets`/`AUTH_URL` (stale copy del root) — corregir contenido en tasks/apply además del lint.

## Key Learnings

1. El lint de Fase 0 reporta 4 errores markdown, no 3: el cuarto vive en `openspec/.../exploration.md` y debe corregirse para que el gate pase.
2. La migración inicial de Auth materializa el schema completo de Fase 0 (spec R-1): una migración staged por módulo exigiría sacar modelos del schema, rompiendo la spec.
3. El smoke de redirect autenticado depende de HU-1.1: en Fase 0 solo el scenario sin sesión es ejecutable.
4. El contrato de bordes se unifica en `ActionResult<T>` con códigos tipados, cubriendo validación, estados vacíos, concurrencia, unicidad y soft-delete.