# Project Structure Specification

## Purpose

Define la estructura de directorios por módulo y los route groups del POS, qué vive en cada carpeta y las reglas de propiedad de archivos. Principio rector: el mapa de archivos sigue el mapa de requerimientos (AGENTS.md §7).

## Requirements

### Requirement: R-1 — Convención de directorios por módulo

El repositorio MUST organizar el código bajo `src/` con la convención por módulo: `src/app/(routes)/<modulo>/` (páginas), `src/components/<modulo>/` (componentes), `src/actions/<modulo>.ts` (server actions), `src/lib/<modulo>/` (lógica de negocio) y `src/lib/<modulo>/schemas.ts` (contrato del módulo).

#### Scenario: Página de módulo bajo route group

- GIVEN el módulo `compras`
- WHEN se crea su página
- THEN vive en `src/app/(routes)/compras/`
- AND la URL pública es `/compras` (el group no aporta segmento)

#### Scenario: Grupo (auth) sin segmento

- GIVEN el grupo `(auth)` para páginas públicas
- WHEN se crea `/login`
- THEN la URL resultante es `/login` sin prefijo de grupo

### Requirement: R-2 — Representación de los 6 módulos

Los 6 módulos del dominio MUST estar representados: auth (`(auth)` + middleware), inventario (`/inventario`, `/inactivos`), ventas (`/ventas`), compras (`/compras`), descuentos (`/descuentos`) y dashboard (`/dashboard`).

#### Scenario: Módulo con dos rutas

- GIVEN el módulo inventario
- WHEN se agrega la ruta de inactivos
- THEN `/inactivos` vive bajo el mismo dueño (`(routes)/inactivos`)

### Requirement: R-3 — Propiedad de archivos por módulo

Cada módulo MUST tener un único dueño; los archivos de un módulo MUST NOT ser editados por el dueño de otro. Lógica ajena se importa, no se copia.

#### Scenario: Reuso de lógica de inventario

- GIVEN el modal de compra necesita crear productos (HU-4.2)
- WHEN la compra reutiliza la lógica del módulo inventario
- THEN la importa desde `src/lib/inventario/` sin editar archivos ajenos

### Requirement: R-4 — Código compartido y archivos calientes

El código compartido MUST vivir en `src/lib/` común y `src/lib/validations/`; su creación o modificación SOLO con coordinación del equipo. Los archivos calientes (`layout.tsx`, `middleware.ts`, `lib/auth.ts`, `lib/prisma.ts`, `package.json`) MUST modificarse solo con acuerdo del equipo.

#### Scenario: Helper usado por dos módulos

- GIVEN un helper requerido por ventas y compras
- WHEN se decide su ubicación
- THEN va a `src/lib/` compartido con coordinación del equipo

### Requirement: R-5 — Sin boilerplate en raíz

`src/app/page.tsx` MUST reemplazar el boilerplate por un redirect según sesión; `src/app/layout.tsx` MUST actualizar metadata (título e idioma) fuera del boilerplate de Create Next App.

#### Scenario: Root page sin contenido estático

- GIVEN el scaffold inicial con boilerplate
- WHEN se ejecuta la Fase 0
- THEN `page.tsx` solo redirige según sesión
- AND `layout.tsx` expone la metadata del POS