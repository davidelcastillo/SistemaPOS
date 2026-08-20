# AGENTS.md – Configuración del agente Gentle‑AI para el proyecto Sistema POS

Este archivo contiene la configuración central que debe ser consultada por el agente antes de ejecutar cualquier tarea.

Incluye referencias a los skills disponibles, la configuración de entornos, las reglas de trabajo y los enlaces a la documentación más reciente de las tecnologías usadas.

---

## 📋 1. Skills disponibles (COMPLETAR)

| Skill | Descripción breve | Ubicación |
| --- | --- | --- |
| find-skills | Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.  | .agents/skills/find.skills/ |
| frontend-desing | Distinctive, production-grade frontend interfaces that reject generic AI aesthetics through intentional design choices. | .agents/skills/frontend-desing/ |
| vercel-react-best-practices |  React and Next.js performance optimization across 70 rules prioritized by impact.| .agents/skills/vercel-react-best-practices |
| web-desing-guidelines | Audit UI code against Vercel's Web Interface Guidelines for design and accessibility compliance. | .agents/skills/web-desing-guidelines |
| vercel-composition-patterns | React composition patterns for scaling components and avoiding boolean prop proliferation. | .agents/skills/vercel-composition-patterns |  
| next-best-practices | Next.js best practices for performance, SEO, | .agents/skills/next-best-practices |
| turborepo |Monorepo build system with intelligent task caching, parallel execution, and dependency graph orchestration. | .agents/skills/turborepo | 
| webapp-testing | Native Python Playwright scripts for testing local web applications with server lifecycle management.| .agents/skills/webapp-testing | 
| tailwind-design-system | CSS-first design system framework for Tailwind v4 with tokens, components, and responsive patterns. | .agents/skills/tailwind-design-system |
| | | |

---

## 🛠️ 2. Configuración de entorno (variables requeridas)

Asegúrate de que las siguientes variables estén definidas en el archivo .env antes de iniciar cualquier trabajo:

| Variable | Descripción |
| --- | --- |
| DATABASE_URL | URL de conexión a la base de datos PostgreSQL local (Docker) o VPS (Coolify). |
| NEXTAUTH_URL | URL canónica de la app (ej. http://localhost:3000 o https://tudominio.com). |
| NEXTAUTH_SECRET | Clave secreta para firmar/encriptar JWT y cookies de sesión. |
| NEXT_PUBLIC_APP_ENV | development, staging o production (afecta comportamiento de middlewares y feature flags). |

---

## 📐 3. Reglas de trabajo

1. Siempre usar SDD para cualquier cambio que implique más de un archivo o que afecte la lógica de negocio.
- Flujo: explore → propose → spec → design → tasks → apply → verify → archive.
- En modo interactivo (predeterminado) revisa el resumen de cada fase antes de continuar; en modo automático el orchestrator actúa como gatekeeper entre fases.
1. Delegar todo el trabajo pesado a los sub‑agentes sdd‑*.
- Nunca edites archivos directamente salvo para lecturas de 1‑3 archivos o comandos de estado (git, npm, etc.).
- Usa la herramienta task con subagent_type adecuado (ver tabla de skills) para cada fase.
1. Respetar el presupuesto de líneas de cambio (review burden).
- Después de sdd‑tasks, el orchestrator consulta el Review Workload Forecast.
- Si el forecast indica > 400 líneas cambiadas o se necesita decisión, aplicar la delivery strategy configurada en la pre‑flight (ask‑on‑risk, auto‑chain, single‑pr, exception‑ok).
- En caso de ask‑on‑risk, el orchestrator preguntará al usuario si quiere dividir en PRs encadenados o aceptar un size:exception.
1. Mantener actualizado el registro de skills antes de cada delegación.
- Al inicio de la sesión (o antes de la primera delegación) ejecuta:

```bash
opencode skill run skill-registry
```

- Luego, cada sub‑agente recibirá la lista de skills a cargar mediante el campo skill_resolution del prompt.
1. Usar Context7 para documentación de libs.
- Antes de escribir código que implique Next.js, Prisma, NextAuth, bcrypt, Tailwind, Recharts, Zod, SweetAlert2, etc., llama a context7_resolve-library-id + context7_query-docs para obtener la versión más reciente y ejemplos de uso.
1. Aplicar las buenas prácticas de React y Next.js (skill vercel-react-best-practices y next-best-practices).
- Prioriza Server Actions para mutaciones, React Server Components para UI estática, y Route Handlers nativos para lógica API.
1. Seguridad y autenticación (Nativa con NextAuth + Prisma).
- Toda la persistencia de usuarios reside en la tabla User de PostgreSQL mediante Prisma.
- Las contraseñas SIEMPRE se encriptan con bcrypt (salt rounds = 10) al registrarse o cambiarse.
- La estrategia de sesión utiliza JWT (JSON Web Tokens). El token transporta el user id y role.
- Todas las rutas internas (excepto /login, /register y rutas públicas) deben estar protegidas mediante el Middleware de Next.js (`withAuth` o `auth()`) validando el token y el rol correspondiente.
- Las rutas externas `/sucursal/[branchId]/inventory` usan validación de rol branch_user y solo admiten verbos GET.
1. Testing
- Unit tests: Vitest + React Testing Library para componentes y lógica pura (runner: `npm test`).
- Integration tests: Prisma7 + PostgreSQL en contenedor Docker local para flujos completos (crear sucursal → asignar stock → compra → venta → movimiento).
- E2E: Playwright para validar flujos de usuario críticos (login NextAuth, compra con distribución, venta por sucursal, movimiento de stock, acceso al portal externo).
- El agente debe ejecutar npm test antes de cada sdd‑apply y npm run test:e2e antes de sdd‑verify si existen tests E2E.
1. Documentación
- Cada nuevo feature debe contar con su propio archivo markdown en docs/ siguiendo la plantilla de cognitive-doc-design.
- Actualizar README.md con un resumen de las funcionalidades de la v3 y enlaces a los documentos detallados.
1. Versionado y releases
- Usa Conventional Commits (feat, fix, docs, refactor, perf, test, chore).
- Para releases en main, valida que el receipt de revisión exista y que no haya cambios pendientes.
- Si el release es major o sigue a un incidente de seguridad, requiere una revisión extraordinaria (Judgment Day o revisión de 4R) antes de publicar.
1. Estilo visual - CSS / Tailwind
- Leer el archivo STYLE.MD en la raíz del proyecto.

---

## 📚 4. Enlaces a documentación crítica (actualizados vía Context7)

- Next.js 16 (App Router) – https://nextjs.org/docs/app
- Prisma 7 ORM – https://pris.ly/d/prisma-doc
- NextAuth.js / Auth.js – https://authjs.dev/
- Tailwind CSS v4 – https://tailwindcss.com/docs
- Recharts – https://recharts.org/en-US
- Zod v4 – https://zod.dev/
- SweetAlert2 – https://sweetalert2.github.io/
- Playwright – https://playwright.dev/docs/intro
- Vitest – https://vitest.dev/

(El agente debe usar la herramienta context7 para obtener la versión exacta y ejemplos de uso antes de escribir código.)

---

## ✅ 5. Checklist rápido antes de iniciar una nueva tarea SDD

- [ ]  Verificar que .env tenga todas las variables requeridas (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL).
- [ ]  Verificar que el contenedor local de PostgreSQL esté levantado (`docker ps`).
- [ ]  Ejecutar opencode skill run skill-registry para tener el registro actualizado.
- [ ]  Confirmar la pre‑flight de SDD (modo, artifact store, delivery strategy, review budget).
- [ ]  Si la tarea implica cambios de esquema, asegurarse de que el comando `npx prisma migrate dev` pueda ejecutarse contra el Postgres local.
- [ ]  Si la tarea incluye nuevas rutas o componentes, revisar que los archivos de src/app/ sigan la convención de route groups ((routes), (auth), etc.) según el proyecto actual.
- [ ]  Antes de escribir cualquier línea de código, consultar Context7 para la documentación más reciente de la librería involucrada.
- [ ]  Después de escribir código, ejecutar los tests unitarios y de integración correspondientes.
- [ ]  Antes de hacer commit, asegurarse de que el receipt de revisión esté disponible.
- [ ]  Al finalizar, archivar el cambio con sdd‑archive y actualizar el changelog/README si corresponde.

---

## 👥 6. Trabajo colaborativo (equipo de 2)

**Principio rector: el mapa de archivos sigue el mapa de requerimientos.** Cada requerimiento es un módulo vertical con un único dueño. Nadie edita archivos de un módulo que no le pertenece.

### 6.1 Estructura por módulo

```text
src/app/(routes)/<modulo>/      → páginas del módulo
src/components/<modulo>/        → componentes del módulo
src/actions/<modulo>.ts         → server actions del módulo
src/lib/<modulo>/               → lógica de negocio del módulo
```

### 6.2 Propiedad de archivos

1. **Server Actions:** cada módulo tiene SU archivo `src/actions/<modulo>.ts`. Prohibido editar el de otro módulo; si se necesita lógica ajena, se importa.
2. **Lógica compartida:** la lógica realmente compartida (formateo, cálculos, helpers) va a `src/lib/` compartido; crear o modificar esos archivos SOLO con coordinación del equipo.
3. **Prisma:** `prisma/schema.prisma` y `prisma/migrations/` los administra un único dueño a la vez; nunca editar una migración ya aplicada — crear una nueva (`npx prisma migrate dev --name ...`).
4. **Archivos calientes** (`src/app/layout.tsx`, `src/middleware.ts`, `src/lib/db.ts`, `src/lib/auth.ts`, `package.json`): solo se modifican con acuerdo del equipo o por su dueño designado.

### 6.3 Flujo de Git

1. Prohibido push directo a `main`: main solo recibe Pull Requests.
2. Un requerimiento = una rama `feat/<requerimiento>` = un PR.
3. PRs chicas: máximo ~400 líneas; si se supera, partir en PRs encadenados.
4. Antes de abrir PR: `git pull --rebase origin main` y resolver conflictos en la rama propia.
5. Hacer `git pull --rebase` frecuente (varias veces al día) para mantener conflictos chicos.
6. Nunca `force push` a main; a rama propia solo con aviso al compañero.
7. Cada commit debe dejar el proyecto compilando (unidad de trabajo íntegra).
8. Al instalar dependencias nuevas, avisar al compañero (cambian `package.json` / `package-lock.json`).