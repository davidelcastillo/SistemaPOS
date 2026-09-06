# Spec: Auth — AUTH-HU1-1 (Nueva capability)

## Purpose

Autenticación fundacional del POS: Credentials Provider NextAuth v4 (bcrypt salt 10 + Prisma), JWT/sesión con `role` (`admin`/`cashier`), Server Action `registerUser` (solo admin), UI `/login` reactiva, migración `init` de Prisma (17 modelos) y seed del primer admin. HU-1.2 (proxy por rol) queda fuera de este cambio.

## Requirements

### Requirement: R-1 — Credentials Provider y route handler NextAuth

El sistema MUST exponer la autenticación en `src/app/api/auth/[...nextauth]/route.ts` con NextAuth v4 y Credentials Provider (`signIn("credentials")`). Las rutas `/api/auth/*` MUST permanecer públicas (sin sesión requerida).

#### Scenario: Route handler responde

- GIVEN la app corriendo con el route handler montado
- WHEN un cliente consulta `/api/auth/session`
- THEN responde 200 con la sesión actual o `null`

#### Scenario: Provider credentials registrado

- GIVEN la configuración NextAuth
- WHEN se inspecciona `authOptions`
- THEN existe el provider `credentials` con `authorize` definido

### Requirement: R-2 — authorize valida con Zod y bcrypt antes de autenticar

El `authorize` MUST validar el payload con Zod ANTES de consultar la BD, MUST buscar el usuario por email con `prisma.user.findUnique` y MUST comparar la contraseña con `bcrypt.compare` (hashes creados con salt rounds = 10). Ante credenciales inválidas MUST retornar `null` con error genérico "Credenciales inválidas" (sin enumerar usuarios).

#### Scenario: Credenciales válidas

- GIVEN un usuario existente con contraseña correcta
- WHEN `authorize` recibe email y contraseña válidos
- THEN retorna el objeto User con id, email y role

#### Scenario: Contraseña incorrecta

- GIVEN un usuario registrado
- WHEN `authorize` recibe la contraseña equivocada
- THEN retorna `null`
- AND el error mostrado es "Credenciales inválidas"

#### Scenario: Usuario inexistente

- GIVEN un email no registrado
- WHEN `authorize` procesa el login
- THEN retorna `null` sin revelar si el email existe

#### Scenario: Payload inválido (Zod)

- GIVEN un email mal formado o password vacío
- WHEN `authorize` valida con Zod
- THEN rechaza sin consultar la BD

### Requirement: R-3 — JWT y sesión con role explícito

Los callbacks JWT/sesión MUST incluir `id` y `role` (`admin` | `cashier`) en el token y en `session.user`, consumibles desde componentes cliente y servidor. Un usuario sin role válido MUST NOT obtener sesión.

#### Scenario: Role admin en token y sesión

- GIVEN un usuario admin autenticado
- WHEN se inspeccionan token y session
- THEN `session.user.id` y `session.user.role = "admin"` están presentes

#### Scenario: Role cashier en token y sesión

- GIVEN un usuario cashier autenticado
- WHEN se inspecciona la sesión
- THEN `session.user.role = "cashier"`

### Requirement: R-4 — registerUser Server Action solo admin

La Server Action `registerUser` (`src/actions/auth.ts`) MUST validar con Zod, MUST verificar sesión y rol `admin` server-side y MUST insertar con `bcrypt.hash` (salt 10). MUST rechazar a cashier y no autenticados, y MUST rechazar email duplicado con error descriptivo. Respuestas con `ActionResult<T>` tipado.

#### Scenario: Admin crea usuario

- GIVEN un admin autenticado
- WHEN invoca registerUser con datos válidos
- THEN crea el usuario con password hasheado
- AND devuelve ActionResult ok

#### Scenario: Cashier intenta registrar

- GIVEN un cashier autenticado
- WHEN invoca registerUser
- THEN la operación se rechaza por rol (server-side)

#### Scenario: Usuario no autenticado

- GIVEN una sesión inexistente
- WHEN invoca registerUser
- THEN se rechaza sin tocar la BD

#### Scenario: Email duplicado

- GIVEN un email ya registrado
- WHEN se intenta crear el usuario
- THEN el contrato rechaza con error de unicidad

#### Scenario: Datos inválidos (Zod)

- GIVEN un payload con email inválido o password corto
- WHEN se invoca registerUser
- THEN se rechaza antes de consultar la BD

### Requirement: R-5 — UI /login reactiva

La página `/login` MUST renderizar un formulario client (`react-hook-form` + `zodResolver(loginSchema)`) que muestre estado de carga durante el submit, error descriptivo "Credenciales inválidas" ante fallo y redirija al destino autenticado en éxito.

#### Scenario: Login exitoso

- GIVEN credenciales válidas en el formulario
- WHEN el usuario envía
- THEN se muestra el estado de carga
- AND redirige a /dashboard con sesión activa

#### Scenario: Credenciales inválidas en UI

- GIVEN credenciales incorrectas
- WHEN el usuario envía
- THEN se muestra "Credenciales inválidas"
- AND el formulario permanece en /login

#### Scenario: Errores de validación de campos

- GIVEN un email mal formado o password vacío
- WHEN el usuario envía
- THEN se muestran errores por campo sin llamar a signIn

### Requirement: R-6 — Migración init atómica (17 modelos)

El sistema MUST aplicar la migración inicial `init` (`npm run db:migrate -- --name init`) materializando los 17 modelos en una única migración, coordinada con el compañero y con el contenedor PostgreSQL levantado.

#### Scenario: Migración aplicada

- GIVEN contenedor PostgreSQL levantado y schema validado
- WHEN se ejecuta la migración init
- THEN se crean las tablas de los 17 modelos sin error

#### Scenario: Sin drift tras aplicar

- GIVEN la migración init aplicada
- WHEN se ejecuta `prisma migrate status`
- THEN no hay drift entre schema y BD

### Requirement: R-7 — Seed del primer admin

El sistema MUST proveer `prisma/seed.ts` que cree el primer usuario admin (bcrypt salt 10) para habilitar el login inicial. El seed MUST ser idempotente.

#### Scenario: Seed crea el primer admin

- GIVEN una BD migrada sin usuarios
- WHEN se ejecuta el seed
- THEN existe un usuario con role "admin" y password hasheado

#### Scenario: Seed idempotente

- GIVEN un admin ya existente
- WHEN se ejecuta el seed nuevamente
- THEN no se duplica el usuario