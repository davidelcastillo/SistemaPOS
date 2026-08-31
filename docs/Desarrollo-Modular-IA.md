# Metodología de Desarrollo Modular Asistido por IA

Este documento establece el estándar de trabajo para el desarrollo de *software* utilizando asistentes de inteligencia artificial (Opencode y Gentle-AI). El objetivo es asegurar la calidad del código, evitar conflictos de integración en repositorios compartidos y mantener una arquitectura escalable, posicionando al desarrollador como arquitecto activo en cada decisión técnica.

## 1. Proyectos Nuevos (Fase 0 - Arquitectura Global)

Al iniciar un proyecto desde cero, es imperativo establecer las bases arquitectónicas antes de programar la primera Historia de Usuario (HU). Este paso previene reescrituras masivas a futuro.

- **Definición del Stack:** Establecer las tecnologías principales del sistema (por ejemplo, el uso conjunto de Next.js, TypeScript, Prisma y PostgreSQL).
- **SDD Estructural:** Solicitar a Gentle-AI un *Software Design Document* para definir la estructura de directorios, la configuración base (`tsconfig.json`, ESLint, conexión a base de datos) y un modelo relacional macro del dominio.
- **Mapa de Exposición por Módulo:** Decidir y documentar, para cada módulo del dominio, cómo se expone su lógica al exterior: **Server Actions** (mutaciones llamadas desde componentes, sin URL ni JSON) o **Route Handlers REST** (endpoints con `fetch` desde el cliente). Esta decisión escribe **antes** de programar y determina la herramienta de prueba de ese módulo.
- **Contrato de Datos Tipado:** Definir la política de contrato entre capa de datos y capa de presentación: schemas **Zod** compartidos en `src/lib/` y tipos TypeScript derivados de ellos. El contrato no es un JSON acordado informalmente: es un tipo que el compilador puede verificar.
- **Módulo Fundacional:** Identificar la funcionalidad *core* que destrabe el resto del sistema (usualmente la autenticación y gestión de sesiones) y aplicarle el ciclo iterativo.

## 2. Flujo de Trabajo Iterativo (Módulos y HU)

Para todo proyecto en marcha o tras finalizar la Fase 0, el desarrollo adopta un enfoque estrictamente modular. **Regla de oro:** Nunca solicitar un desarrollo "Full-Stack" en un solo paso. Dentro de cada HU se trabaja por slices verticales delgados: primero los flujos de mayor riesgo (validaciones, estados de error), para recibir feedback del negocio temprano en lugar de al final del ciclo completo.

### El Ciclo de Desarrollo por HU

Una vez seleccionado un módulo específico, se identifica la primera HU y se aplica el siguiente proceso unidireccional:

1. **Capa de Datos y Lógica (Backend):** Diseñar mediante SDD todo lo relacionado con la lógica de negocio. Esto abarca los schemas **Zod** (el contrato, incluyendo sus bordes: errores de validación, operación fallida, estados vacíos y concurrencia), DTOs, consultas a base de datos y la exposición elegida en el mapa de Fase 0 (Server Action o Route Handler).
2. **Pruebas de Integración (Aislamiento):** Antes de tocar la interfaz visual, probar la lógica implementada según su forma de exposición:
    - Para **Server Actions y lógica pura** en `src/lib/<modulo>/`: tests de integración automatizados con **Vitest contra PostgreSQL** (contenedor Docker). Estas acciones no tienen URL ni JSON, por lo que Postman no aplica.
    - Para **Route Handlers REST**: API tests automatizados (supertest o equivalente). **Postman se permite solo como smoke test exploratorio**, nunca como gate de calidad, porque no es automatizable en CI ni protege contra regresiones.
    - Objetivo: las respuestas y las mutaciones en base de datos funcionan según los requisitos, con pruebas que corren también en el futuro (regresión).
3. **Capa de Presentación (Frontend):** Con el contrato ya consolidado y funcionando, lanzar el SDD para el diseño de UI. La IA estructura vistas, componentes y estados **importando los tipos y schemas compartidos** de la capa de datos: la alineación frontend-backend queda validada por el compilador en build time, no por inspección manual.
4. **Pruebas End-to-End:** Testear el flujo completo desde el navegador (Playwright), verificando la conexión del *frontend* con el *backend* y asegurando una buena experiencia de usuario y manejo de errores.
5. **Cierre e Iteración (Definition of Done del módulo):** La HU se considera completa solo cuando se cumplen todos los criterios: tests de la HU verdes (unitarios, integración y E2E si aplica), el archivo `docs/<modulo>.md` actualizado, el artefacto SDD archivado con `sdd-archive`, y —si el repo es compartido— la revisión del compañero y el PR validado con su receipt. Recién entonces se procede con la siguiente HU del mismo módulo, repitiendo el ciclo.

## 3. Control de Calidad y Rol del Desarrollador

> "Avanzar HU por HU separando de forma estricta las capas lógicas y visuales conlleva una mayor inversión de tiempo inicial. Sin embargo, este rigor garantiza que el *software* construido cumple exactamente con las expectativas del negocio. En esta dinámica, el equipo no solo ensambla código, sino que ejerce permanentemente su rol como programadores, arquitectos y auditores técnicos."
>