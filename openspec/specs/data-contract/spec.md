# Data Contract Specification

## Purpose

Política del contrato de datos tipado con Zod: ubicación de schemas, tipos derivados y bordes del contrato (errores de validación, operación fallida, estados vacíos, concurrencia, unicidad, soft-delete). El contrato es un tipo verificado por el compilador, no un JSON informal.

## Requirements

### Requirement: R-1 — Ubicación de schemas

Los schemas compartidos MUST vivir en `src/lib/validations/` (auth, paginación, métodos de pago, ids) y se modifican SOLO con coordinación del equipo. Los schemas de módulo MUST vivir en `src/lib/<modulo>/schemas.ts` y los modifica el dueño del módulo.

#### Scenario: Schema compartido nuevo

- GIVEN un schema de paginación usado por varios módulos
- WHEN se crea
- THEN va a `src/lib/validations/` con coordinación del equipo

#### Scenario: Schema de módulo

- GIVEN el módulo compras
- WHEN se define su contrato
- THEN va a `src/lib/compras/schemas.ts` bajo el dueño del módulo

### Requirement: R-2 — Tipos derivados del compilador

El contrato MUST exportar tipos derivados con `z.infer`; la alineación frontend-backend se valida en build time. No hay contratos JSON informales.

#### Scenario: Tipo derivado consumido por la UI

- GIVEN un schema Zod del contrato
- WHEN la UI importa el tipo
- THEN el tipo es `z.infer<typeof schema>` y el compilador valida su uso

### Requirement: R-3 — Borde: errores de validación descriptivos

La validación Zod MUST ejecutarse server-side antes de consultar la BD y MUST producir errores descriptivos (ej. "Credenciales inválidas", HU-1.1).

#### Scenario: Credenciales inválidas

- GIVEN un login con datos que fallan la validación
- WHEN se procesa en el servidor
- THEN el error devuelto es descriptivo y accionable

### Requirement: R-4 — Borde: estados vacíos

El contrato MUST cubrir estados vacíos: listas sin resultados y operaciones bloqueadas (ej. caja sin abrir antes de vender/comprar).

#### Scenario: Lista sin resultados

- GIVEN una búsqueda sin coincidencias
- WHEN se consume el contrato
- THEN la respuesta modela el estado vacío sin error

### Requirement: R-5 — Borde: concurrencia

El contrato MUST cubrir concurrencia: stock suficiente, caja abierta antes de operar y ejecución atómica (`$transaction`) para venta, compra y anulación.

#### Scenario: Stock insuficiente

- GIVEN una venta que supera el stock de la variante
- WHEN se valida la operación
- THEN el contrato rechaza la operación sin descontar stock

### Requirement: R-6 — Borde: unicidad y soft-delete

El contrato MUST cubrir unicidad (nombre de categoría, SKU) y filtrado por soft-delete (`is_active`).

#### Scenario: SKU duplicado

- GIVEN un SKU ya existente
- WHEN se intenta crear la variante
- THEN el contrato rechaza el duplicado

#### Scenario: Filtro por is_active

- GIVEN un producto desactivado
- WHEN se consulta el catálogo activo
- THEN el contrato excluye los registros con `is_active = false`