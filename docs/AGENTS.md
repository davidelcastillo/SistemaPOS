<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AGENTS.md – Configuración del agente Gentle‑AI para el proyecto Sistema POS

Este archivo es la configuración central que consulta el agente antes de ejecutar cualquier tarea. Incluye la metodología de desarrollo modular asistida por IA (ver `docs/Desarrollo-Modular-IA.md`), las skills disponibles, la configuración de entornos, las reglas de trabajo y los enlaces a la documentación de las tecnologías usadas.

---

## 📋 1. Skills disponibles

| Skill | Descripción breve | Ubicación |
| --- | --- | --- |
| find-skills | Discover and install specialized agent skills from the open ecosystem | `.agents/skills/find-skills/` |
| frontend-design | Distinctive, production-grade frontend interfaces that reject generic AI aesthetics | `.agents/skills/frontend-design/` |
| vercel-react-best-practices | React and Next.js performance optimization across 70 rules prioritized by impact | `.agents/skills/vercel-react-best-practices/` |
| web-design-guidelines | Audit UI code against Vercel's Web Interface Guidelines | `.agents/skills/web-design-guidelines/` |
| vercel-composition-patterns | React composition patterns for scaling components and avoiding boolean prop proliferation | `.agents/skills/vercel-composition-patterns/` |
| next-best-practices | Next.js best practices for performance, SEO, and routing | `.agents/skills/next-best-practices/` |
| nextjs | Next.js App Router expert guidance (routing, RSC, Server Actions, middleware, data fetching) | `~/.agents/skills/nextjs/` |
| prisma-postgres | Prisma 7 setup, client API, CLI, driver adapters, upgrade guides | `.agents/skills/prisma-postgres/` |
| responsive-design | Modern responsive layouts: container queries, fluid typography, CSS Grid | `.agents/skills/responsive-design/` |
| tailwind-design-system | CSS-first design system framework for Tailwind v4 with tokens and responsive patterns | `.agents/skills/tailwind-design-system/` |
| turborepo | Monorepo build system with intelligent task caching | `.agents/skills/turborepo/` |
| webapp-testing | Native Python Playwright scripts for testing local web applications | `.agents/skills/webapp-testing/` |
| context7-mcp | Current library/framework docs via Context7 | `~/.agents/skills/context7-mcp/` |

Actualizar esta tabla cuando cambie el registro de skills. Antes de cada delegación, resolver los skills relevantes por nombre de registro:

```bash
opencode skill run skill-registry
```

---

## 🛠️ 2. Configuración de entorno (variables requeridas)

Asegúrate de que las siguientes variables estén definidas en `.env` antes de iniciar cualquier trabajo:

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | URL de conexión a PostgreSQL (driver adapter Prisma 7). Ej: `postgresql://postgres:admin123@localhost:5433/proyecto-pos?schema=public` |
| `NEXTAUTH_URL` | URL canónica de la app (ej. `http://localhost:3000` o `https://tudominio.com`) |
| `NEXTAUTH_SECRET` | Clave para firmar/encriptar JWT y cookies de sesión (NextAuth) |
| `NEXT_PUBLIC_APP_ENV` | `development`, `staging` o `production` (afecta middlewares y feature flags) |

> ⚠️ **Prisma 7**: la URL de conexión se lee desde `prisma.config.ts` (`import "dotenv/config"`, `datasource.url: process.env.DATABASE_URL`), NO desde `schema.prisma`. El datasource en el schema no lleva `url` ni `directUrl`. No tocar a mano el cliente generado por Prisma.

---

## 📐 3. Metodología de desarrollo modular asistida por IA

Estándar de trabajo del proyecto (ver `docs/Desarrollo-Modular-IA.md`). Objetivo: calidad, evitar conflictos en repositorio compartido y arquitectura escalable, con el desarrollador como arquitecto activo.

### 3.1 Fase 0 – Arquitectura global (solo proyectos nuevos)

Establecer las bases arquitectónicas ANTES de programar la primera HU:

1. **Definición del Stack:** Next.js 16 + TypeScript + Prisma 7 + PostgreSQL (definido; ver sección 5).
2. **SDD Estructural:** Software Design Document para estructura de directorios, config base (`tsconfig.json`, ESLint, conexión a BD) y modelo relacional macro del dominio.
3. **Mapa de Exposición por Módulo:** decidir y documentar para cada módulo cómo se expone su lógica: **Server Actions** (mutaciones sin URL ni JSON) o **Route Handlers REST** (endpoints con `fetch`). Determina la herramienta de prueba de cada módulo.
4. **Contrato de Datos Tipado:** schemas **Zod** compartidos (`src/lib/validations/`) y tipos TypeScript derivados. El contrato es un tipo que el compilador verifica, no un JSON informal.
5. **Módulo Fundacional:** identificar la funcionalidad core que destraba el sistema (usualmente autenticación y sesiones) y aplicarle el ciclo iterativo.

### 3.2 Ciclo de desarrollo por HU

**Regla de oro:** nunca solicitar desarrollo "Full-Stack" en un solo paso. Trabajar por slices verticales delgados: primero los flujos de mayor riesgo (validaciones, estados de error) para feedback del negocio temprano.

1. **Capa de Datos y Lógica (Backend):** SDD para la lógica de negocio: schemas **Zod** (contrato con bordes: errores de validación, operación fallida, estados vacíos, concurrencia), DTOs, consultas a BD y la exposición elegida en el mapa de Fase 0.
2. **Pruebas de Integración (Aislamiento):** antes de tocar la UI:
    - **Server Actions y lógica pura** (`src/lib/<modulo>/`): tests de integración con **Vitest contra PostgreSQL** (contenedor Docker). Sin URL ni JSON → Postman no aplica.
    - **Route Handlers REST:** API tests (supertest o equivalente). **Postman solo como smoke test exploratorio, nunca como gate** de calidad.
3. **Capa de Presentación (Frontend):** con el contrato consolidado, SDD para diseño de UI importando tipos y schemas compartidos. La alineación frontend-backend la valida el compilador en build time.
4. **Pruebas End-to-End:** flujo completo desde el navegador con **Playwright**, verificando conexión frontend-backend, UX y manejo de errores.
5. **Cierre e Iteración:** verificar el Definition of Done (3.3) y recién entonces seguir con la siguiente HU del mismo módulo.

### 3.3 Definition of Done del módulo

Una HU se considera completa SOLO cuando cumple todos los criterios:

- [ ] Tests de la HU verdes (unitarios, integración y E2E si aplica).
- [ ] Documentación actualizada (`docs/<modulo>.md`).
- [ ] Artefacto SDD archivado con `sdd-archive`.
- [ ] Revisión del compañero y PR validado con su receipt (repo compartido).

---

## 🔧 4. Reglas de trabajo

1. **Siempre usar SDD** para cualquier cambio que implique más de un archivo o que afecte lógica de negocio. Flujo: `explore → propose → spec → design → tasks → apply → verify → archive`. En modo interactivo (predeterminado) revisar el resumen de cada fase antes de continuar; en modo automático el orchestrator actúa como gatekeeper entre fases.
2. **Delegar el trabajo pesado** a los sub-agentes `sdd-*`. Nunca editar archivos directamente salvo lecturas de 1-3 archivos o comandos de estado (git, npm, etc.).
3. **Respetar el presupuesto de líneas de cambio** (review burden): tras `sdd-tasks`, consultar el *Review Workload Forecast*. Si supera 400 líneas o requiere decisión, aplicar la `delivery_strategy` configurada en pre-flight (`ask-on-risk`, `auto-chain`, `single-pr`, `exception-ok`).
4. **Mantener actualizado el registro de skills** antes de cada delegación (sección 1).
5. **Usar Context7** para documentación de librerías antes de escribir código que involucre Next.js, Prisma, NextAuth, Tailwind, Recharts, Zod, SweetAlert2, etc.
6. **Aplicar buenas prácticas del stack:** Server Actions para mutaciones, RSC para UI estática, Route Handlers para lógica API (skills `vercel-react-best-practices` y `next-best-practices`).
7. **Seguridad y autenticación (NextAuth v4 + Prisma):** persistencia de usuarios en tabla `User`; contraseñas SIEMPRE con `bcrypt` (salt rounds = 10) al registrarse o cambiarse; sesión con JWT que transporta `user id` y `role`. Todas las rutas internas (excepto `/login`, `/register` y públicas) protegidas por middleware (`withAuth` o `auth()`) validando token y rol.
8. **Testing:** unit tests (`npm test` = `vitest run`), integración (Prisma + PostgreSQL en Docker), E2E (`npm run test:e2e` = `playwright test`). Ejecutar `npm test` antes de cada `sdd-apply` y E2E antes de `sdd-verify` si existen tests E2E.
9. **Documentación:** cada feature con su archivo en `docs/` siguiendo la plantilla de `cognitive-doc-design`; actualizar `README.md` con resumen y enlaces.
10. **Versionado y releases:** Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`). En `main`, validar receipt de revisión y que no haya cambios pendientes. Si el release es major o sigue a un incidente de seguridad, requiere revisión extraordinaria (Judgment Day o 4R) antes de publicar.

---

## 📚 5. Enlaces a documentación crítica (actualizados vía Context7)

- **Next.js 16** – https://nextjs.org/docs (App Router, RSC, Server Actions, middleware)
- **Prisma 7** – https://www.prisma.io/docs (driver adapters, `prisma.config.ts`, generación de cliente ESM)
- **NextAuth.js** – https://authjs.dev/ (v4 con JWT)
- **Tailwind CSS v4** – https://tailwindcss.com/docs
- **Recharts** – https://recharts.org/en-US
- **Zod v4** – https://zod.dev/
- **SweetAlert2** – https://sweetalert2.github.io/
- **Playwright** – https://playwright.dev/docs
- **Vitest** – https://vitest.dev/

> El agente debe usar Context7 para obtener la versión exacta y ejemplos de uso antes de escribir código.

---

## ✅ 6. Checklist rápido antes de iniciar una nueva tarea SDD

- [ ] Verificar que `.env` tenga todas las variables requeridas (sección 2).
- [ ] Verificar que el contenedor local de PostgreSQL esté levantado (`docker ps`).
- [ ] Ejecutar `opencode skill run skill-registry`.
- [ ] Confirmar la pre-flight de SDD (modo, artifact store, delivery strategy, review budget).
- [ ] Verificar el **Mapa de Exposición** del módulo afectado (Server Action o Route Handler) para elegir la herramienta de prueba correcta.
- [ ] Confirmar que el contrato de datos (schemas Zod) del módulo está definido y sus bordes cubiertos.
- [ ] Si la tarea implica cambios de esquema, asegurarse de que `npm run db:migrate` (`prisma migrate dev`) pueda ejecutarse contra el Postgres local.
- [ ] Si la tarea incluye nuevas rutas o componentes, revisar que los archivos de `src/app/` sigan la convención de route groups (`(routes)`, `(auth)`, etc.).
- [ ] Antes de escribir código, consultar Context7 para la documentación de la librería involucrada.
- [ ] Después de escribir código, ejecutar los tests unitarios y de integración correspondientes.
- [ ] Antes de hacer commit, asegurarse de que el receipt de revisión esté disponible.
- [ ] Al finalizar, verificar el **Definition of Done** (sección 3.3) y archivar con `sdd-archive`, actualizando changelog/README si corresponde.

---

## 👥 7. Trabajo colaborativo (equipo de 2)

**Principio rector: el mapa de archivos sigue el mapa de requerimientos.** Cada requerimiento es un módulo vertical con un único dueño. Nadie edita archivos de un módulo que no le pertenece.

### 7.1 Estructura por módulo

```text
src/app/(routes)/<modulo>/      → páginas del módulo
src/components/<modulo>/        → componentes del módulo
src/actions/<modulo>.ts         → server actions del módulo
src/lib/<modulo>/               → lógica de negocio del módulo
src/lib/<modulo>/schemas.ts     → contrato de datos (Zod) del módulo
```

### 7.2 Propiedad de archivos

1. **Server Actions:** cada módulo tiene SU archivo `src/actions/<modulo>.ts`. Prohibido editar el de otro módulo; si se necesita lógica ajena, se importa.
2. **Contrato de datos:** los schemas Zod de `src/lib/<modulo>/schemas.ts` los modifica el dueño del módulo; los schemas realmente compartidos van a `src/lib/` compartido (por ejemplo `src/lib/validations/`) y se modifican SOLO con coordinación del equipo.
3. **Lógica compartida:** helpers y formateo van a `src/lib/` compartido; crear o modificar esos archivos SOLO con coordinación.
4. **Base de datos:** `prisma/schema.prisma` y `prisma/migrations/` los administra un único dueño a la vez; nunca editar una migración ya aplicada — crear una nueva (`npm run db:migrate -- --name ...`).
5. **Archivos calientes** (`src/app/layout.tsx`, `src/middleware.ts`, `src/lib/prisma.ts`, `src/lib/auth.ts`, `package.json`): solo se modifican con acuerdo del equipo o por su dueño designado.

### 7.3 Flujo de Git

1. Prohibido push directo a `main`: main solo recibe Pull Requests.
2. Un requerimiento = una rama `feat/<requerimiento>` = un PR.
3. PRs chicas: máximo ~400 líneas; si se supera, partir en PRs encadenados.
4. Antes de abrir PR: `git pull --rebase origin main` y resolver conflictos en la rama propia.
5. Hacer `git pull --rebase` frecuente para mantener conflictos chicos.
6. Nunca `force push` a `main`; a rama propia solo con aviso al compañero.
7. Cada commit debe dejar el proyecto compilando (unidad de trabajo íntegra).
8. Al instalar dependencias nuevas, avisar al compañero (cambian `package.json` / `package-lock.json`).

---