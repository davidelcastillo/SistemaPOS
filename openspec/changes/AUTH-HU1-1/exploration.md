# Exploration: AUTH-HU1-1 — Autenticación y Manejo de Credenciales con NextAuth

> **Cambio:** AUTH-HU1-1 · **HU-1.1:** Autenticación y manejo de credenciales con NextAuth
> **Fase:** explore · **Origen:** HU-proyectoPOS.md (Módulo 1) + plan-trabajo-david.md (M1)
> **Fecha:** 2026-09-05 · **Autor:** sdd-explore sub-agent

---

## 1. Contexto

HU-1.1 es el primer ciclo de desarrollo post-Fase 0 y el módulo fundacional que destraba
todos los demás (M3, M4, M6 dependen de autenticación; el compañero M2 depende de la
migración). Los criterios de aceptación exigen:

1. Contraseñas SIEMPRE encriptadas con bcrypt (salt rounds = 10) al registrarse/cambiarse.
2. Validación server-side con Zod ANTES de consultar la BD.
3. JWT + sesión NextAuth incluyen explícitamente `role` (`admin`/`cashier`).
4. `/login` reactivo: estados de carga + errores descriptivos ("Credenciales inválidas").
5. Migración init de Prisma (17 modelos, coordinada con el compañero).
6. `.env` completo: `NEXTAUTH_URL` + `NEXTAUTH_SECRET`.
7. Decisión: `middleware.ts` → `proxy.ts` (Next 16 deprecó el nombre).

El estado actual es un scaffold estructural (Fase 0): shells vacíos, `authorize → null`,
`middleware()` no-op, placeholder de login, schema SIN migrar.

---

## 2. Hallazgos por Pregunta Abierta

### P1. `middleware.ts` → `proxy.ts`: ¿migrar con codemod o aceptar warning?

| Aspecto | Evidencia |
|---------|-----------|
| **Documentación Next.js 16 (definitiva)** | `node_modules/next/dist/docs/.../proxy.md`: *"Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime."* El `runtime` config NO está disponible en Proxy. |
| **Codemod oficial** | `npx @next/codemod@canary middleware-to-proxy .` renombra archivo + función. Compatible con Fase 0 (ver línea 758-768 del proxy.md). |
| **Impacto en matriz de roles** | CERO impacto funcional: proxy.ts usa la misma API `NextRequest`/`NextResponse.next()`/`NextResponse.redirect()`. El matcher actual sigue válido. |
| **Impacto en E2E smoke** | CERO: scenario A redirige por `page.tsx` (no por middleware). Scenario B requiere auth funcional, no rename. |
| **Impacto en contrato Fase 0** | El design Fase 0 (D8) declaró `middleware.ts` como shell HOT. La desviación `middleware→proxy` YA está documentada en verify-report.md (warning #1, sugerencia #2). |
| **Edge runtime** | Proxy usa Node.js runtime obligatoriamente. NextAuth edge workarounds innecesarios (Context7: *"edge compatibility workarounds may no longer be necessary"*). |

| Opción | Pros | Cons | Esfuerzo |
|--------|------|------|----------|
| **A. Migrar con codemod** | Nativo Next 16; elimina warning; Node.js runtime habilita Prisma directo; alineado con docs oficiales. | Requiere touchar archivo caliente (coordinación). | Bajo |
| **B. Mantener middleware.ts** | Sin cambio ahora. Warning en deprecación; futura migración forzosa; posible quiebre en Next 17+. | Deuda técnica. | Cero ahora / Medio después |

**Recomendación:** Opción A (migrar con codemod). Esfuerzo bajo, beneficio alto (elimina deuda,
habilita Node.js runtime para `getServerSession` + Prisma en proxy, alineado con Next 16).

---

### P2. NextAuth v4 + Next 16 (edge runtime): ¿compatibilidad real?

| Aspecto | Evidencia |
|---------|-----------|
| **Documentación oficial (Context7)** | *"As of Next.js 16, proxy.ts executes within the Node.js runtime, which eliminates concerns about edge compatibility for the database client."* |
| **Prisma en proxy** | Con Node.js runtime, `prisma.user.findUnique()` funciona directo en proxy.ts sin adaptación edge. |
| **`getServerSession`** | Funciona en Node.js runtime sin `auth()` wrapper. El shell actual (`src/lib/auth.ts`) ya tiene la estructura correcta. |
| **JWT callbacks** | Ya implementados en shell: `token.id`, `token.role` → `session.user.id`, `session.user.role`. Tipos en `next-auth.d.ts` ya cubren la unión `"admin" \| "cashier"`. |
| **Alternativa jose** | NO necesaria. NextAuth v4 maneja JWT internamente con `NEXTAUTH_SECRET`. Solo requerida si se valida JWT manualmente en edge runtime (ya no aplica). |

**Conclusión:** Compatibilidad confirmada. NextAuth v4 + proxy.ts (Node.js runtime) es la
configuración target. No se necesita `jose` ni workarounds edge.

---

### P3. Migración init: estrategia para 17 modelos en UNA migración

| Aspecto | Evidencia |
|---------|-----------|
| **Schema completo** | `prisma/schema.prisma`: 17 modelos + 5 enums, validado (`prisma validate` exit 0 en verify-report). |
| **Prisma 7 + prisma.config.ts** | `datasource.url` lee de `process.env.DATABASE_URL` vía `prisma.config.ts` (con `dotenv/config`). El schema NO lleva `url`. |
| **Dueño único** | David (confirmado en plan-trabajo-david §9). Coordinación con compañero ANTES de ejecutar. |
| **Riesgo slow filesystem (D:)** | Verificado en Fase 0: primer compile 250-1500ms. La migración es I/O acotada; riesgo bajo. |
| **`db:generate` funciona** | `prisma generate` ya ejecutó en Fase 0 (cliente generado en `src/generated/prisma`). |
| **Migración staged (descartada)** | Design D7 Fase 0 la descartó: rompe spec R-1 (schema completo en Fase 0). |

| Opción | Pros | Cons |
|--------|------|------|
| **A. `migrate dev --name init` (1 migración)** | Atómica; materializa todo el schema; alineada con D7 Fase 0. | Requiere contenedor PostgreSQL levantado. |
| **B. `db push` (sin migración)** | Rápido, sin historial. | Sin rollback; no genera migrations/ (prohibido por metodología). |

**Recomendación:** Opción A. `npm run db:migrate -- --name init` con contenedor PostgreSQL
levantado y compañero notificado.

---

### P4. `.env`: valores recomendados para dev

| Variable | Valor dev | Generación |
|----------|-----------|------------|
| `NEXTAUTH_URL` | `http://localhost:3000` | Hardcodeado (URL canónica dev). |
| `NEXTAUTH_SECRET` | Random 32 bytes base64 | Windows: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (equivalente a `openssl rand -base64 32`). |

**Nota:** El verify-report Fase 0 confirma que `.env` SOLO tiene `NEXTAUTH_URL`/`NEXTAUTH_SECRET`
faltan (warning #2). Son bloqueantes para HU-1.1 (sin secret, NextAuth no firma JWT).

---

### P5. Login UI: estructura del formulario

| Aspecto | Evidencia |
|---------|-----------|
| **deps disponibles** | `react-hook-form` (^7.85.0) en package.json. No hay `@hookform/resolvers` (requerido para Zod). |
| **Schema Zod** | `src/lib/validations/auth.ts`: `loginSchema` con `email` + `password` (min 1 → "Credenciales inválidas"). |
| **Estados requeridos** | Carga (submit en progreso), error ("Credenciales inválidas"), éxito (redirect). |
| **Redirect post-login** | `src/app/page.tsx` ya redirige por sesión: autenticado → `/dashboard`. No requiere lógica extra. |
| **Dependencia nueva** | `@hookform/resolvers` (v4 compatible con zod v4) — requerirá coordinación (package.json es archivo caliente). |

**Estructura propuesta:** Client component (`"use client"`) con `react-hook-form` +
`zodResolver(loginSchema)`, `signIn("credentials")` de `next-auth/react`, manejo de estados
con `useState`, y redirección con `useRouter` o redirect de `signIn()`.

---

### P6. `registerUser`: ¿dentro del alcance de HU-1.1?

| Fuente | Dice |
|--------|------|
| **mapa-exposicion.md** | `registro → SA registerUser → src/actions/auth.ts → Vitest integración PostgreSQL` |
| **plan-trabajo-david §4** | `registro \| SA registerUser \| src/actions/auth.ts \| Vitest integración PostgreSQL` |
| **HU-proyectoPOS.md (criterios)** | *"al registrarse o cambiarse"* — menciona registro implícitamente en el contexto de bcrypt. |

**Conclusión:** `registerUser` está en el alcance de HU-1.1 según el mapa de exposición
(definitivo, Fase 0). Es una Server Action con bcrypt (10 rounds), validación Zod, e
inserción en tabla `User`. No incluye "cambiar contraseña" (eso es otra HU futura o parte de
un perfil de usuario). El diseño debe cubrir `registerUser` (registro) + flujo login
(Credentials Provider), ambos con bcrypt + Zod.

---

### P7. E2E: conectar scenario B del smoke con HU-1.1

| Aspecto | Evidencia |
|---------|-----------|
| **Estado actual** | `e2e/smoke.spec.ts`: scenario A (sin sesión → /login) PASSED; scenario B (admin → /dashboard) `test.skip`. |
| **Activación** | Design D9 Fase 0: *"skip hasta Auth; se activa en la E2E de Auth"*. |
| **Estrategia** | Crear usuario admin semilla (script o migrate seed), ejecutar login via UI Playwright, verificar redirect a `/dashboard`. |
| **种子 (seed)** | No existe `prisma/seed.ts`. HU-1.1 debe decidir: seed via migración o script separado. |

**Recomendación:** Agregar test E2E de login en el verify de HU-1.1 (no necesariamente en el
smoke existente). El smoke B puede activarse con un `storageState` de Playwright tras el login.

---

## 3. Archivos Calientes / Estructurales Afectados (AVISO AL COMPAÑERO)

Estos archivos se tocarán en el design/apply de AUTH-HU1-1. **Coordinación requerida.**

| Archivo | Tipo | Acción | Impacto compañero |
|---------|------|--------|-------------------|
| `src/middleware.ts` | HOT | Rename a `proxy.ts` + implementar matriz de roles real | El compañero usa la matriz para proteger sus rutas |
| `src/lib/auth.ts` | HOT | Completar `authorize` con bcrypt + Prisma | Ninguno directo (auth es de David) |
| `src/lib/prisma.ts` | HOT | Sin cambios (ya funciona) | — |
| `prisma/schema.prisma` | HOT/ESTRUCTURAL | Sin cambios (schema completo ya está) | — |
| `prisma/migrations/` | NUEVO | Crear migración `init` | El compañero depende de esta migración para M2 |
| `package.json` | HOT | Agregar `@hookform/resolver` (dependencia) | Requiere acuerdo del equipo |
| `.env` | CONFIG | Agregar `NEXTAUTH_URL` + `NEXTAUTH_SECRET` | Ambos necesitan el secret |
| `src/app/api/auth/[...nextauth]/route.ts` | NUEVO | Crear route handler NextAuth | Ninguno (auth es de David) |
| `src/actions/auth.ts` | PROPIO | Implementar `registerUser` con bcrypt + Zod | Ninguno |
| `src/app/(auth)/login/page.tsx` | PROPIO | UI completa (react-hook-form + estados) | Ninguno |

**Aviso de coordinación prioritario:** migración `init` (toda la BD) y nueva dependencia
`@hookform/resolvers` en package.json.

---

## 4. Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| R1 | Contenedor PostgreSQL no levantado al momento de migrar | Media | Bloqueante | `docker ps` antes de `sdd-apply`; levantar con `docker compose up -d` |
| R2 | `@hookform/resolvers` versión incompatible con zod v4 | Baja | Medio | Context7 para verificar compatibilidad antes de instalar |
| R3 | `NEXTAUTH_SECRET` insuficiente o comprometido | Baja | Alto (seguridad) | Generar con `crypto.randomBytes(32)`; nunca hardcodear en repo |
| R4 | Codemod `middleware-to-proxy` rompe tipos custom | Baja | Bajo | El shell actual usa tipos estándar (`NextRequest`, `NextResponse.next()`) |
| R5 | `authorize` retorna tipo `User` sin `role` → token.role undefined | Media | Alto | Tipado estricto en authorize; tests de integración cubren el borde |
| R6 | bcrypt v6 API cambio vs expectations | Baja | Medio | Verificar API (`hash`/`compare`) con Context7 antes de implementar |

---

## 5. Alcance Propuesto para el Proposal

**Incluye HU-1.1:**
- Implementar Credentials Provider con `authorize` (bcrypt 10 rounds + Prisma).
- JWT callbacks `id` + `role` (ya en shell; verificar funcionamiento real).
- Route handler `src/app/api/auth/[...nextauth]/route.ts`.
- Server Action `registerUser` (bcrypt + Zod + inserción).
- UI `/login` completa (react-hook-form + zodResolver + estados carga/error).
- Migración `init` de Prisma (17 modelos) — coordinada.
- `.env` completo (NEXTAUTH_URL + NEXTAUTH_SECRET).
- Migración `middleware.ts` → `proxy.ts` (codemod Next 16).
- Tests: integración (registerUser, authorize), E2E (login → redirect).

**Excluye HU-1.1 (queda para después):**
- Restricción de rutas por rol (HU-1.2 — requiere proxy.ts + matriz).
- "Cambiar contraseña" (parte de un perfil de usuario futuro).
- Seed de usuarios (se decide en design; puede ser script ad-hoc).

---

## 6. Recomendación General

**Estamos listos para el proposal.** La exploración confirmó:

1. La migración `middleware.ts → proxy.ts` es limpia, oficial Next 16, y habilita Node.js
   runtime (elimina workarounds edge). Hacerla JUNTO con HU-1.1 para no tocar el archivo
   caliente dos veces.
2. NextAuth v4 + proxy.ts (Node.js) es compatible — no se necesita `jose` ni edge hacks.
3. La migración `init` es el paso de mayor riesgo (coordinación + contenedor).
4. `registerUser` está en alcance (mapa de exposición definitivo).
5. La dependencia `@hookform/resolvers` es necesaria — coordinar con el compañero antes
   de instalar.

**Decisión de design a confirmar con el usuario:**
- Estrategia de seed (¿usuario admin inicial? ¿cómo se crea el primer admin si `registerUser` es SA?).
- ¿`registerUser` es público (cualquiera puede registrarse) o admin-only (solo admin crea usuarios)?
