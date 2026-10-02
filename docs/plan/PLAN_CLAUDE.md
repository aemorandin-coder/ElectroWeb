# Registro de tareas de Claude

> Reglas: [`/CLAUDE.md`](../../CLAUDE.md). Plan, carriles, lista de pendientes y decisiones: [`PLAN.md`](./PLAN.md). Lo de ahora: [`SIGUIENTE.md`](./SIGUIENTE.md). Lo que hace Gemini: [`PLAN_GEMINI.md`](./PLAN_GEMINI.md).
> **Una fila por tarea, en orden de número.** El detalle de cada una (qué cambió, cómo se verificó y qué quedó) está en `estado/<ID>.md`.
> Al terminar una tarea se agrega su fila aquí y se actualizan `PLAN.md` §5 y `SIGUIENTE.md`.

## 1. Abiertas
La fila y lo que espera datos de Andrés están en **`PLAN.md` §5.2**: C-92, C-107, C-154b y C-153b (todas esperan datos o una decisión de Andrés).
- **C-92 · Clientes: desactivar en vez de borrar.** `AUDITORIA_CLIENTES_BORRADOS.md`. Decisión del 17/09: "Eliminar" borra de verdad solo si el cliente no tiene órdenes, Puntos ES, transacciones ni gift cards; si tiene algo, se desactiva. Espera la salida del diagnóstico de Andrés. Lleva una migración de `onDelete`.
- **C-107 · Seguro del envío a elección del cliente.** Decisión del 24/09: en el checkout, con ZOOM o MRW, "Asegurar mi envío (declarar el valor de la compra)". El seguro lo cobra la empresa junto con el flete, al retirar. La orden guarda la elección y el panel la muestra en "Copiar datos para la guía". Espera cuánto cobran ZOOM y MRW en Guanare. Una columna nueva en `orders`.

**Números que no son tareas de Claude:** C-76 (emojis de correos) pasó a Gemini G-53; C-79 (panel de creadores en móvil), a ChatGPT GPT-05; C-81 (estilos viejos de `components/ui`, Footer, botón de cuenta y carrito del header), a Gemini G-45 y G-46. Los demás huecos no se usaron.

## 2. Hechas (124)
Las marcas de dinero y de seguridad de las filas vienen de cuando se escribieron. "Rama `claude/C-XX`" dice de dónde salió cada una: todas están fusionadas en `main`.

| ID | Tarea | Qué quedó |
|---|---|---|
| C-01 | **C-01 · Órdenes calculadas en el servidor** | `estado/C-01.md` |
| C-02 | **C-02 · DTO público de producto** | `estado/C-02.md` |
| C-03 | **C-03 · Settings públicos** | `estado/C-03.md` |
| C-04 | **C-04 · Endurecimiento** | `estado/C-04.md` |
| C-05 | **C-05 · Carrito** | `estado/C-05.md` |
| C-06 | **C-06 · Rutas y SEO** | `estado/C-06.md` |
| C-07 | **C-07 · Limpieza del carril Claude** | `estado/C-07.md` |
| C-08 | **C-08 · Anti-abuso: captcha real y "Solicitar producto" solo con cuenta** | `estado/C-08.md` |
| C-10 | **C-10 · CSS global y tokens** | `estado/C-10.md` |
| C-11 | **C-11 · Fuentes** | `estado/C-11.md` |
| C-12 | **C-12 · Componentes base** | `estado/C-12.md` |
| C-13 | **C-13 · Queries del home** | `estado/C-13.md` |
| C-20 | **C-20 · Header nuevo** | `estado/C-20.md` |
| C-21 | **C-21 · Barra móvil y flotantes** | `estado/C-21.md` |
| C-22 | **C-22 · Home vitrina (tipo Best Buy)** | `estado/C-22.md` |
| C-23 | **C-23 · Popup promocional del home** | `estado/C-23.md` |
| C-23b | **C-23b · Popup promocional: tamaño de escritorio e imagen liviana** | `estado/C-23b.md` |
| C-24 | **C-24 · APIs que faltaban (direcciones del cliente y usuarios del admin)** | `estado/C-24.md` |
| C-25 | **C-25 · La imagen del popup ya no viaja en todas las páginas** | `estado/C-25.md` |
| C-26 | **C-26 · Vitrina "Destacados de la semana" con fondo azul suave** | `estado/C-26.md` |
| C-27 | **C-27 · Enlaces cortos para compartir productos** | `estado/C-27.md` |
| C-30 | **C-30 · Catálogo /productos** | `estado/C-30.md` |
| C-31 | **C-31 · Detalle de producto** | `estado/C-31.md` |
| C-32 | **C-32 · Encabezado único en la tienda y categorías con el catálogo** | `estado/C-32.md` |
| C-33 | **C-33 · Imágenes rápidas: optimización activada, caché y header fijo con modales abiertos** | `estado/C-33.md` |
| C-40 | **C-40 · Cierre** (26/09, rama `claude/C-40`) | README y `.env.example` nuevos. Guiones sin credenciales. Webhook de SADES validado y registrado. Las credenciales del historial se revisaron el 26/09: no había nada que cambiar. **Sigue pendiente la revisión en producción con Andrés** (`REVISION_FINAL.md`). |
| C-50a | **C-50a · Hotfix: la configuración completa era pública** | `estado/C-50a.md` |
| C-50b | **C-50b · Configuración rediseñada: solo lo que funciona, y lo que no funcionaba, reparado** | `estado/C-50b.md` |
| C-51 | **C-51 · Productos del admin** (25/09, rama `claude/C-51`) | Casillas y masivos, precios en USD y Bs, "Destacado" real, edición rápida con campos, "Duplicar" en el servidor (opción A). El botón de estado no guardaba nada. El asistente se rehízo en C-134. |
| C-52 | **C-52 · Marco del panel admin, recetas de estilo y auditoría completa del admin** | `estado/C-52.md` |
| C-53 | **C-53 · Revisión de R9 ya subido a main: sangría restaurada y arreglos móviles que faltaban** | `estado/C-53.md` |
| C-54 | **C-54 · Un solo estilo de encabezado y menú del header con su semántica original** | `estado/C-54.md` |
| C-55 | **C-55 · Marco del panel del cliente** | Hecho |
| C-60 | **C-60 · Productos digitales: variantes con unidad, proveedor y nuevo asistente del admin** | `estado/C-60.md` |
| C-60b | **C-60b · Surtido de pedidos digitales** (21/09, rama `claude/C-60b`) | Proveedor, referencia y costo en el pedido; aviso "Pedido digital por entregar"; un código por unidad con bloqueo; `isDelivered` corregido; correo del código escapado. |
| C-70 | **C-70 · Hotfix de seguridad: gift cards gratis, carga masiva, contacto, estadísticas y chat** | `estado/C-70.md` |
| C-71 | **C-71 · Gift cards: tarjeta 3D con física, PIN según el tipo, venta en caja y canje atómico** | `estado/C-71.md` |
| C-72 | **C-72 · Hotfix de seguridad y dinero encontrado al revisar notificaciones** | `estado/C-72.md` |
| C-73 | **C-73 · Notificaciones del equipo: bandeja, qué avisar y bot de Telegram (F5)** | `estado/C-73.md` |
| C-74 | **C-74 · Flujo de órdenes del admin** | Stock, dinero y estados: "Marcar pagado" descuenta stock, cancelar pide motivo y devuelve lo que corresponde, lista blanca en el PATCH y transiciones válidas (`estado/C-74.md`). |
| C-75 | **C-75 · Marketing y Contenido** | Campañas de correo con imágenes, promotores con comisión solo por compras pagadas y plantillas reales (2 tablas nuevas). Auditoría en `AUDITORIA_MARKETING.md`. |
| C-77 | **Revisar y mergear `gemini/R10` (G-35…G-37)** | Aprobada con arreglos (`estado/C-77.md`). |
| C-78 | **C-78 · Retoques de la tienda** | Hecho |
| C-80 | **C-80 · Login con límite de intentos en el servidor** (21/09, rama `claude/C-80`) | También: el login rechaza las cuentas suspendidas, `GET /api/user/profile` con lista blanca y `/api/debug/og-metadata` borrada. |
| C-82 | **C-82 · Hotfix aprobar cursos y creadores** | Hecho |
| C-83 | **C-83 · Hotfix login con mayúsculas en el correo** | Hecho (causa del "Credenciales invalidas" del cliente) |
| C-84 | **C-84 · Registro más fácil y perfil blindado** | Hecho. Análisis y plan de Google en `AUDITORIA_REGISTRO.md` |
| C-85 | **C-85 · Google, cédula fuera del registro y datos en la primera compra** | Hecho (el botón aparece cuando Andrés ponga las claves; decisiones del 16/09 aplicadas) |
| C-86 | **Revisar R10 (G-38, G-39) y R11 (G-40…G-43)** | Aprobadas con 6 arreglos (`estado/C-86.md`). |
| C-87 | **C-87 · Gift card solo con saldo** | Hecho (sin saldo se recarga en la misma página; `users/check` sin nombre y con tope) |
| C-88 | **C-88 · Contraseñas con una sola regla** | Hecho (recuperar la clave cierra sesiones) |
| C-89 | **C-89 · Onboarding con física** | Hecho (recorrido con resortes y confeti, misiones del panel con progreso real) |
| C-90 | **C-90 · Revisar `gemini/R12`** | Hecho (salió bien; 3 arreglos del carril Claude) |
| C-91 | **C-91 · Revisar `chatgpt/R1` (GPT-01, GPT-02), super merge y push** | Hecho el 17/09 (sin editar código). Incidente de clientes borrados auditado. |
| C-93 | **C-93 · Revisar Gemini R13-R15 y ChatGPT GPT-03/04, merge y push** | 17/09. 91 de 91 pruebas; ESLint de 403 a 197 errores. |
| C-94 | **C-94 · Revisar Gemini R16 y ChatGPT GPT-05/06, cerrar ChatGPT y plan final de Gemini** | 21/09. GPT-05 y GPT-06 aprobadas; ChatGPT sale del equipo y sus pantallas pasan a Claude. |
| C-95 | **C-95 · Home al día tras guardar productos y margen digital recordado** | 21/09. 24 pruebas HTTP y el flujo del asistente en el navegador. |
| C-96 | **C-96 · Montos exactos en la base** (21/09, rama `claude/C-96`) | `montoDecimal()` en saldo, órdenes, recargas, Pago Móvil, gift cards, cursos y comisiones. El redondeo de los montos viejos está autorizado (24/09) y lo corre Andrés en el servidor: `docs/plan/scripts/redondeo-c96.sql` (paso en `SIGUIENTE.md`). |
| C-97 | **C-97 · Masivos de productos** (21/09, rama `claude/C-97`): valores validados y los digitales no cambian de precio. "Duplicar" se hizo en C-51 (el servidor copia todo). | `estado/C-97.md` |
| C-98 | **C-98 · Revisar Gemini R17-R19** (21/09, rama `claude/C-98`) | Aprobadas las 7. ESLint 201 → 144 errores. Hallazgo: las acciones masivas de productos no tienen casillas para seleccionar (se perdieron en febrero) → pantalla de productos. |
| C-99 | **C-99 · Salida de ChatGPT, ronda R20 de Gemini y auditoría de envíos** (21/09, rama `claude/C-99`, solo documentos) | `AUDITORIA_ENVIOS.md`: 14 hallazgos (E1-E14) y la API de ZOOM probada. |
| C-100 | **C-100 · Envíos con ZOOM y MRW** 💰 (22/09, en `main`) | Oficinas reales, cobro a destino, historial de envío y rastreo de ZOOM. C-106 agregó el resumen transparente y los logos. Queda C-107 (seguro a elección; espera los costos). |
| C-101 | **C-101 · Métodos de pago: revisión del trabajo de Gemini** | `estado/C-101.md` |
| C-102 | **C-102 · Descuentos de verdad** 💰 (25/09, rama `claude/C-102`) | Ofertas automáticas con precio tachado y cupones con tope, fechas y límite por cliente. Gana el mayor. Sin digitales. Favoritos al estilo Amazon (se quitó "pedir descuento"). |
| C-103 | **C-103 · Firma de documentos** (25/09, rama `claude/C-103`) | Documentos con versión. Constancia en PDF guardada. Firma exigida al recargar. Trazo con física. Mis documentos. Guion para pasar las firmas viejas. |
| C-104 | **C-104 · Reportes reales** (25/09, rama `claude/C-104`) | Bitácora conectada (logins, precios, aprobaciones). Ingresos solo pagados. IPs sospechosas. Cada número dice de dónde sale. |
| C-105 | **C-105 · IP real del dispositivo** 🔒 (24/09, rama `claude/C-105`) | `lib/ip.ts` como única fuente (x-real-ip, o el último x-forwarded-for; solo IP públicas). Cerró: límites por IP compartidos por toda la tienda, mantenimiento que se saltaba con una cabecera y firma que guardaba la cadena entera. El nginx del servidor ya pasa la IP real (confirmado por Andrés el 01/10). |
| C-106 | **C-106 · Cobro de envío transparente y logos de ZOOM y MRW** (24/09, rama `claude/C-106`) | Resumen con "Embalaje" y "Flete: al retirar", "Total a pagar hoy", logos oficiales y una sola caja de confianza. En producción. El seguro se le pregunta al cliente: C-107. |
| C-108 | **C-108 · Revisar Gemini R20, R21 y R22** (24/09, rama `claude/C-108`) | R20 y G-68 aprobadas; **G-67 rechazada** (21 de 49 citas inventadas): C-102, C-103 y C-104 no se basan en ese informe. Decisiones del 24/09: redondeo C-96 autorizado (lo corre Andrés), "Duplicar" opción A dentro de C-51, sin cuenta corporativa de MRW por ahora. |
| C-109 | **C-109 · Destinatarios de campañas con límite** (24/09, rama `claude/C-109`) | Paginados de a 50, búsqueda en la base y también `MANAGE_USERS`. Al pasar: `next dev` roto por el CSS de los `.md`, analítica con cuerpo vacío y permiso `MANAGE_CUSTOMERS` inexistente. |
| C-110 | **C-110 · Resto del panel** (26/09, rama `claude/C-110`) | Pagos, Consultas, Solicitudes, Reseñas, Categorías y Trabajos. Reseñas verificadas en el servidor. Categorías sin ciclos. Pantallas duplicadas unificadas. Legal se hizo en C-103. |
| C-111 | **C-111 · Deuda técnica** (26/09, rama `claude/C-111`) | ESLint de 88 errores a 0. Tipos de sesión reales (sin `any`). Cajones accesibles con teclado. Hooks `useMontado`, `useDelNavegador`, `useCargarAlMontar` y `useCajonAccesible`. |
| C-112 | **C-112 · ElectroStudio, fase 1** (28/09, rama `claude/C-112`) | Reemplaza "Imágenes para redes": `/admin/studio`, motor del artefacto de Andrés conectado al catálogo (precio y oferta al día), historias en la base (2 tablas). |
| C-113 | **C-113 · ElectroStudio, fase 2** (28/09, rama `claude/C-113`, sobre C-112) | Formatos 4:5 y 1:1, 15 fondos (con foto propia), efectos, 9 plantillas (cupón, reseña, tasa BCV, gift card, llegó nuevo), aviso de historia vencida, qué historia vende (`?es=` + Resultados), deshacer y estilos (`estado/C-113.md`). |
| C-114 | **C-114 · Pago Móvil cobrado y orden rechazada** 💰 (28/09) | El checkout no deja pagar si la orden no se puede crear (mínimo, máximo, entregas, stock). Si igual pasa, el pago va al saldo del cliente. "Pagos sin orden" en Transacciones (`estado/C-114.md`). |
| C-115 | **C-115 · Mínimo de compra en el carrito** (28/09, en `main`) | `/carrito` avisa el mínimo y el máximo de compra (también sin sesión) y los productos que el servidor rechaza, antes del checkout. El mínimo cuenta solo los productos. Una sola regla, `orderAmountProblems` (`estado/C-115.md`). |
| C-116 | **C-116 · ElectroStudio más fácil de usar**, fases 1 y 2 (28/09, en `main`) | Tras la prueba en producción: editar y borrar cada historia desde la lista, validaciones antes de exportar, uso mucho más guiado, y una sola entrada en el menú (hoy está en la barra lateral y como pestaña de Marketing). Empieza con el inventario de acciones de `CHATGPT.md` §4. |
| C-117 | **C-117 · Sello "ES" automático** (29/09, en `main`; `estado/C-117.md`) | Al subir un PNG transparente, el servidor (`sharp`) arma la foto final: fondo blanco, producto centrado y el sello abajo a la derecha. Guarda también el original transparente (sirve a ElectroStudio). Las fotos que ya traen el sello no se tocan. |
| C-118 | **C-118 · Carga masiva de productos con plantilla `.json`** (29/09, rama `claude/C-118`; `estado/C-118.md`) | `/admin/products/importar`: plantilla con instrucciones para Claude, categorías, marcas y campos de usados; vista previa con precio y stock editables, fotos por nombre y errores por fila; todo en borrador. Reemplaza la carga CSV, que creaba categorías sin avisar y publicaba directo. |
| C-119 | **C-119 · Productos usados y reacondicionados** (29/09, en `main`; **lleva cambio de base**; `estado/C-119.md`) | Condición, grado, empaque, qué incluye, horas, batería, detalles, pruebas, garantía por producto y n.º de serie interno. Etiqueta "Usado" en tarjeta, ficha, carrito y pedidos; filtro en el catálogo; cupones no, ofertas sí; la orden guarda la copia. Términos 3.0 (garantía, sin devoluciones por cambio de opinión, usados y digitales). El formulario de garantía del cliente era falso: ahora llega a Mensajes y Solicitudes. |
| C-120 | **C-120 · Facturación a empresa, IVA y términos** (investigada y rediseñada el 30/09: `estado/C-120.md`) | **La web no emite facturas** (decisión de Andrés): prepara los datos y SADES o el talonario facturan. Se repartió en C-146 (precio con IVA a la vista), C-147 (datos para la factura y relación de ventas) y C-148 (cotizaciones), las tres hechas. Queda la revisión de los términos con el abogado (`PLAN.md` §7.1). |
| C-121 | **C-121 · Correo de compra con "Usado"** (29/09, rama `claude/C-121`, sobre C-118; `estado/C-121.md`) | Condición y garantía por producto. Al pasar: el correo decía "debitado de tu billetera" en todo pedido (también Pago Móvil por confirmar), no mostraba el descuento y no escapaba nombre ni dirección. |
| C-122 | **C-122 · Módulo de garantías** 💰 (29/09, rama `claude/C-122`, sobre C-121; tablas nuevas; `estado/C-122.md`) | `/admin/garantias`: estados, historial con el cliente, notas internas, fotos privadas sin EXIF; "Devuelto al saldo" acredita una vez, con tope. Al pasar: la pantalla del cliente pedía los pedidos entregados sin `mine=1` (el equipo veía los de todos). |
| C-123 | **C-123 · Pagos Móvil sin orden ya atendidos** 💰 (29/09, rama `claude/C-123` desde `main`; `ADD COLUMN`; `estado/C-123.md`) | Andrés vio en producción 2 pagos de diciembre de 2025, ya entregados, con solo "Pasar a su saldo" (le daría al cliente otra vez lo que recibió). Ahora: "Es esta orden" (candidatas del mismo cliente, marcando el mismo monto) o "Ya se atendió" (archivar con nota, en la bitácora). |
| C-124 | **C-124 · Moderación de reseñas: el 500 al aprobar** | `estado/C-124.md` |
| C-125 | **C-125 · Pago Móvil: el código 1010, monto congelado, pagos de más y de menos, y el formulario nuevo** | `estado/C-125.md` |
| C-126 | **C-126 · Detalle de la orden en el panel: pago en palabras, facturación y envío separados, guía de ZOOM** | `estado/C-126.md` |
| C-127 | **C-127 · Tiempo real: estados de órdenes, stock y pagos sin recargar** | `estado/C-127.md` |
| C-128 | **C-128 · Panel del cliente: inicio con resumen, pedidos en curso paso a paso y barra inferior** | `estado/C-128.md` |
| C-129 | **C-129 · Pago Móvil: lo que dice la ley, la comisión P2C y una verificación más segura** | `estado/C-129.md` |
| C-130 | **C-130 · Teléfono y cédula en el formato del BDV** | `estado/C-130.md` |
| C-131 | **C-131 · "Saldo" pasa a llamarse "Puntos ES" en toda la tienda** | `estado/C-131.md` |
| C-132 | **C-132 · Checkout: "¿Cómo deseas pagar?" con Binance Pay, PayPal, pago mixto y reservas que apartan de verdad** | `estado/C-132.md` |
| C-133 | **C-133 · Cinta ES también con fondo blanco, la cinta en la esquina y guardar productos sin esperas** | `estado/C-133.md` |
| C-134 | **C-134 · Asistente de productos: menos espacio, sin redundancia y validaciones de verdad** | `estado/C-134.md` |
| C-135 | **C-135 · Puntos ES: "$12,50 Puntos ES", la explicación en los términos y la versión nueva publicada** | `estado/C-135.md` |
| C-136 | **C-136 · Especificaciones: sugerencias según la categoría y ninguna obligatoria** | `estado/C-136.md` |
| C-137 | **C-137 · Panel del cliente: Mis pedidos, Favoritos y Direcciones con agencias ZOOM y MRW** | `estado/C-137.md` |
| C-138 | **C-138 · Mi perfil en pestañas y avisos de favoritos** (30/09, rama `claude/C-138`; `ADD COLUMN` y cron nuevo; `estado/C-138.md`) | Perfil y Configuración juntos (Datos personales, Seguridad, Notificaciones, Empresa), sin interruptores ni promesas falsas. Avisos de favoritos (baja de precio, oferta, vuelve a haber). "Eliminar cuenta" llega al equipo. |
| C-139 | **C-139 · Página de Puntos ES** (30/09, sin cambio de base; `estado/C-139.md`) | Historial completo con "Cargar más", recargas por confirmar y rechazadas claras con el motivo, enlace al pedido y "Cómo funcionan". Quien cierra su cuenta pierde sus Puntos ES: el modal lo dice con el monto y pide aceptarlo. La API de movimientos ya no devuelve `metadata`. Los términos firmados con esa regla se publicaron en C-142. |
| C-140 | **C-140 · Sesiones con nombre** 🔒 (30/09, tabla nueva; `estado/C-140.md`) | Cliente: varias sesiones, visibles y con "Cerrar", correo al entrar desde un dispositivo nuevo. Admin: una sola, 12 h, cierre tras 1 h sin uso. "No fui yo" desde el aviso de Telegram. |
| C-141 | **C-141 · Equipo, roles y verificación en dos pasos** 🔒 (30/09, tabla nueva; `estado/C-141.md`) | Dos pasos con app de códigos obligatorios para el panel, con códigos de respaldo y guion de emergencia. Roles Super admin y Administrador con permisos reales. Equipo con invitaciones por correo. La API de clientes ya no deja tocar cuentas del equipo ni devuelve el hash. Fuera `update-admin-role.js` y `promote-super-admin`. |
| C-142 | **C-142 · Términos de los Puntos ES con el cierre de cuenta** (30/09, sin cambio de base; `estado/C-142.md`) | Versión nueva de los términos que se firman: quien cierra su cuenta pierde sus Puntos ES. Se publica sola con el deploy; cada cliente la firma en su próxima recarga. Decisión de Andrés. |
| C-143 | **C-143 · El dueño quedó como Administrador tras C-141** 🔒 (30/09, sin cambio de base; `estado/C-143.md`) | La cuenta de Andrés en producción era ADMIN y perdió Configuración y Equipo. Arreglo con `create-master-admin.ts`. El panel avisa si la tienda no tiene super admin, el guion cierra la sesión al promover, y el menú de la cuenta en la tienda muestra el rol del equipo en vez de "SIN VERIFICAR". |
| C-144 | **C-144 · Términos sin métodos de pago inventados** (30/09, sin cambio de base; `estado/C-144.md`) | `/terminos` y los términos del pago prometían bancos, Zelle y "efectivo en tienda". Ahora remiten a los métodos que la tienda muestra al pagar. Quedan 3 afirmaciones por confirmar con Andrés. |
| C-145 | **C-145 · Medición del embudo de compra** (30/09, sin cambio de base; `estado/C-145.md`) | Los eventos de carrito, pago, compra y registro estaban escritos y nadie los llamaba. Ahora llegan a Google Analytics, al píxel de Meta y a la analítica propia. Faltan las dos variables en el servidor. |
| C-146 | **C-146 · "IVA incluido" con la base y el IVA** 💰 (30/09, sin cambio de base; `estado/C-146.md`) | Los precios ya llevan el IVA: el total no cambia y se dice cuánto es IVA en ficha, carrito, pago, correo, recibo y panel. Fuera "Impuestos (Exento)" y la promesa de "factura sellada y firmada" del correo. El precio sugerido desde el costo se hizo en C-146b. |
| C-146b | **C-146b · Precio sugerido desde el costo y margen real** 💰 (01/10, sin cambio de base; `estado/C-146b.md`) | En el asistente, del costo sale el precio sugerido (costo + 30 % + IVA) con "Usar este precio"; el margen es el real: sobre el costo y sin el IVA. Aviso del 30 % solo para el dueño. En digitales, el margen descuenta el IVA y la calculadora puede sumarlo. El Dashboard avisa de lo que se vende sin ganancia. Corregido: el margen contaba el IVA como ganancia y la calculadora digital subía un centavo. Verificado: 13/13 y navegador 29/29. |
| C-147 | **C-147 · Datos para la factura y relación de ventas del mes** 💰 (01/10, siete columnas nuevas; `estado/C-147.md`) | En el pago se elige a nombre de quién va la factura (la persona o su empresa verificada, con RIF y domicilio fiscal) y la orden guarda la copia. El panel da los datos listos para SADES o el talonario y anota el número de la factura; el cliente lo ve en su pedido. Reportes descarga la relación del mes para el contador. Cerrado: una empresa verificada podía cambiarse el nombre y el RIF. Verificado: HTTP 73/73 y navegador 59/59. |
| C-147b | **C-147b · Cómo se factura el embalaje** (01/10, sin cambio de base; `estado/C-147b.md`) | Investigación: el embalaje va en la misma factura, como renglón aparte y con IVA (Ley del IVA, art. 23); el flete con cobro a destino lo factura la empresa de envíos. La tienda ya calculaba el IVA con el embalaje dentro. Cambios: el renglón con su nombre exacto en "Copiar datos para facturar" y en el recibo, y una columna en la relación de ventas. |
| C-148 | **C-148 · Cotizaciones para empresas e instituciones** 💰 (30/09, dos tablas nuevas; `estado/C-148.md`) | El cliente la pide sin cuenta, el equipo la arma en el panel (catálogo o líneas libres, anticipo, condiciones) y el cliente la abre con un enlace, la imprime en una hoja con el logo largo y la aprueba. El total lo calcula el servidor. Siguió en C-148b; la retención del IVA y el envío por correo van en C-159. |
| C-148b | **C-148b · Cotizaciones: inventario, datos de pago, buscador, sello, aprobación e impresión** 💰 (01/10, tres columnas nuevas; `estado/C-148b.md`) | Al aprobarse descuenta el inventario (y lo devuelve si no se concreta); el documento trae los datos de pago; buscador del editor en vivo, sin acentos y con lo disponible; sello de la tienda con logo, RIF, teléfono y ciudad; la aprobación es digital y la hoja sin aprobar trae un QR; márgenes propios en carta, A4 y oficio. Verificado: HTTP 55/55 y navegador 35/35. |
| C-149 | **C-149 · Que Google, las redes y las IA encuentren el catálogo** (01/10, sin cambio de base; `estado/C-149.md`) | Sitemap corregido (las 14 categorías daban "no encontrado") y regenerado cada hora; fotos abiertas a los buscadores; `www` redirige al dominio principal; una dirección por categoría con texto propio; datos estructurados completos de producto, tienda y catálogo; `/llms.txt`; feed de productos para el catálogo de Meta; títulos propios en siete páginas. Venezuela no está en la lista de países de Google Merchant Center. Verificado: 55/55 y HTTP 119/119. |
| C-150 | **C-150 · Panel: menú por secciones y Dashboard de trabajo** (01/10, sin cambio de base; `estado/C-150.md`) | El menú pasa de 25 ítems en lista a Dashboard y seis secciones que se abren y se cierran (ninguna página cambió de dirección ni de permiso; Verificaciones entra al menú). Dashboard con acciones rápidas arriba, pendientes por orden de urgencia, órdenes recientes, ventas de hoy y del mes con una gráfica mínima, poco inventario y lo que falta configurar. Corregido: "ventas" contaba órdenes sin pagar y "clientes" contaba al equipo. Verificado en el navegador: 65/65. |
| C-151 | **C-151 · Los productos digitales no llevan IVA** 💰 (01/10, una columna nueva; `estado/C-151.md`) | Decisión de Andrés. Interruptor en Configuración → Precios, apagado por defecto: en los digitales la tienda no dice "IVA incluido", sus órdenes guardan IVA 0 y en una compra mixta el IVA se informa solo sobre los productos físicos. Base legal leída: Ley del IVA, art. 16 (bienes intangibles), no "entretenimiento". Verificado: 21/21 y navegador 13/13. Deja `scripts/e2e/lib.ts`, el motor de las pruebas. |
| C-152 | **C-152 · Bloque único de subida del 01/10** (01/10, solo documentos y pruebas; `estado/C-152.md`) | Revisión de todas las ramas (todo fusionado en `main`), producción ubicada en C-148b desde fuera, SQL exacto del bloque (8 columnas aditivas) y prueba de humo de las seis tareas juntas: 59/59. Subido el 01/10; pasos y pruebas en `HISTORIAL.md`. |
| C-153 | **C-153 · Embalaje según el paquete** 💰 (01/10, tres columnas nuevas; `estado/C-153.md`) | El embalaje ya no es un monto fijo que ignora el producto: la tienda arma el paquete con las medidas de cada producto y los empaques de Configuración (el más barato en el que quepa, todo lo consolidable junto, "bulto aparte" en su propia caja). Embalaje gratis desde un monto sin pagar el flete, con "te faltan $X" en el carrito y el pago. La orden guarda el plan y el panel dice cómo empacar, las piezas y el peso de la guía. Apagado por defecto. Verificado: 50/50, HTTP y navegador 51/51 y 15/15, y la prueba de humo 59/59. |
| C-154 | **C-154 · Confianza antes de pagar** (01/10, sin cambio de base; `estado/C-154.md`) | La ficha del producto dice, en una línea encima del botón de compra, la garantía, el envío y el embalaje. La garantía con sus días también en los productos nuevos (antes solo en usados) y cómo se resuelve, con las palabras de los términos. El embalaje de ese producto (C-153) y los montos de embalaje y envío gratis. No desapareció nada. Verificado: 26/26 a cuatro anchos y la prueba de humo 59/59. El plazo de los digitales espera los datos de Andrés (C-154b). |
| C-fix-cursos | **C-fix-cursos · Filtro por categoría de /cursos** | `estado/C-fix-cursos.md` |
| C-155 | **C-155 · Buscar el producto en la web desde el asistente** (01/10, sin cambio de base; variable opcional `GROQ_API_KEY`; `estado/C-155.md`) | En el primer paso del asistente: marca, código de barras, peso y medidas de la caja (leídos o estimados, marcados como tales), especificaciones y un borrador de la descripción, con casillas; nada se llena solo. La tienda busca y lee las páginas con una descarga que no deja llegar a la red interna; Groq ordena y redacta, y todo lo que devuelve se comprueba contra los datos. Sin clave sigue con sus reglas. **El asistente no tenía campo de Marca: ahora sí.** Verificado: piezas 118/118, HTTP 31/31, navegador 38/38 y humo 59/59. Falta probarlo desde el servidor. |
| C-156 | **C-156 · Orden de los documentos del plan** (01/10, solo documentos; `estado/C-156.md`) | `PLAN.md` vuelve a ser el plan maestro (carriles, tablero, lista única de pendientes y decisiones al día); `SIGUIENTE.md` queda solo con lo vigente; nuevos `OPERACION.md` e `HISTORIAL.md`; este registro ordenado por número; las siete auditorías con su cierre; 13 estados vencidos anotados; y el guion de un comando para el redondeo de C-96. |
| C-157 | **C-157 · Pedir la reseña por correo** (01/10, una columna nueva y un cron; `estado/C-157.md`) | Un cron diario manda un solo correo por cliente, 5 días después de la entrega (2 si es solo digital), con hasta tres productos que todavía no reseñó y un botón a cada ficha; solo a cuentas activas con correo verificado y que no dieron de baja ese correo (interruptor nuevo en Mi perfil → Notificaciones y enlace de baja firmado). Se quitó el correo que salía al instante de la entrega y solo del primer producto. Los enlaces `#reviews` apuntaban a un ancla que no existe: ahora `#resenas`. |
| C-158 | **C-158 · Buscador de la tienda sin acentos** (01/10, sin cambio de base; `estado/C-158.md`) | "audifonos" encuentra "Audífonos" (y "camara", "cámara"; la ñ como n): la búsqueda de `/productos` quita acentos y mayúsculas dentro de Postgres, entiende plurales y perdona errores de tecleo cuando no hay coincidencia exacta ("tecaldo" encuentra "Teclado", con un aviso arriba). Comparte las piezas con las cotizaciones (`lib/busqueda-sql.ts`) y la caja del panel de productos también. |
| C-159 | **C-159 · Cotizaciones, tercera parte** 💰 (01/10, tres columnas nuevas en `quotes`; `estado/C-159.md`) | Retención del IVA (la marca el equipo: 75 % o 100 %; el servidor calcula y el documento muestra el neto a pagar; el anticipo va sobre el neto), cotización por correo desde el panel (resumen y botón al enlace, con permisos, límite, bitácora y todo escapado) y "Mis cotizaciones" en el panel del cliente (las que pidió con su sesión y las enviadas a su correo verificado). **Corrección fiscal:** los órganos del Estado y los entes públicos sin fines empresariales no retienen (Providencia SNAT/2025/000054, art. 3). |
| C-160 | **C-160 · Los menores** (02/10, sin cambio de base; variable opcional `SMTP_ALLOW_SELF_SIGNED`; `estado/C-160.md`) | El precio con oferta ordena por lo que paga el cliente; el buscador ordena por relevancia, busca por SKU y código de barras y las búsquedas del panel y de cursos ignoran acentos; el formulario de reseña solo existe para quien puede reseñar; **`/terminos` y `/privacidad` son documentos editables** con el contacto tomado de Configuración (el escrito a mano no era el de Configuración); renombrar una categoría conserva su dirección; se borró `balance/deduct`; `global-error`, `<style jsx>`, `min-h-screen`; la contraseña SMTP se guarda cifrada y el certificado se verifica; ESLint en 0 errores. |
| C-164 | **C-164 · Los últimos menores de código** (02/10, sin cambio de base; `estado/C-164.md`) | Se borró `balance/add` (ninguna pantalla lo usaba y acreditaba hasta $10.000 en Puntos ES con el permiso de órdenes); `seed.ts` ya no trae contraseña por defecto ni corre en producción; las valoraciones salen con coma (`formatRating`, diez sitios); `RechargeModalV2` toma la tasa del contexto en vez de pedir `/api/settings/public`. |
| C-165 | **C-165 · Respaldos automáticos a Google Drive y primera versión** 🔒 (02/10, dos tablas nuevas; cron nuevo; `estado/C-165.md`) | Configuración → Respaldos (solo el dueño): la base se vuelca, se comprueba, se **cifra con una clave pública** (la privada se muestra una sola vez y no se guarda), se sube a Drive y se verifica por MD5; fotos y constancias los domingos; retención que nunca borra los 3 últimos; aviso si falla (panel, correo, Telegram) y recordatorio en el Dashboard; restaurar solo con un guion y la clave privada. Sin `X-Powered-By`. `CHANGELOG.md`, versión `1.0.0-rc.1` y su etiqueta. Probado con `pg_dump` y restauración real, un Drive simulado, el servidor y Firefox (no con Google real). |
| C-166 | **C-166 · Content-Security-Policy (solo avisa) y versión 1.0.0-rc.2** 🔒 (02/10, una tabla nueva; `estado/C-166.md`) | La tienda declara de qué dominios puede cargar scripts, conexiones y marcos; en modo "solo avisa" (no bloquea nada) y los avisos del navegador van a `/api/csp-report` (pública, con límites) y se agrupan en Reportes → Seguridad. Probada con 65 pantallas en Firefox con Analytics, Meta y hCaptcha cargando de verdad: cero avisos legítimos, y en modo bloqueo lo ajeno se bloquea. Zod en el navegador sin `new Function` (`@/lib/zod`). La política solo viaja con las páginas (no con `/api`). Pasar a bloquear (`CSP_ENFORCE`) queda para C-166b, después de una semana de visitas reales. |
| C-167 | **C-167 · Promotores: código con descuento, comisión justa, solicitud y acreditación sola** 💰 (02/10, una tabla y seis columnas nuevas; cron nuevo; `estado/C-167.md`) | Cada promotor tiene un código que el cliente escribe en el carrito (descuento para él; la compra cuenta para el promotor aunque el cliente ya tuviera cuenta; el código manda sobre el enlace y no sirve para sus propias compras). La comisión es sobre los productos sin IVA ni envío, en Puntos ES y nunca en dinero; se acredita sola 7 días después de la entrega, y quedan para revisión las que parecen autocompra, pasan de $50 o superan la ganancia de la venta. Solicitud desde la cuenta del cliente con aprobación de un clic. Página del promotor y "Compartir y ganar" sin promesas falsas. 80 comprobaciones con compras reales y la prueba de humo, 59 de 59. |
| C-161 | **C-161 · La foto de un producto usado, bien encuadrada** (01/10, sin cambio de base; `estado/C-161.md`) | Aviso de Andrés con una captura de producción. La foto recortada de un producto que no es nuevo quedaba pegada a los bordes: ahora el servidor la arma con fondo blanco y centrada, sin la cinta ES. Verificado: HTTP 17/17 con la foto real. Las fotos ya subidas hay que volver a subirlas. |
| C-162 | **C-162 · La tarjeta estrella del inicio sin franja blanca, y la cinta ES sin corte** (01/10, sin cambio de base; `estado/C-162.md`) | Aviso de Andrés con capturas de producción. La foto de la estrella medía 330 px en una tarjeta de 405: ahora la estrella ocupa 8 de 12 columnas y su foto llena el alto. La cinta que arma la tienda terminaba en un corte vertical: ahora baja en diagonal hasta el borde, como en las fotos hechas a mano. Verificado: humo 59/59 y capturas a 1280 y 1440. Las fotos ya armadas hay que volver a subirlas. |
| C-163 | **C-163 · Ordenar las categorías: guion para producción** (01/10, sin cambio de base; `estado/C-163.md`) | `scripts/reorganizar-categorias.ts`: crea Gift Cards y Recargas, Videojuegos y Audio, mueve los productos, corrige descripciones e íconos y sube a 6 las categorías del inicio (estaba en 3: por eso "no detectaba" las nuevas). Sin `--aplicar` solo muestra. Probado en la tienda de ejemplo. **Lo corre Andrés en el servidor.** |

## 3. Plan original (rondas R1 a R8, del 12/09): cerrado
> Así se planificó el 12/09 y así quedó hecho. Se conserva como referencia de por qué existe cada pieza. **Las reglas de trabajo vigentes están en `CLAUDE.md` y en `PLAN.md` §4** (hoy el merge y el push los hace Claude, no Andrés).

### 1. Qué detectó la auditoría en el carril de Claude

Es lo que requiere criterio: dinero, datos, arquitectura y las piezas que todo el sitio comparte.

| Área | Problema principal | Tarea |
|------|--------------------|-------|
| 💰 Órdenes | Precios y totales vienen del navegador; `body.userId` permite gastar saldo ajeno; número de orden con carrera y año fijo | **C-01** |
| 🔒 Datos | `costPerItem` y borradores expuestos por `GET /api/products`, APIs públicas y HTML | **C-02** |
| 🔒 Settings | `CompanySettings` completo en el HTML; 5 fetch por carga | **C-03** |
| 🔒 Varios | Clave de super admin con valor por defecto; cabeceras duplicadas; cookie `x-is-admin` sin uso | **C-04** |
| 🛒 Carrito | Cantidades se duplican al recargar; sin tope de stock; contadores distintos | **C-05** |
| 🧭 Rutas | Redirects faltantes, `/comparar` y `/mis-pedidos` huérfanas, robots bloquea `/_next/` | **C-06** |
| 🧹 Código muerto | Módulos en `lib/` y `components/ui/` sin uso; 31 `console.log` en APIs | **C-07** |
| 🎨 CSS global | Tokens sin usar, keyframes duplicados, `user-select:none`, `overflow-x:hidden` | **C-10** |
| 🔤 Fuentes | Inter no carga, Nakadai sin uso | **C-11** |
| 🧱 Base UI | No hay tarjeta de producto correcta, ni formateo único de precios, ni hook de scroll | **C-12** |
| 📦 Datos del home | Decimals crudos, ajustes del admin ignorados | **C-13** |
| 🧭 Header / nav | Detección de color por className, doble navegación en tablet, z-index caótico | **C-20 · C-21** |
| 🏠 Home | Hero de mensaje en lugar de productos | **C-22 · C-23** |
| 🛍️ Catálogo | Búsqueda que no reacciona a la URL, todo cargado al cliente, self-fetch en detalle | **C-30…C-33** |

### 2. Cómo se trabaja

- **Una tarea = una rama** `claude/C-XX` desde `main`, commits `[C-XX]` y `docs/plan/estado/C-XX.md` en el último commit.
- C-01 y C-05 son **hotfix**: Andrés los mergea y **despliega** apenas estén revisados, sin esperar al resto de la ronda.
- Antes de cada tarea: releer la fila de `AUDITORIA.md` y consultar `node_modules/next/dist/docs/` para cualquier API de Next.
- Al terminar una tarea que **desbloquea** a Gemini (marcadas 🔓), avisar a Andrés para que la mergee pronto.

### 3. Rondas (en paralelo con Gemini)

| Ronda | Claude | 🔓 Desbloquea a Gemini | Gemini al mismo tiempo |
|-------|--------|------------------------|------------------------|
| **R1** | C-01 → C-05 | G-04b, G-05g, G-06g (carrito y checkout) | G-02, G-03, G-07, G-08, G-04a, G-12 |
| **R2** | C-02 → C-03 → C-04 → C-06 → C-07 | — | G-05a…e, G-13 |
| **R3** | C-10 → C-11 | **G-06a…f (colores)** | G-09, G-05f, G-04b, G-05g |
| **R4** | C-12 → C-13 | **G-11 (scroll)** | G-06a…e |
| **R5** | C-20 → C-21 | **G-10 (z-index)** | G-06f, G-06g, G-11 |
| **R6** | C-22 → C-23 | — | G-10 |
| **R7** | C-30 → C-31 → C-32 → C-33 | — | G-14 (inventario) |
| **R8** | C-40: revisión final, README y tarjetas nuevas para Gemini a partir de G-14 | — | — |

#### Ajuste tras la revisión R1-R3 (2026-09-12)
Gemini avanzó más rápido de lo previsto: R1, R2 y R3 están aprobadas ([`revisiones/R1-R3.md`](./revisiones/R1-R3.md)). Lo único que le queda sin dependencias es R3b (G-15, G-16); después **se bloquea hasta que exista C-10**.
- **C-01/C-05** siguen en curso en la carpeta principal (rama `claude/C-01`, cambios sin commitear). No se tocan desde otra sesión.
- **C-10 y C-11 se adelantan** y se hacen **en paralelo** con C-01, en un worktree separado (`claude/C-10`, `claude/C-11`), porque no comparten archivos (`globals.css`, `layout.tsx`, fuentes) con órdenes y checkout.
- Orden efectivo: **C-01 + C-10 → C-05 + C-11 → C-02 → C-03 → C-04 → C-06 → C-07 → C-12 …**

**Regla de oro:** si una tarea de Claude necesita editar un archivo del carril Gemini, no se edita. Se deja `PEDIDO PARA GEMINI:` en el estado y Claude escribe la tarjeta en `PLAN_GEMINI.md`.

---

### 4. Detalle de tareas

#### R1 · C-01 — Órdenes calculadas en el servidor 💰 (hotfix)
**Archivos:** `app/api/orders/route.ts`, `lib/pricing.ts` (nuevo), `app/checkout/page.tsx`, `components/checkout/*`.
1. Crear `lib/pricing.ts` con **una sola** función de cálculo (`calculateOrder`), usada por el servidor (fuente de verdad) y por el checkout (solo para mostrar): subtotal, envío (`weightKg`, `isConsolidable`, `shippingCost`, `shippingCostPerKg`, `minConsolidatedShipping`, `packagingFeeUSD`, `freeDeliveryThresholdUSD`), impuesto (`taxEnabled`, `taxPercent`) y total. Extraer la lógica que hoy vive en `app/checkout/page.tsx` sin cambiar el resultado.
2. Nuevo contrato del POST: `items: [{ productId, quantity, digitalUsername? }]`, `deliveryMethod`, `shippingAddress`, `paymentMethod`, `mobilePaymentData?`, `notes?`. Todo lo demás que mande el cliente se ignora.
3. En el servidor: `quantity` entero ≥ 1; productos `PUBLISHED`; precios desde Prisma; `userId` **siempre** de la sesión; min/max de orden con el total calculado; saldo WALLET descontado con el total calculado dentro de la transacción; comisión de referido con el total del servidor.
4. Número de orden `ORD-{año actual}-{secuencia}` generado **dentro** de la transacción, con reintento ante violación de `@unique`.
5. Revisar si las gift cards pasan por este endpoint (sus ids son `gift-card-*`) y no romper ese flujo.
6. Verificar con el caso normal (Pago Móvil y WALLET) y los manipulados (`total: 0.01`, `userId` ajeno, `quantity: -3`, precio alterado). Anotar los resultados en el estado.

#### R1 · C-05 — Carrito 🛒 (hotfix)
**Archivos:** `contexts/CartContext.tsx`, `components/CartIcon.tsx`, `components/public/MobileNavBar.tsx`.
1. Merge con la base de datos **una vez por sesión de login**, no en cada montaje: si el carrito local viene de la misma cuenta, gana la base de datos; si el usuario era invitado, se suman cantidades con tope de stock. Marcar la sincronización por `userId` en `sessionStorage`.
2. `addItem` limita la cantidad al stock también para productos nuevos.
3. Exponer `totalItems` (unidades) y usarlo en `CartIcon` y `MobileNavBar`.
4. Prueba: logueado, agregar 1 unidad y recargar 5 veces → sigue en 1. Invitado con 2 unidades que inicia sesión → se suman una sola vez.

#### R2 · C-02 — DTO público de producto 🔒
**Archivos:** `lib/dto/product.ts` (nuevo), `app/api/products/route.ts`, `app/api/products/public/route.ts`, `app/api/products/slug/[slug]/route.ts`, `app/page.tsx`, `app/productos/page.tsx`, `app/categorias/**`.
- `toPublicProduct()` con lista blanca de campos: id, name, slug, shortCode, description, priceUSD, compareAtPriceUSD, stock, images, mainImage, productType, digitalPlatform, digitalRegion, category {id, name, slug}, brand {name, slug}, isFeatured, createdAt, specs, features y los campos SEO. Decimals convertidos a `number`.
- `GET /api/products` exige permiso de admin. Antes, buscar con grep qué pantallas públicas lo consumen y migrarlas a `/api/products/public`.
- Verificación: `grep -rn costPerItem app/api/products/public app/api/products/slug app/page.tsx app/productos app/categorias` → 0, y el HTML de `/productos` no contiene `costPerItem`.

#### R2 · C-03 — Settings públicos 🔒
**Archivos:** `lib/site-settings.ts`, `app/layout.tsx`, `app/providers.tsx`, `contexts/SettingsContext.tsx`, `components/public/PublicHeader.tsx`, `components/Footer.tsx`, `components/WhatsAppButton.tsx`, `components/HotAdOverlay.tsx`, `components/DynamicFavicon.tsx`, `app/api/settings/public/route.ts`, `app/page.tsx`, `app/productos/page.tsx`.
- `getPublicSettings()` con lista blanca (misma forma que la API pública). El layout la llama y la pasa como `initialSettings` a `SettingsProvider`, que ya no hace fetch al montar.
- Header, Footer, WhatsApp, HotAd y DynamicFavicon leen `useSettings()`. `<PublicHeader />` sin props sigue funcionando.
- La API pública reutiliza `getPublicSettings()`.
- Nota para Gemini: G-09 funciona antes y después de este cambio (usa `useSettings()`).

#### R2 · C-04 — Endurecimiento
- `promote-super-admin`: sin `SUPER_ADMIN_PROMOTION_KEY` → 503.
- Cabeceras de seguridad solo en `next.config.js`; quitarlas de `proxy.ts`.
- Cookie `x-is-admin`: se elimina, salvo que Andrés decida implementar el modo mantenimiento (D3).

#### R2 · C-06 — Rutas y SEO
- `next.config.js` redirects: `/mis-pedidos`→`/customer/orders`, `/mi-cuenta`→`/customer`, `/customer/wallet`→`/customer/balance`, `/auth/login`→`/login`, `/comparar`→`/productos` (si D1 = eliminar).
- Borrar `app/mis-pedidos/`, `app/comparar/` (según D1) y `app/(public)/layout.tsx`; quitarlos de `proxy.ts` y `robots.ts`.
- `app/api/product-requests/route.ts:63`: el link apunta a `/customer` (o crear la página si Andrés la quiere).
- `robots.ts`: quitar `/_next/` y `/uploads/` de `disallow`.
- `app/layout.tsx` y `app/productos/page.tsx`: quitar los fallbacks a `favicon.ico` y `og-image.png`, que no existen (usar logo o favicon de settings).

#### R2 · C-07 — Limpieza del carril Claude
- Verificar con grep y borrar: `lib/utils.ts`, `lib/validation.ts`, `lib/reviews.ts`, `lib/pago-movil/index.ts`, `components/ui/Card.tsx`, `components/ui/GlossyIcon.tsx`, `components/ui/ProductImage.tsx`, `components/ui/index.ts`. Comprobar los email templates `OrderStatusUpdate`, `PasswordReset` y `Welcome` antes de decidir.
- Quitar los `console.log` de `app/api/**` y `lib/**` (conservar `console.error`).
- Preguntar a Andrés si saca `public/uploads/` del índice de git (`git rm --cached`).

#### R3 · C-10 — CSS global y tokens 🎨 🔓 (desbloquea G-06)
**Archivos:** `app/globals.css`, `components/public/PageAnimations.tsx` (borrar), `app/page.tsx` (quitar su uso).
- `@theme`: todos los colores de `PLAN.md` §1.1 con los **nombres exactos** que usa la tabla de `GEMINI.md` §4 (`brand-50…950`, `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface`, `accent`, `deal`, `deal-bg`, `tag`, `success`, `success-strong`, `warning`, `warning-strong`, `danger`, `info`, `whatsapp`). `font-sans` y `font-brand`.
- `:root`: `--z-*` de §1.3 y `--bottom-nav-h`.
- Borrar keyframes y clases duplicadas, y las redefiniciones de `animate-spin`/`animate-pulse`.
- `user-select: none` solo en `button, nav, [role=button]`; `html, body { overflow-x: clip }`; quitar `a, button { transition: all }` y `body.hot-ad-active [class*="z-40"]`.
- Verificación: una página de prueba con `bg-brand-500 text-ink border-line` se ve bien; el texto de un producto se puede seleccionar; `grep -cw "@keyframes fadeIn" app/globals.css` → 1 (con `-w`, para no contar `fadeInUp`).
- Al terminar, confirmar que la tabla de `GEMINI.md` §4 coincide con los tokens reales.

#### R3 · C-11 — Fuentes
- Agregar `public/fonts/InterVariable.woff2` (licencia OFL) y cargarla con `next/font/local` como `--font-sans`. Tektrron como `--font-brand`. Eliminar Nakadai y el objeto falso `inter`.
- Header y Footer: `style={{fontFamily}}` → clase `font-brand`.

#### R4 · C-12 — Componentes base 🧱 🔓 (desbloquea G-11)
- `lib/currency.ts`: `formatUSD`, `formatVES` (formato de D4).
- `lib/hooks/useBodyScrollLock.ts`: `export function useBodyScrollLock(locked: boolean): void`, con un contador global para que varios modales abiertos no se pisen. **Ruta y firma exactas**: G-11 depende de ellas.
- `components/ui/`: `Container`, `SectionHeader`, `Price`, `ProductBadge`, `ProductCard` (v2, *stretched link*), `ProductShelf` (scroll-snap CSS; flechas solo en `lg`), `AddToCartButton`, `ShareButton`.
- `components/ui/README.md` con un ejemplo de uso de cada uno.
- Migrar `MobileNavBar`, `ProductosClient` y demás usos manuales de `body.style.overflow` del carril Claude al hook.

#### R4 · C-13 — Queries del home
`lib/queries/home.ts`: `getFeatured(max)`, `getDeals()`, `getBestSellers(days=90)`, `getNewArrivals()`, `getTopCategoriesWithProducts(n=3)`, `getCategoriesRail(max)`. Todas devuelven DTO y respetan `autoHideOutOfStock`. Envolverlas con `cache()` de React.

#### R5 · C-20 — Header nuevo
Según `PLAN.md` §2: buscador en el header (`/productos?search=`), franja `brand-600` con mega menú de categorías, tasa BCV, sin detección de secciones ni animaciones infinitas, navegable con teclado. `<PublicHeader />` sin props sigue funcionando.

#### R5 · C-21 — Barra móvil y flotantes 🔓 (desbloquea G-10)
- `MobileNavBar`: `z-[var(--z-bottomnav)]`, drawer con Esc, foco y `aria-*`, `totalItems`.
- Padding inferior global `< lg` con `--bottom-nav-h` y `safe-area-inset-bottom`.
- `WhatsAppButton`: por encima de la barra y sin badge "1" falso. Eliminar `MobileScrollProgress`.
- Toaster en `z-[var(--z-toast)]`.

#### R6 · C-22 — Home vitrina
`app/page.tsx` según `PLAN.md` §3 con C-12 y C-13. Borrar `HomeSearchBar` y `ProductCarousel`. Respetar `maxFeaturedProducts`, `showCategories`, `maxCategoriesDisplay` y `heroVideo*`. QA: a 360px, el primer pantallazo muestra al menos 1 producto con precio y botón.

#### R6 · C-23 — Popup promocional
Según D2: cierre inmediato, máximo 1 vez cada 24 h, solo en el home, sin bloquear el touch, `z-[var(--z-popup)]`, cierre con Esc.

#### R7 · C-30…C-33 — Catálogo
- **C-30** `/productos`: búsqueda, filtros, orden y paginación en el servidor con `searchParams`; URL como fuente de verdad; drawer de filtros encima de la barra; "Destacados" ordena; sin tope de $10.000.
- **C-31** Detalle de producto: Prisma directo con `cache()` (sin self-fetch ni `NEXT_PUBLIC_APP_URL`), metadata una sola vez, barra sticky "Agregar" en móvil, `compareAtPriceUSD` visible, relacionados con ProductCard v2.
- **C-32** `/categorias` y `/categorias/[category]` con el nuevo sistema y Footer.
- **C-33** Imágenes: evaluar quitar `images.unoptimized`, migrar `<img>` del carril Claude y medir Lighthouse móvil antes y después.

#### R8 · C-40 — Cierre
Revisar las ramas `gemini/*` pendientes, convertir el reporte G-14 en tarjetas nuevas (precios con `toFixed` → `formatUSD`, `<style jsx>`, `<img>`), actualizar el README y correr el checklist de `PLAN.md` §6 con Andrés.

## 4. Especificaciones de la ronda R11-R12 (15/09 en adelante): hechas
> Lo que se pidió en cada una antes de empezarla. Regla de Andrés que sigue vigente: **en todo lo que se toque o se lea, buscar bugs, huecos de seguridad, código mal hecho y diseño inconsistente**; lo del carril Claude se arregla y el resto se anota en el estado.

#### C-74 · Flujo de órdenes del admin 💰
**Archivos:** `app/api/orders/route.ts` (PATCH), `app/admin/(dashboard)/orders/page.tsx`, `app/admin/(dashboard)/orders/[id]/digital/page.tsx`, `app/api/orders/[id]/digital/route.ts`, `lib/stock.ts`.
Hallazgos confirmados leyendo el código (C-73):
1. **"Marcar como pagado" no descuenta stock.** El botón manda `status: 'PAID'`, pero el descuento solo corre con `paymentStatus: 'PAID'`. La reserva de 5 minutos vence y el producto se puede vender dos veces. Tampoco se llena `paidAt` ni `paymentStatus`, así que la página de pedido digital (que exige `paymentStatus === 'PAID'`) nunca deja entregar el código.
2. **Cancelar desde el panel siempre falla:** el servidor exige una nota de 10 caracteres y el botón no la envía. Hace falta un modal con el motivo.
3. **Cancelar devuelve stock aunque nunca se descontó** (órdenes sin pagar), también a productos digitales, y borra **todas** las reservas del cliente (otras órdenes pendientes pierden la suya). Pasar de CANCELLED a otro estado y cancelar otra vez devuelve stock dos veces.
4. **`updateData = { ...body }`:** asignación masiva. Quien tenga `MANAGE_ORDERS` puede cambiar `totalUSD`, `userId`, etc. → lista blanca con zod.
5. **Transiciones de estado sin validar** (se puede ir de DELIVERED a PENDING). Definir la máquina de estados permitida.
6. **Cancelar una orden pagada con saldo no reintegra el saldo** (TODO en el código). **Decisión de Andrés:** ¿reintegro automático al saldo o manual?
7. Los correos de cancelación insertan `body.notes` sin escapar.
- **Verificación:** pruebas HTTP del caso normal y del manipulado (doble clic en pagar, cancelar dos veces, `totalUSD` en el body, transición inválida). Stock y saldo nunca negativos ni duplicados. Eventos `ORDER_PAID`/`ORDER_CANCELLED` siguen saliendo (C-73).

#### C-55 · Marco del panel del cliente 🔓 (desbloquea G-38, G-39)
**Archivos:** `app/customer/(dashboard)/layout.tsx` (393 líneas, copia del admin viejo).
- Mismo trabajo que C-52 en el admin:
  - Sin `transform`, `backdrop-blur-xl` ni manchas animadas.
  - Cajón móvil con capa, Escape y cierre al navegar. `useBodyScrollLock`.
  - `z-[var(--z-modal)] (o la capa que toque)`, `react-icons`, recetas de `lib/admin-ui`.
- **Campana:** usar `NotificationBell` de `components/notifications` (C-73).
- **Verificación:** modales de `/customer/profile` y "Recargar saldo" cubren 1440×900 y 390×844. Sin scroll doble. Cajón con teclado.
- Al terminar: `docs/plan/estado/C-55.md` en `main` (Gemini lo espera para G-38).

#### C-75 · Marketing y Contenido (sección crítica) 🔍
**Archivos:** `app/admin/(dashboard)/marketing/page.tsx` (1.118 líneas, 6 pestañas: Influencers, Publicidad, Email, Plantillas, Redes Sociales, Configuración), `components/admin/SocialMediaGenerator.tsx` (869), `app/api/influencers/**`, `app/api/admin/email/**`, `app/api/admin/social/generate`, `lib/influencer-commission.ts`.
- **Primero auditar como Configuración (C-50b):** qué hace cada campo en la tienda, qué está muerto, flujos rotos, seguridad y diseño. Presentar el mapa a Andrés antes de rediseñar.
- **Ya visto:**
  - `approveConversion` lee el estado fuera de la transacción y acredita sin condición: doble aprobación = doble comisión.
  - La pestaña "Configuración" de Marketing muestra datos del SMTP.
  - El popup puede guardar la imagen como base64 en la BD (C-25 lo sirve como archivo; mejor subirla siempre a `/uploads`).
  - El badge del menú cuenta solicitudes de creador aunque están en `/admin/creators`.
- **Rediseño:** secciones por tarea, un archivo por sección, recetas de `lib/admin-ui`, validación con zod en las APIs.

#### C-51 · Lista de productos del admin
- **Qué hacer:**
  - Rediseñar `app/admin/(dashboard)/products/page.tsx` con `lib/admin-ui`: tabla deslizable en móvil, filtros en la URL y acciones masivas con confirmación (sin `alert()` ni `confirm()`).
  - Borrar `_components/ProductForm.tsx` (sin uso; confirmar con `git grep`).
- **Pendiente de C-50b:** `primaryCurrency` ya no se edita; la lista debe mostrar USD y Bs.

#### C-60b · Surtido de pedidos digitales (F7)
- Campos de proveedor, referencia y costo que ya existen en la BD (C-60) en `orders/[id]/digital`.
- Evento nuevo `DIGITAL_ORDER_PENDING` en `lib/admin-events/catalog.ts`: una orden pagada con productos digitales de entrega manual espera código.
- Revisar que `orderItemId` del body pertenezca a la orden (hoy se usa `order.items[0]`).

#### C-76 · Correos
- Quitar los emojis de `lib/email-service.ts`, `lib/email-templates/*`, `app/api/admin/email/**`, `app/api/pago-movil/verificar` (asunto y cuerpo de la recarga aprobada) y `app/api/product-requests`.
- Una sola plantilla base con logo y colores de Configuración → Avisos. Valores escapados (hoy varias plantillas insertan nombres y referencias sin escapar).
