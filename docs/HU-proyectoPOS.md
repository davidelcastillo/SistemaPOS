## **Prompt Para la actualización que se utilizo**

### **1️⃣Módulo 1: Autenticación y Control de Accesos**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Implementar el sistema de autenticación, manejo seguro de credenciales y encriptación, estableciendo el control de acceso estricto a las páginas del sistema basado en los perfiles de usuario.  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`) y Cajero (`cashier`).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-1.1: Autenticación y Manejo de Credenciales con NextAuth**

* **Rol:** Administrador / Cajero  
* **Función:** El sistema debe permitir el ingreso seguro de los usuarios registrados utilizando correo electrónico y contraseña, gestionando la sesión a través del Credentials Provider de NextAuth.  
* **Criterios de Aceptación:**  
  * Las contraseñas de los usuarios deben estar obligatoriamente encriptadas en la base de datos PostgreSQL utilizando la librería `bcrypt`.  
  * El proceso de validación de datos en el servidor debe realizarse con esquemas de Zod antes de consultar la base de datos.  
  * El token JWT y la sesión activa de NextAuth deben incluir explícitamente el rol del usuario (`admin` o `cashier`) para su consumo y validación tanto en componentes del cliente como del servidor.  
  * El formulario de la interfaz de `/login` debe manejar de forma reactiva los estados de carga y mostrar mensajes de error descriptivos (ej. "Credenciales inválidas").

**HU-1.2: Restricción de Rutas y Middleware por Rol**

* **Rol:** Sistema (Middleware)  
* **Función:** Proteger las páginas del sistema y redirigir automáticamente a los usuarios basándose en su estado de autenticación y su nivel de permisos.  
* **Criterios de Aceptación:**  
  * Se debe configurar un middleware centralizado (`src/middleware.ts`) para evaluar cada petición a las rutas de la aplicación.  
  * **Usuario no autenticado (sin loguear):** El sistema debe denegar el acceso a cualquier ruta protegida y redirigir obligatoriamente a la página `/login`.  
  * **Rol Cajero (`cashier`):** El sistema debe restringir su navegación permitiendo el acceso única y exclusivamente a las rutas `/login`, `/ventas` y `/inventario`. Cualquier intento de acceso a otra ruta debe ser bloqueado.  
  * **Rol Administrador (`admin`):** El sistema debe otorgarle acceso global, permitiendo la navegación libre por cualquier página de la aplicación una vez autenticado.

### **2️⃣Módulo 2: Inventario, Categorías y Gestión de Productos**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Gestionar el catálogo completo de productos maestros y sus variantes dinámicas (combinaciones N a N de colores, talles y atributos), la creación y administración de categorías, la modificación de existencias e información general, la inactivación lógica (soft-delete) de artículos y el acceso a un panel exclusivo para la revisión y reactivación de productos dados de baja (`/inactivos`).  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`) y Cajero (`cashier`).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-2.1: Gestión y Alta de Categorías**

* **Rol:** Administrador (`admin`)  
* **Función:** El sistema debe permitir crear, listar, editar y administrar las categorías del catálogo para la clasificación de la indumentaria y accesorios.  
* **Criterios de Aceptación:**  
  * El formulario de creación/edición debe exigir un nombre único para la categoría y permitir un campo descriptivo opcional.  
  * La validación de los datos ingresados debe ejecutarse en el servidor utilizando esquemas de Zod.  
  * Los datos deben persistirse en la base de datos PostgreSQL a través del ORM Prisma.  
  * Las categorías estarán disponibles de forma reactiva en todos los selectores de productos del sistema mediante revalidación de rutas (`revalidatePath`).

**HU-2.2: Alta de Producto Maestro y Variantes Dinámicas (Combinaciones N a N)**

* **Rol:** Administrador (`admin`)  
* **Función:** Permitir el alta de un producto maestro (ej. "Remera Lana") vinculando múltiples variantes combinables (colores, talles, accesorios) con relaciones N a N flexibles.  
* **Criterios de Aceptación:**  
  * **Producto Maestro:** Requiere obligatoriamente un nombre, descripción general, precio base de referencia y la selección de una categoría activa.  
  * **Generación de Variantes (Matriz Dinámica N a N):** El sistema debe permitir crear combinaciones independientes de atributos (ej. Color 2 \+ Talle S, Color 4 \+ Talle XL). Cada variante creada debe guardar obligatoriamente su propio `SKU` único, precio de venta específico y cantidad de `stock` inicial.  
  * La persistencia del producto maestro y su arreglo dinámico de variantes debe ejecutarse en una única transacción atómica (`$transaction` de Prisma) en PostgreSQL para evitar inconsistencias de datos.

**HU-2.3: Búsqueda Textual y Modificación de Productos**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Consultar el inventario activo mediante búsquedas exclusivamente textuales y permitir la actualización de precios, detalles o stock de los productos.  
* **Criterios de Aceptación:**  
  * **Restricción de Hardware:** El proceso de búsqueda se realizará estrictamente mediante la entrada manual de texto en teclado; se descarta cualquier uso o integración con lectores físicos de códigos de barras.  
  * La búsqueda debe filtrar la base de datos aplicando un retraso (*debounce*) utilizando consultas en Prisma con los operadores `OR` y `contains` en modo insensible a mayúsculas/minúsculas (`mode: 'insensitive'`) sobre los campos: `nombre del producto maestro`, `SKU`, `descripción` o `categoría`.  
  * El formulario de edición debe permitir al Administrador actualizar precios, stock y atributos tanto del producto maestro como de sus variantes.  
  * El rol Cajero (`cashier`) tendrá acceso a la ruta `/inventario` únicamente en modo de consulta de existencias y precios, sin permisos de edición.

**HU-2.4: Desactivación Lógica de Productos (Soft Delete)**

* **Rol:** Administrador (`admin`)  
* **Función:** Deshabilitar productos o variantes del catálogo activo sin eliminar sus registros físicamente de PostgreSQL, preservando la integridad del historial de ventas y compras.  
* **Criterios de Aceptación:**  
  * La interfaz debe incluir un botón de desactivación por producto/variante.  
  * Al ejecutar la acción, la base de datos debe actualizar el flag booleano `is_active` a `false`.  
  * Los productos desactivados deben desaparecer de forma inmediata de las búsquedas del punto de venta (`/ventas`) y de los listados estándar de `/inventario`.

**HU-2.5: Módulo de Productos Inactivos (`/inactivos`)**

* **Rol:** Administrador (`admin`)  
* **Función:** Visualizar y administrar en una página dedicada (`/inactivos`) todos aquellos productos y variantes que hayan sido desactivados previamente, permitiendo su reactivación.  
* **Criterios de Aceptación:**  
  * La interfaz de `/inventario` debe incluir un botón con el texto explícito **"Ver Desactivados"**, el cual redirigirá a la ruta protegida `/inactivos`.  
  * La página `/inactivos` debe listar de forma tabulada únicamente los registros donde `is_active` sea igual a `false`.  
  * Cada registro inactivo en esta vista debe contar con un botón de "Reactivar", el cual devolverá el flag `is_active` a `true` mediante un Server Action, reinstaurando el producto inmediatamente en el catálogo activo y ejecutando `revalidatePath('/inventario')`.

### **3️⃣Módulo 3: Punto de Venta, Caja Diaria y Procesamiento de Ventas**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Implementar el flujo operativo completo del punto de venta (`/compras` y `/ventas`), gestionando el control de apertura y cierre de caja diaria, la selección asistida en pasos (wizard) de productos maestros y variantes, la integración de descuentos por cantidad/docena, el registro manual de métodos de pago y el listado histórico de transacciones por día.  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`) y Cajero (`cashier`).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-3.1: Control de Caja Diaria (Apertura y Cierre)**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Registrar la apertura del turno de caja declarando el monto inicial en efectivo y procesar el arqueo/cierre al finalizar la jornada.  
* **Criterios de Aceptación:**  
  * El sistema debe requerir la declaración obligatoria del monto inicial en efectivo al abrir la caja diaria.  
  * El registro se debe guardar en la tabla `cash_registers` asociando el ID del usuario autenticado vía NextAuth (`opened_by`).  
  * Se debe bloquear la ejecución de cualquier compra/venta si no existe una caja activa (`status: 'open'`) vinculada al día/turno.  
  * En el cierre de caja, el sistema debe calcular automáticamente el saldo esperado en efectivo (Monto Inicial \+ Ventas en Efectivo \- Egresos) y contrastarlo con el dinero físico declarado por el operador.

**HU-3.2: Flujo Paso 1 \- Búsqueda Textual y Selección de Productos/Variantes para Ventas**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Seleccionar un Producto Maestro y desplegar dinámicamente sus variantes para indicar la cantidad y precio unitario dentro del flujo de la transacción.  
* **Criterios de Aceptación:**  
  * **Restricción de Hardware:** La búsqueda de productos se realizará de forma exclusivamente textual (por coincidencia en nombre del producto maestro, SKU, categoría o descripción) con filtro reactivo (*debounce*).  
  * Al seleccionar un Producto Maestro, la interfaz debe desplegar de manera fluida sus variantes asociadas (combinaciones de talle, color, etc.) permitiendo elegir la variante específica.  
  * Se debe ingresar la cantidad deseada y validar en tiempo real que no supere el stock disponible en la base de datos PostgreSQL.  
  * Al confirmar la selección de ítems, el sistema habilita el paso a la siguiente pantalla del flujo.

**HU-3.3: Flujo Paso 2 \- Aplicación de Descuentos en Transacción**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Evaluar la lista de productos seleccionados y aplicar descuentos acumulativos o específicos (por docena, por volumen de cantidad o reglas del Módulo de Descuentos) sobre el total.  
* **Criterios de Aceptación:**  
  * La pantalla debe conectar con las reglas de promociones y descuentos activos configurados en el sistema.  
  * Permite la aplicación automática o selección manual de *N* descuentos válidos (ej. descuento por llevar docena, por llevar 3 productos de una misma categoría, o rebaja fija/porcentual).  
  * El sistema debe recalcular dinámicamente el subtotal, el desglose de los descuentos aplicados y el monto total definitivo a cobrar antes de avanzar al paso final.

**HU-3.4: Flujo Paso 3 \- Selección de Método de Pago y Consolidación**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Seleccionar la vía de pago de la transacción y consolidar la operación en la base de datos impactando el stock y la caja.  
* **Criterios de Aceptación:**  
  * El sistema debe permitir seleccionar el método de pago entre las siguientes opciones:  
    1. **Efectivo** (`cash`)  
    2. **Transferencia Mercado Pago** (`mp_transfer`)  
    3. **Posnet Mercado Pago (Tarjetas/QR)** (`mp_posnet`)  
  * **Integración API Mercado Pago:** Las opciones referentes a Mercado Pago deben quedar preparadas tanto en la estructura del modelo de datos como en la interfaz de usuario, pero la integración directa por API permanecerá deshabilitada/desactivada en esta fase hasta su posterior activación técnica.  
  * La transacción completa (creación del registro de venta, detalle de ítems, descuentos aplicados y descuento de stock en `product_variants`) debe ejecutarse de forma atómica mediante `$transaction` de Prisma.

**HU-3.5: Listado Histórico y Gestión en `/ventas`**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Visualizar y auditar todas las transacciones procesadas en la página base `/ventas` con posibilidad de filtrar por fecha/día.  
* **Criterios de Aceptación:**  
  * Todas las compras/ventas realizadas deben actualizar dinámicamente la tabla principal de la página base.  
  * Se debe permitir el filtrado por día/fecha vinculándolo con la jornada de caja correspondiente.  
  * Cada registro debe mostrar la fecha, hora, operador, detalle de productos, método de pago seleccionado y total cobrado.

### **4️⃣Módulo 4: Gestión de Compras a Proveedores y Egresos**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Implementar la gestión transaccional de compras de mercadería a proveedores en la página dedicada `/compras`, permitiendo registrar la entrada de stock, controlar los costos de adquisición, seleccionar el método de pago utilizado para el egreso y auditar el historial de compras filtrado por jornada de caja y fecha.  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`) y Cajero (`cashier`).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-4.1: Vincular Compra con Caja Diaria y Egresos**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Validar que la jornada de caja esté abierta antes de registrar una compra y reflejar la salida de dinero en el balance de la caja activa.  
* **Criterios de Aceptación:**  
  * El sistema debe verificar en la tabla `cash_registers` de PostgreSQL que exista una caja con estado abierto (`status: 'open'`) asociada al usuario autenticado vía NextAuth.  
  * No se debe permitir iniciar el modal/formulario de compras si la caja diaria no ha sido abierta previamente.  
  * Si la compra se liquida en efectivo (`cash`), el monto total de la operación debe descontarse automáticamente del saldo disponible en efectivo de la caja activa y registrarse como un egreso de mercadería.

**HU-4.2: Flujo Paso 1 \- Búsqueda Textual y Carga de Productos/Variantes de Compra**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Buscar productos maestros en el sistema, desplegar sus variantes e indicar las cantidades adquiridas y el costo unitario de compra dentro del modal interactivo.  
* **Criterios de Aceptación:**  
  * **Restricción de Hardware:** El proceso de búsqueda se realizará exclusivamente mediante la entrada textual con teclado (filtrando por nombre del producto maestro, SKU, categoría o descripción) con un mecanismo de retraso (*debounce*).  
  * Al seleccionar un Producto Maestro activo, el modal debe desplegar dinámicamente sus variantes registradas (combinaciones N a N de color, talle, etc.).  
  * Por cada variante seleccionada, el operador debe ingresar la cantidad comprada y el precio/costo unitario de compra (monto de adquisición al proveedor).  
  * La interfaz debe calcular el subtotal por línea de producto y permitir avanzar al paso final tras confirmar la lista de ítems.

## **FALTA AGREGAR QUE EN EL PASO UNO SE CREEN PRODUCTOS (Usar el modal de creación de productos de la pagina de inventario)**

**HU-4.3: Flujo Paso 2 \- Selección de Método de Pago al Proveedor y Consolidación de Stock**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Asignar la vía de pago utilizada para cancelar la compra e incrementar automáticamente el inventario en la base de datos PostgreSQL.  
* **Criterios de Aceptación:**  
  * El sistema debe requerir la selección del método de pago de la compra entre las siguientes opciones:  
    1. **Efectivo** (`cash`)  
    2. **Transferencia** (`transfer`)  
  * La transacción completa (registro de la cabecera en `purchases`, detalle de ítems con sus costos en `purchase_items` e **incremento** del stock en `product_variants`) debe ejecutarse de forma atómica mediante `$transaction` de Prisma.  
  * En caso de fallo durante el procesamiento, la operación debe revertirse totalmente sin alterar las existencias actuales.

**HU-4.4: Listado Histórico y Auditoría en `/compras`**

* **Rol:** Administrador (`admin`) / Cajero (`cashier`)  
* **Función:** Consultar, auditar y filtrar el historial de compras a proveedores en la página base `/compras`.  
* **Criterios de Aceptación:**  
  * La vista principal de `/compras` debe mostrar una tabla paginada con todas las transacciones de abastecimiento registradas en el sistema.  
  * Se debe permitir el filtrado de registros por fecha o jornada de caja específica mediante componentes de SWR.  
  * Cada fila de la tabla debe detallar la fecha y hora de la compra, el usuario que la registró, los productos y variantes adquiridos con sus cantidades, el método de pago seleccionado y el monto total egresado.

### **5️⃣Módulo 5: Motor de Descuentos y Promociones**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Implementar un motor de reglas de negocio centralizado en la ruta `/descuentos` que permita crear, modificar y desactivar políticas de rebajas. El sistema soportará condiciones complejas y combinables basadas en volumen (cantidades), categorías, productos maestros específicos y variantes exactas.  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`). (Rol `cashier` no tiene acceso).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-5.1: Panel de Control y Alta de Descuentos**

* **Rol:** Administrador (`admin`)  
* **Función:** Acceder a la página protegida `/descuentos` para crear nuevas reglas de promoción asignándoles un nombre descriptivo y definiendo el tipo de rebaja (porcentaje o monto fijo).  
* **Criterios de Aceptación:**  
  * El acceso a la ruta `/descuentos` debe estar restringido exclusivamente al rol `admin` mediante el middleware de NextAuth.  
  * El formulario de creación debe exigir, validado mediante Zod, un nombre para la regla (ej. "Promo Verano" o "Mayorista Docena") y el valor numérico a descontar.  
  * Todos los registros generados se persistirán en una tabla central de `discounts` en PostgreSQL.

**HU-5.2: Configuración de Condiciones y Alcance (Reglas Combinables)**

* **Rol:** Administrador (`admin`)  
* **Función:** Definir bajo qué parámetros específicos de los ítems del carrito se activará el descuento creado, permitiendo selección múltiple y condiciones apiladas.  
* **Criterios de Aceptación:**  
  * El formulario debe permitir configurar el alcance seleccionando una o múltiples de las siguientes entidades mediante relaciones en Prisma:  
    1. **Categorías:** Aplicar a una o *N* categorías enteras.  
    2. **Productos Maestros:** Aplicar a 1 o *N* productos de forma general.  
    3. **Variantes:** Aplicar a 1 o *N* variantes específicas (ej. solo "Talle S \- Color Rojo").  
    4. **Cantidad Mínima:** Definir un umbral de unidades para que aplique (ej. "Llevando 30 unidades").  
  * **Restricción de Hardware en la Configuración:** Al momento de buscar y seleccionar los Productos Maestros o Variantes que conformarán la regla, el Administrador debe utilizar una barra de búsqueda estrictamente textual (coincidencias por nombre, SKU o descripción mediante *debounce* y `mode: 'insensitive'`). No se admite el uso de lectores de códigos de barras.  
  * **Lógica Condicional Compleja:** El sistema debe permitir la combinación de estos parámetros en una sola regla. Ejemplo exigido por el negocio: *Un descuento que exige llevar 3 productos, pertenecientes a la Categoría X, que coincidan con el Producto Maestro J y específicamente en la Variante JIU*.

**HU-5.3: Edición y Desactivación (Baja Lógica) de Reglas**

* **Rol:** Administrador (`admin`)  
* **Función:** Modificar los parámetros de una promoción existente o pausar su ejecución en el punto de venta sin eliminarla del historial.  
* **Criterios de Aceptación:**  
  * El panel principal de `/descuentos` debe listar todas las reglas creadas, indicando su estado actual (Activo/Inactivo).  
  * Al editar, el sistema debe permitir alterar las entidades vinculadas (agregar o quitar productos/categorías afectados) y guardar los cambios transaccionalmente en PostgreSQL.  
  * El sistema debe contar con un *switch* (botón de alternancia) para desactivar el descuento. Esto actualizará el campo booleano `is_active` a `false`.  
  * Un descuento con estado inactivo será inmediatamente ignorado por el motor del carrito de compras (Módulo 3\) al momento de calcular los subtotales para pagos en Efectivo, Transferencia MP o Posnet MP.  
  * Los cambios de estado o modificaciones deben invocar `revalidatePath('/descuentos')` para mantener la interfaz de gestión permanentemente actualizada.

### **6️⃣Módulo 6: Dashboard, Métricas y Reportes**

#### **1\. Especificaciones Generales del Módulo**

* **Objetivo:** Proveer a la administración un panel de control centralizado en la ruta `/dashboard` para visualizar métricas de rendimiento financiero en tiempo real, auditar el flujo de caja, consultar el historial detallado de transacciones y gestionar la anulación de ventas con reversión atómica de inventario.  
* **Stack Tecnológico:** Next.js 16.3.1 (App Router), Prisma 7.9.1, PostgreSQL (Docker), NextAuth 4.24.15, Tailwind CSS v4, Zod y SWR.  
* **Roles del Sistema:** Administrador (`admin`). (Los usuarios con rol `cashier` no tienen acceso).

#### **2\. Historias de Usuario (HU) y Criterios de Aceptación**

**HU-6.1: Dashboard de Métricas Financieras y Flujo de Caja en Tiempo Real**

* **Rol:** Administrador (`admin`)  
* **Función:** Visualizar indicadores clave de rendimiento (KPIs) y gráficos del estado financiero del negocio correspondientes a la jornada actual o a un rango de fechas seleccionado.  
* **Criterios de Aceptación:**  
  * El acceso a la ruta `/dashboard` debe estar restringido exclusivamente al rol `admin` mediante el middleware centralizado de NextAuth.  
  * El sistema debe calcular y mostrar tarjetas (*cards*) dinámicas con las siguientes métricas extraídas de PostgreSQL: Total de Ventas, Total de Egresos/Compras y Ganancia Neta (Ventas \- Egresos/Compras).  
  * La interfaz debe incluir un desglose visual (gráfico o tabla) de los ingresos acumulados segmentados obligatoriamente por los tres métodos de pago registrados en el sistema:  
    1. **Efectivo** (`cash`)  
    2. **Transferencia Mercado Pago** (`mp_transfer`)  
    3. **Posnet Mercado Pago (Tarjetas/QR)** (`mp_posnet`)  
  * Los datos deben obtenerse mediante consultas de agregación (ej. `SUM`, `GROUP BY`) en Prisma y estar cacheados eficientemente mediante SWR con opción de refresco manual/automático.

**HU-6.2: Historial Detallado de Transacciones y Filtros Auditables**

* **Rol:** Administrador (`admin`)  
* **Función:** Consultar y auditar la totalidad de transacciones procesadas en el sistema (ventas, compras a proveedores y egresos de caja).  
* **Criterios de Aceptación:**  
  * La tabla de historial debe contar con paginación desde el servidor realizada a través de Prisma para garantizar el rendimiento de PostgreSQL.  
  * Se deben incluir filtros combinables para parametrizar la búsqueda por rango de fechas, estado de jornada de caja y método de pago (**Efectivo**, **Transferencia MP** o **Posnet MP**).  
  * **Restricción de Hardware y Búsqueda:** La interfaz debe incorporar una barra de búsqueda para filtrar registros mediante coincidencias de texto continuo (coincidencia en nombre del producto, SKU, categoría, descripción o el usuario que registró la operación). Se descarta totalmente la integración con escáneres físicos de códigos de barras.  
  * Cada fila debe listar la fecha/hora, tipo de operación, usuario responsable, método de pago asignado y el monto total consolidado.

**HU-6.3: Detalle Interno de Transacción y Reimpresión de Tickets**

* **Rol:** Administrador (`admin`)  
* **Función:** Acceder al desglose completo de una venta o compra pasada y emitir un duplicado del comprobante impreso.  
* **Criterios de Aceptación:**  
  * Al seleccionar una transacción del historial, la interfaz debe desplegar un modal detallado que liste los productos y variantes asociados, cantidades, costo/precio unitario, los descuentos aplicados del Módulo 5 y el subtotal por línea.  
  * Debe disponer de un botón de "Reimprimir Ticket" que renderice el comprobante optimizado para ticketeadoras térmicas de 80mm.  
  * El ticket reimpreso debe incorporar la marca de agua o etiqueta explícita de "Copia" y reflejar la vía de pago original utilizada (**Efectivo**, **Transferencia MP** o **Posnet MP**).

**HU-6.4: Anulación de Venta y Reversión Atómica de Stock**

* **Rol:** Administrador (`admin`)  
* **Función:** Cancelar una venta registrada por error, invalidando la transacción y devolviendo las existencias físicas al inventario activo.  
* **Criterios de Aceptación:**  
  * La opción de anulación estará visible únicamente para usuarios autenticados con el rol `admin` y requerirá una confirmación mediante un modal de seguridad.  
  * La acción de anulación debe ejecutarse dentro de una transacción atómica (`$transaction` de Prisma) que realice en un solo paso:  
    1. Modificar el flag booleano `is_active` a `false` en el registro de la tabla `sales` (soft-delete).  
    2. Revertir e **incrementar** las cantidades (`quantity`) devueltas directamente al `stock` de las `product_variants` correspondientes en PostgreSQL.  
    3. Restar el valor total de la venta del balance calculado de la caja activa si la operación se realizó en efectivo y la jornada permanece abierta.  
  * Las ventas anuladas permanecerán en los registros de auditoría del historial pero identificadas con una marca visual diferenciada (ej. texto tachado o indicador rojo mediante Tailwind CSS v4).

