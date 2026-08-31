# Tasks: FASE 0 – SDD Estructural (Sistema POS)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950–1100 (schema ~270, docs/AGENTS.md ~180, validations ~150, estructura ~250, tooling ~130) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Base config → PR 2 Estructura → PR 3 Contrato → PR 4 Data model |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Base config + lint + docs stale | PR 1 | `npm run lint` + `npx playwright test e2e/smoke.spec.ts` | `npm run dev` (webServer de Playwright levanta Next) | Revert configs (`playwright.config.ts`, `vitest.config.mts`, `package.json`) y fixes de docs sin tocar `src/` |
| 2 | Estructura route groups + shells calientes + mapa | PR 2 | `tsc --noEmit` + `npm run lint` | `npm run dev` → `GET /` redirige a `/login` (smoke A verde) | `git rm -r src/app/(auth) src/app/(routes) src/actions src/lib/auth.ts src/middleware.ts` + revert layout/page |
| 3 | Contrato Zod compartido | PR 3 | `npm test` (specs de validations) | N/A — validación pura sin boundary runtime; los tests unitarios son el harness | `git rm -r src/lib/validations` (nada más depende de él en Fase 0) |
| 4 | Modelo relacional completo | PR 4 | `npx prisma validate` + `npm run db:generate` | N/A — sin migración aplicada; validación estática del schema | `git restore prisma/schema.prisma` (sin migración → sin rollback de BD) |

## Phase 1: Base Config & Tooling

- [x] 1.1 **RED** `e2e/smoke.spec.ts`: scenario A (sin sesión → `/login`) activo; scenario B (admin → `/dashboard`) con `test.skip` + TODO Auth. Aceptación: `npx playwright test e2e/smoke.spec.ts` corre y A falla (page.tsx aún boilerplate). Commit: `test(e2e): add smoke redirect spec (auth scenario skipped)`
- [x] 1.2 `playwright.config.ts`: `webServer {command:"npm run dev", url: http://localhost:3000, reuseExistingServer: !CI}`, `baseURL`, proyecto chromium, `testDir: "./e2e"`. Aceptación: `npx playwright test` levanta dev server y reporta. Commit: `chore(e2e): configure playwright with dev webServer`
- [x] 1.3 **GREEN** Instalar `@vitest/coverage-v8` (devDep) + `vitest.config.mts`: coverage v8, include `src/lib/** src/actions/** src/middleware.ts src/app/**`, exclude `src/generated/** src/test/** **/*.test.* src/components/__tests__/**`, thresholds 80 (statements/branches/functions/lines), coverage activo en `npm test` (`coverage.enabled: true` o script `vitest run --coverage`). Archivos calientes (`package.json`) con acuerdo. Aceptación: `npm test` genera reporte; umbral evaluado en 5.2. Commit: `build(vitest): add v8 coverage with 80% DoD thresholds`
- [x] 1.4 Fix lint `docs/` (×3): `docs/AGENTS.md` H1 duplicado→`##` (l.11) + fence→` ```text ` (l.147); `docs/HU-proyectoPOS.md` `#`→`##` (l.1). Aceptación: `npm run lint` verde sin ignorar `docs/`. Commit: `docs(lint): fix markdown errors in docs/`
- [x] 1.5 Fix lint `openspec/.../exploration.md`: fence→` ```text ` (l.59). Aceptación: `npm run lint` verde. Commit: `docs(lint): tag exploration code fence with text`
- [x] 1.6 `docs/AGENTS.md` stale: sincronizar con AGENTS.md raíz (proyecto-pos: `DATABASE_URL`/`NEXTAUTH_URL`/`NEXTAUTH_SECRET`/`NEXT_PUBLIC_APP_ENV`, `prisma.config.ts`, NextAuth v4, bcrypt 10 rounds; eliminar `ssr-sistema-tickets`, `AUTH_URL`/`AUTH_SECRET`/`APP_ENV`, `prisma7.config.ts`, Socket.io). Aceptación: grep sin `ssr-sistema-tickets|AUTH_URL|AUTH_SECRET|APP_ENV` en el archivo; lint verde. Commit: `docs(agents): refresh docs/AGENTS.md to proyecto-pos stack`

## Phase 2: Project Structure

- [x] 2.1 `src/app/layout.tsx` (hot): metadata POS — título "Sistema POS", `lang="es"` (R-5). Aceptación: `tsc --noEmit` + lint verdes. Commit: `feat(app): set POS metadata and es locale in root layout`
- [x] 2.2 **GREEN del smoke** `src/app/page.tsx` (hot): reemplazar boilerplate por `getServerSession(authOptions)` → redirect `/dashboard` \| `/login`. Aceptación: scenario A del smoke verde. Commit: `feat(app): redirect root by session state`
- [x] 2.3 Placeholders RSC: `src/app/(auth)/login/page.tsx` + `src/app/(routes)/{ventas,compras,inventario,inactivos,descuentos,dashboard}/page.tsx` (R-1/R-2). Aceptación: rutas responden 200 en dev server; lint/tsc verdes. Commit: `feat(app): scaffold module route groups with placeholders`
- [x] 2.4 `src/lib/auth.ts` (hot, shell): `authOptions` con Credentials Provider (`authorize`→null) y callbacks JWT `id`+`role`; sin validación de credenciales (HU-1.1). Aceptación: exporta `authOptions`; tsc verde. Commit: `feat(auth): add structural authOptions shell`
- [x] 2.5 `src/middleware.ts` (hot, shell): `matcher` + matriz de roles documentada (público `/login`+`/api/auth`; cashier `/ventas`,`/inventario`,`/compras` GET; admin todo + `/inactivos`,`/descuentos`,`/dashboard`); validación real en HU-1.2. Aceptación: tsc+lint verdes; matriz en comentario. Commit: `feat(auth): scaffold role matrix middleware shell`
- [x] 2.6 `src/actions/{auth,inventario,ventas,compras,descuentos,dashboard}.ts`: shells comment-only (mapa de propiedad §7.2; sin lógica de negocio). Aceptación: compilan; sin implementación. Commit: `feat(actions): scaffold per-module server action shells`
- [x] 2.7 `.gitkeep` en `src/components/{ui,ventas,compras,inventario,descuentos,dashboard}/` y `src/lib/{inventario,ventas,compras,descuentos,dashboard}/`. Aceptación: estructura de directorios presente (R-1). Commit: `chore(src): scaffold module directories with gitkeep`
- [x] 2.8 `docs/mapa-exposicion.md`: tabla definitiva del Mapa de Exposición (SA vs GET por módulo, ubicación, herramienta de prueba; cashier `/compras` solo lectura; `createPurchase` valida admin server-side). Aceptación: refleja el Module Exposure Map del design. Commit: `docs(exposure): add module exposure map reference`

## Phase 3: Data Contract (TDD)

- [x] 3.1 **RED** Tests unitarios de validaciones: `loginSchema` (email válido/inválido, password min 1), `pagination` defaults, enums `payment`, `ids.cuidSchema`, `ActionResult<T>` discriminado (ok/error, `ErrorCode`). Aceptación: tests fallan (schemas ausentes). Commit: `test(validations): spec shared Zod contract borders`
- [x] 3.2 **GREEN** `src/lib/validations/{result,auth,pagination,payment,ids}.ts`: `ActionResult<T>` + `ErrorCode` tipado; `loginSchema` con "Credenciales inválidas"; tipos `z.infer` exportados (R-2/R-3). Compartido → solo con coordinación. Aceptación: tests 3.1 verdes; tsc verde. Commit: `feat(validations): add shared Zod contract with ActionResult`

## Phase 4: Data Model

- [x] 4.1 `prisma/schema.prisma` (dueño único BD): 16 modelos + 5 enums del design (User…DiscountVariant; `Role`, `CashRegisterStatus`, `PaymentMethod`, `PurchasePaymentMethod`, `DiscountType`); sin `Sucursal` ni `branch_user` (R-3); `Provider` sin CRUD (R-4); invariantes SKU/stock/`is_active` (R-5). Aceptación: `npx prisma validate` verde. Commit: `feat(prisma): add full domain schema (16 models, 5 enums)`
- [x] 4.2 `npm run db:generate` verifica el cliente Prisma; NO ejecutar `prisma migrate dev` (migración inicial en design de Auth, R-6). Aceptación: generate exitoso; sin migraciones nuevas. Commit: `chore(prisma): verify client generation without migrating`

## Phase 5: Verification

- [ ] 5.1 Gate completo: `npm test`, `tsc --noEmit`, `npm run lint`, `npx playwright test` (smoke A verde, B skip). Aceptación: los 4 comandos verdes. Commit: `test(phase0): green full verification gates`
- [ ] 5.2 Cobertura: con reporte generado, si <80% documentar plan de transición (umbral configurado como gate DoD por módulo desde Auth; Fase 0 = reporte + plan en `docs/mapa-exposicion.md` o nota SDD). Aceptación: reporte generado y plan documentado, o ≥80% directo. Commit: `docs(testing): record progressive coverage plan`
- [ ] 5.3 Verificar convención (R-1/R-4): mapa de archivos = mapa de requerimientos, `docs/` sin ignorar en lint, shells calientes solo con acuerdo. Aceptación: checklist DoD de Fase 0 completo. Commit: fold en 5.1/5.2