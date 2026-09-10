# Delta para Project Structure — AUTH-HU1-1

## MODIFIED Requirements

### Requirement: R-4 — Código compartido y archivos calientes

El código compartido MUST vivir en `src/lib/` común y `src/lib/validations/`; su creación o modificación SOLO con coordinación del equipo. Los archivos calientes (`layout.tsx`, `proxy.ts`, `lib/auth.ts`, `lib/prisma.ts`, `package.json`) MUST modificarse solo con acuerdo del equipo.
(Previously: la lista de archivos calientes incluía `middleware.ts`; ahora es `proxy.ts` por la migración Next 16)

#### Scenario: Helper usado por dos módulos

- GIVEN un helper requerido por ventas y compras
- WHEN se decide su ubicación
- THEN va a `src/lib/` compartido con coordinación del equipo

#### Scenario: Modificación de archivo caliente

- GIVEN `src/proxy.ts` como archivo caliente
- WHEN un módulo necesita ajustar el request interception
- THEN el cambio requiere acuerdo del equipo
- AND `export const config` mantiene la matriz de rutas vigente

#### Scenario: Auth como módulo con lógica propia

- GIVEN el módulo auth
- WHEN se completa `src/lib/auth.ts` (authorize + callbacks JWT)
- THEN el archivo se modifica por su dueño (David) sin editar módulos ajenos