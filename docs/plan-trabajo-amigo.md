# Plan de Trabajo — Amigo · Módulos 2 y 5 (Inventario/Categorías/Productos + Descuentos)

> **Proyecto:** Sistema POS (`proyecto-pos`) · **Repositorio:** `github.com/davidelcastillo/SistemaPOS`
> **Este archivo es tu CONTRATO DE TRABAJO.** Pasáselo a TU agente de Opencode/Gentle-AI como instrucción de trabajo antes de ejecutar cualquier HU.
> **Contraparte:** David (dueño de Módulos 1, 3, 4 y 6). Nunca toques sus archivos.

---

## 1. Contexto del proyecto

- **Stack:** Next.js 16.3.1 (App Router) + TypeScript + Prisma 7.9.1 (adapter-pg, `prisma.config.ts`) + PostgreSQL (Docker) + NextAuth v4 (JWT + bcrypt) + Tailwind v4 + Zod v4 + SWR.
- **Roles:** `admin` y `cashier`. **No existe** rol `branch_user` ni portal externo (fuera de alcance).
- **Fase 0 COMPLETADA y archivada** (SDD Estructural). Ya existe:
  - Estructura `src/app/(routes)/<modulo>/` + `(auth)`, `src/actions/<modulo>.ts`, `src/lib/<modulo>/`, `src/lib/validations/`.
  - Shells de Server Actions por módulo (`src/actions/inventario.ts`, `src/actions/descuentos.ts`), `src/middleware.ts` (matriz de roles), `src/lib/auth.ts`, `src/lib/prisma.ts`, tipos `src/types/next-auth.d.ts`.
  - Contrato compartido: `ActionResult<T>` + validaciones base en `src/lib/validations/` (`result.ts`, `ids.ts`, `pagination.ts`, `payment.ts`, `auth.ts`).
  - `schema.prisma` con el modelo completo del dominio (17 modelos, sin migrar aún — la migración `init` la ejecuta David en HU-1.1).
  - Mapa de exposición definitivo: `docs/mapa-exposicion.md`.
- **Metodología obligatoria:** `docs/Desarrollo-Modular-IA.md` + `AGENTS.md` (raíz). SDD completo por HU: `explore → propose → spec → design → tasks → apply → verify → archive`.

---

## 2. Tu alcance (módulos que te pertenecen)

### M2 — Inventario, Categorías y Gestión de Productos (`/inventario`, `/inactivos`)
- **HU-2.1** Gestión y alta de categorías (admin).
- **HU-2.2** Alta de producto maestro + variantes dinámicas (combinaciones N a N color/talle/atributos) con SKU único, precio y stock inicial, en `$transaction`.
- **HU-2.3** Búsqueda textual (debounce, `contains`/`mode: insensitive`) + modificación de productos (admin edita; cashier solo consulta en `/inventario`).
- **HU-2.4** Soft-delete de productos/variantes (`is_active = false`).
- **HU-2.5** Página `/inactivos` con botón "Ver Desactivados" y reactivación (Server Action + `revalidatePath('/inventario')`).

### M5 — Motor de Descuentos y Promociones (`/descuentos`) — SOLO ADMIN
- **HU-5.1** Panel de control y alta de descuentos (nombre + tipo porcentaje/monto fijo).
- **HU-5.2** Configuración de condiciones y alcance: categorías, productos maestros, variantes, cantidad mínima; reglas combinables (ej. 3 productos de Categoría X + Producto J + Variante JIU).
- **HU-5.3** Edición y desactivación lógica (switch `is_active`) + `revalidatePath('/descuentos')`.

> M5 depende del modelo de productos/categorías/variantes de M2, por eso te toca a vos: implementalo DESPUÉS de M2, no en paralelo con vos mismo.

---

## 3. Estructura de archivos (tus zonas)

| Archivo | Acción | Rol |
| --- | --- | --- |
| `src/app/(routes)/inventario/page.tsx`, `.../inactivos/page.tsx` | Modificar/crear | Páginas M2 |
| `src/app/(routes)/descuentos/page.tsx` | Modificar/crear | Página M5 |
| `src/actions/inventario.ts` | Modificar (shell existe) | Server Actions M2 |
| `src/actions/descuentos.ts` | Modificar (shell existe) | Server Actions M5 |
| `src/lib/inventario/` | Crear | Lógica pura M2 (schemas + queries) |
| `src/lib/descuentos/` | Crear | Motor puro M5 (`engine.ts`) + schemas |
| `src/app/api/inventario/search/route.ts`, `.../inactive/route.ts` | Crear | Route Handlers GET (SWR) |
| `src/app/api/descuentos/route.ts` | Crear | Route Handler GET (SWR) |
| `src/components/inventario/`, `src/components/descuentos/` | Crear | Componentes de tus módulos |
| `src/lib/validations/` (compartido) | Agregar schemas SOLO con coordinación | Contrato compartido |
| `src/tests/...` | Crear | Tests de tus módulos |

### PROHIBIDO (archivos de David o calientes)
- `src/actions/auth.ts`, `src/actions/ventas.ts`, `src/actions/compras.ts`, `src/actions/dashboard.ts`
- `src/lib/auth.ts`, `src/middleware.ts`, `src/app/layout.tsx`, `src/lib/prisma.ts`, `package.json`
- `prisma/schema.prisma` y `prisma/migrations/` — **dueño único a la vez**; si necesitás un cambio de modelo, pedilo a David (coordinación) y no edites una migración ya aplicada.

---

## 4. Cómo exponer tu lógica (mapa de exposición)

| Operación | Exposición | Ubicación | Prueba |
| --- | --- | --- | --- |
| CRUD categorías/productos/variantes, soft-delete, reactivar | **Server Actions** (`$transaction`, Zod server-side, `revalidatePath`) | `src/actions/inventario.ts` | Vitest integración PostgreSQL |
| Búsqueda debounce (SWR) | **GET** `/api/inventario/search?q=` | `src/app/api/inventario/search/route.ts` | API tests |
| Listado inactivos | **GET** `/api/inventario/inactive` | `src/app/api/inventario/inactive/route.ts` | API tests |
| CRUD + switch descuentos | **Server Actions** | `src/actions/descuentos.ts` | Vitest integración PostgreSQL |
| Motor de cálculo (puro) | `src/lib/descuentos/engine.ts` | — | Vitest unit |
| Listado reglas (SWR) | **GET** `/api/descuentos` | `src/app/api/descuentos/route.ts` | API tests |

Reglas: mutaciones → Server Actions; lecturas reactivas → Route Handlers GET; validación de rol SIEMPRE en el servidor (cashier no edita; `/descuentos` y `/inactivos` solo admin).

---

## 5. Contrato de datos

- Reusá `ActionResult<T>` (`src/lib/validations/result.ts`) para TODAS las respuestas de acciones: bordes tipados (validación, operación fallida, estados vacíos, concurrencia, unicidad, soft-delete).
- Schemas Zod: `src/lib/<modulo>/schemas.ts` (propios del módulo) y `src/lib/validations/` SOLO si son compartidos (con coordinación).
- Búsquedas: `contains` + `mode: 'insensitive'` con debounce 300 ms; **sin integración de lectores de código de barras** (restricción de hardware del negocio).
- Variantes: matriz dinámica N a N en una única `$transaction` (producto maestro + variantes con SKU único).

---

## 6. Orden de trabajo (SDD por módulo)

Para CADA módulo, en este orden, con pre-flight SDD (modo interactivo, artifact store both, ask-on-risk, 400 líneas):

1. **M2 (Inventario):** `explore → propose → spec → design → tasks → apply → verify → archive` para las HUs 2.1 → 2.2 → 2.3 → 2.4 → 2.5 en ese orden (2.2 destraba las demás).
2. **M5 (Descuentos):** mismo ciclo completo para HUs 5.1 → 5.2 → 5.3, DESPUÉS de cerrar M2.

Reglas SDD: delegar el trabajo pesado a los sub-agentes `sdd-*`; revisar el resumen de cada fase antes de continuar; si el forecast de `sdd-tasks` supera 400 líneas, frenar y decidir PRs encadenados (coordinación obligatoria con David antes de abrir PRs en la cadena).

---

## 7. Testing (gates obligatorios)

- **Unit:** lógica pura (`src/lib/inventario/`, `src/lib/descuentos/engine.ts`) con Vitest (`npm test`).
- **Integración:** Server Actions contra PostgreSQL Docker — flujos completos (crear categoría → crear producto con variantes → stock inicial; crear regla de descuento → motor).
- **API tests:** Route Handlers GET de search/inactive/descuentos.
- **E2E (Playwright):** flujo admin en `/inventario` (alta producto, soft-delete, ver desactivados, reactivar) y `/descuentos` (alta regla, switch off).
- **Cobertura:** mantener ≥80% sobre la superficie probada de TUS módulos (gate DoD, ver `docs/mapa-exposicion.md`).
- Correr `npm test` antes de cada `sdd-apply` y E2E antes de `sdd-verify`.

---

## 8. Definition of Done (por HU)

- [ ] Tests de la HU verdes (unit, integración y E2E si aplica).
- [ ] Documentación actualizada (`docs/<modulo>.md`).
- [ ] Artefacto SDD archivado con `sdd-archive`.
- [ ] Revisión cruzada de David y PR validado con su receipt (repo compartido).
- [ ] Cobertura ≥80% sobre tu superficie.

---

## 9. Dependencias con David (coordinación obligatoria)

- **Esperás de David:** migración inicial de Prisma (HU-1.1) que materialice el schema — sin eso no podés correr integración contra la BD real. Hasta entonces podés avanzar con tests de lógica pura y mock de Prisma.
- **Necesitás de David:** `NEXTAUTH_URL`/`NEXTAUTH_SECRET` en `.env` (las completa él en HU-1.1) y el middleware funcional con roles (HU-1.2) para proteger tus rutas.
- **David depende de vos:** tus productos/variantes (M2) son los que se venden en M3 (HU-3.2) y se compran en M4 (HU-4.2); tus descuentos (M5) alimentan el carrito de M3 (HU-3.3).

**Orden recomendado de arranque:** cuando David cierre HU-1.1 (Auth), arrancá vos con M2 (HU-2.1 categorías → HU-2.2 productos/variantes). David no debe implementar HU-3.x hasta que tu HU-2.2 exista.