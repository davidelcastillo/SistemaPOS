# Data Model Specification

## Purpose

Modelo relacional macro del dominio en `prisma/schema.prisma`: entidades núcleo, relaciones y reglas de modelado. El detalle de campos por entidad se define en el design de cada módulo (fuera de esta spec). No se modela Sucursal ni portal externo.

## Requirements

### Requirement: R-1 — Entidades núcleo del dominio

`schema.prisma` MUST definir las entidades del proposal: User, Category, Product, Variant, Attribute, AttributeValue, CashRegister, Sale, Purchase, Provider y Discount, más las tablas de detalle SaleItem y PurchaseItem y la relación N:N de AttributeValue con Variant.

#### Scenario: Modelos presentes en el schema

- GIVEN `prisma/schema.prisma` tras la Fase 0
- WHEN se inspeccionan los modelos
- THEN existen los modelos de las entidades del proposal

### Requirement: R-2 — Relaciones macro

Las relaciones MUST coincidir con el modelo macro del proposal: User 1—N {CashRegister, Sale, Purchase}; Category 1—N Product; Product 1—N Variant; Attribute/AttributeValue N:N Variant; Variant 1—N {SaleItem, PurchaseItem}; CashRegister 1—N {Sale, Purchase}; Sale 1—N SaleItem; Purchase 1—N {PurchaseItem, Provider}; Provider 1—N Purchase; Discount N:N {Category, Product, Variant} con min_quantity.

#### Scenario: Relación User—caja

- GIVEN el modelo User
- WHEN se definen las relaciones de caja
- THEN User tiene 1—N con CashRegister (opened_by)

#### Scenario: Condiciones combinables de Discount

- GIVEN el modelo Discount
- WHEN se definen las condiciones
- THEN soporta N:N con Category, Product y Variant y un min_quantity

### Requirement: R-3 — Sin Sucursal ni portal externo

El modelo MUST NOT incluir la entidad Sucursal ni el rol `branch_user`; el stock vive en Variant y los movimientos se derivan de ítems y caja. No hay rutas `/sucursal/*`.

#### Scenario: Ausencia de Sucursal

- GIVEN el modelo macro de la Fase 0
- WHEN se audita el schema
- THEN no existe modelo Sucursal ni referencias a sucursal

### Requirement: R-4 — Provider sin CRUD de pantalla

Provider MUST modelarse como entidad asociada a Purchase (1—N) sin CRUD de pantalla en esta fase; se asocia al crear una compra.

#### Scenario: Provider solo como referencia

- GIVEN la entidad Provider en el schema
- WHEN se crea una compra
- THEN Provider se referencia desde Purchase sin pantalla de gestión propia

### Requirement: R-5 — Invariantes macro del negocio

El modelo MUST reflejar los invariantes del proposal: Variant con SKU y stock; Sale/Purchase con método de pago; soft-delete (`is_active`) en entidades de catálogo. El detalle de campos queda para el design.

#### Scenario: SKU y stock en Variant

- GIVEN la entidad Variant
- WHEN se revisa el modelo macro
- THEN expone SKU y stock como invariantes de la entidad

### Requirement: R-6 — Sin migración en Fase 0

La Fase 0 MUST NOT aplicar la migración inicial de Prisma; el cambio en `schema.prisma` es aditivo y la migración se aplica en el design de Auth.

#### Scenario: Migración diferida

- GIVEN `schema.prisma` con los modelos macro
- WHEN se completa la Fase 0
- THEN no se ejecuta `prisma migrate dev`
- AND la migración inicial queda pendiente del design de Auth