# Cambios de ElectroShopVe

Cada versión que se sube a producción tiene su número, su etiqueta de git (`v1.0.0-rc.1`) y su entrada aquí. El detalle de cada tarea está en `docs/plan/estado/C-XX.md` y lo subido, con su SQL y sus pruebas, en `docs/plan/HISTORIAL.md`.

## Cómo se numera (MAYOR.MENOR.PARCHE)
- **MAYOR** (2.0.0): algo que ya funcionaba deja de funcionar igual para los clientes o para quien se conecta a la tienda: cambian direcciones públicas (`/productos/...`), el feed de productos o la API pública, una regla de negocio de `docs/plan/PLAN.md` §7, o un cambio de base borra o renombra datos.
- **MENOR** (1.1.0): algo nuevo que no rompe nada. Las tablas y columnas nuevas entran aquí.
- **PARCHE** (1.0.1): arreglos, textos y ajustes internos, sin funciones nuevas.
- **`-rc.N`** (candidata): la tienda ya vende pero falta cerrar la revisión final (`docs/plan/REVISION_FINAL.md`, en especial el dinero). `1.0.0` es la primera versión sin ese pendiente.
- Un bloque de deploy = una versión. `package.json`, esta lista y la etiqueta se actualizan en el mismo commit que arma el bloque. En el servidor, `git describe --tags` dice cuál está corriendo.
- **Por módulo (desde C-168):** cada módulo del panel lleva su propia versión en `lib/modulos.ts`, con la misma regla. Cada tarea que toca archivos de un módulo le sube la versión (`npm run check:modulos` falla si no), y esta lista agrupa los cambios por módulo (`### Productos 1.1.0 (C-169)`). La página Administración → Versiones los muestra.

## [1.0.0-rc.8] - 2026-10-03
### Dos administradores sin pisarse, en el resto del panel (C-170)
- **Promotores 1.1.0, Productos 1.2.0 (categorías), Ofertas y cupones 1.1.0, Cotizaciones 1.1.0, Marketing 1.1.0 (campañas):** si otra persona guardó antes que tú, ya no se pisa su trabajo: se combinan los cambios y solo se pregunta por lo que las dos tocaron. Se ve quién más tiene abierto lo mismo, y antes de borrar algo que otra persona está editando, se pregunta.
- **ElectroStudio 1.1.0:** el guardado automático junta los cambios si dos personas editan la misma historia, y avisa.
- **Cursos 1.0.1 y Clientes 1.0.1:** aprobar a un creador, verificar una empresa o atender una solicitud de producto dos veces a la vez ya no le manda dos avisos al cliente; la segunda persona lee "ya la atendió…".
- **Marco del panel 1.3.0, Reportes 1.1.1:** las piezas comunes y la bitácora de "quién cambió qué" para cualquier registro.
- Sin cambio de base.

## [1.0.0-rc.7] - 2026-10-03
### Dashboard 1.1.0 (C-171)
- **Dashboard a tu gusto**, como el panel rápido de un teléfono: **Editar** → cada tarjeta se quita con el botón rojo "−" (las necesarias llevan candado: Por atender, Ventas cobradas y Accesos rápidos), se arrastra para ordenar, se le cambia el tamaño, y abajo está lo que se puede agregar con "+". **Listo** guarda.
- **Cada administrador tiene el suyo** (se guarda en la base: se ve igual en la computadora y en el teléfono) y solo puede poner lo que su rol permite.
- **Accesos rápidos a elección:** qué botones y en qué orden (16 disponibles).
- **Diez tarjetas nuevas:** Visitantes ahora (en vivo), Embudo de hoy, Meta del mes (solo el dueño; la meta se escribe en la tarjeta), Tasa del día, Más vendidos de la semana, Actividad del equipo, Promotores, Cotizaciones abiertas, Reseñas recientes y Respaldo.
- Más vivo: las tarjetas entran escalonadas, las cifras cuentan hasta su valor y el Dashboard se pone al día solo con cada orden o pago. Con "reducir movimiento" no se anima nada.
- Una tabla nueva (`admin_dashboard_layouts`). Librería nueva solo para el panel: `@dnd-kit` (arrastrar).

## [1.0.0-rc.6] - 2026-10-02
### Reportes y seguridad 1.1.0 (C-173)
- **Reportes en vivo.** Arriba de todo, un panel que se actualiza solo: cuántas personas están **conectadas a la tienda ahora**, cuántas **con cuenta** y cuántas **sin cuenta**, cuántas llevan productos en el carrito, qué están mirando, de dónde llegaron (Instagram, Google, directo…) y desde qué equipo, con la lista de quién es cada una ("Carlos P.", "Visitante A3F").
- **Lo cobrado hoy y este mes** se pone al día solo con cada orden nueva o pago confirmado; las cifras del reporte se actualizan cada minuto y con cada orden, sin parpadeos.
- Antes "en vivo" contaba eventos de los últimos 5 minutos: quien leía una ficha sin hacer clic desaparecía. Ahora cada pestaña de la tienda avisa que sigue ahí (cada 30 s, a la vista); solo vive en la memoria del servidor (no guarda IP ni correo de nadie) y caduca a los 90 s.

## [1.0.0-rc.5] - 2026-10-02
### Marco del panel 1.2.0 (C-174)
- **Marquesina del equipo:** una franja debajo de la barra de arriba, en todas las pantallas del panel, dice quién del equipo está conectado y en qué sector: "Luis está en Productos, editando «Teclado Redragon K552»". Corre sola si el texto no cabe, se detiene al pasar el ratón o tocarla, y con "reducir movimiento" no se mueve. Solo aparece si hay alguien más; la ven solo administradores con los dos pasos. Una pestaña en segundo plano sale de la franja al minuto.
### Productos 1.1.1 (C-174)
- El editor avisa qué producto tiene abierto, para la marquesina.

## [1.0.0-rc.4] - 2026-10-02
### Marco del panel 1.0.0 (C-168)
- **Versión por módulo:** Productos, ElectroStudio, Cursos, Configuración y los demás (16) llevan su versión; se ve en la barra de arriba de cada pantalla y en la página nueva **Administración → Versiones**, con qué cambió en cada uno. El pie del menú dice la versión del sistema y el commit.
- **Aviso de versión nueva:** si se sube una versión mientras alguien tiene el panel abierto, le sale "El panel se actualizó" con el botón para recargar (no recarga sola).
- **Qué hay de nuevo:** cada administrador ve una vez, después de un deploy, qué módulos cambiaron.
- Una columna nueva (`users.panelVersionVista`).
### Productos 1.1.0 (C-169)
- **Eliminar manda a la papelera** (30 días, con "Deshacer" y una pestaña Papelera en Productos): ya no se pierde nada por un clic. Solo el dueño puede borrar para siempre antes; a los 30 días se borra solo (un cron nuevo). Antes, "Eliminar" borraba de verdad.
- **Dos administradores sobre el mismo producto:** se ve quién más lo está editando y, en la lista, "Luis lo edita". Si el otro guarda o lo mueve a la papelera mientras lo editas, te avisa al instante y **no pierdes lo que escribiste**: lo que cambió cada uno se combina solo, y solo se pregunta por lo que los dos tocaron.
- Lo que editas se guarda como borrador en el navegador (si se recarga o se cierra la pestaña, se ofrece recuperarlo).
- Cada edición queda en la bitácora con los campos cambiados, y el editor muestra el historial y "último cambio: Luis, hace 5 min".
### Marco del panel 1.1.0 (C-169)
- Trabajo en equipo en el panel: presencia ("Luis también está editando esto"), avisos en vivo de cambios ajenos, borradores y combinación de cambios. Lo usan Productos y, en las próximas versiones, el resto de las pantallas.
- Cuatro columnas nuevas (`products.deletedAt`, `deletedById`, `statusAntesDePapelera` y un índice).
### Arreglos
- `next dev` no arrancaba por la regla de cabeceras vacía de C-166 (solo en desarrollo; producción no se afectaba).

## [1.0.0-rc.3] - 2026-10-02
### Promotores (C-167)
- Cada promotor tiene un **código** que el cliente escribe en el carrito: descuento para el cliente y la compra cuenta para el promotor, aunque el cliente ya tuviera cuenta.
- La comisión es sobre los **productos, sin IVA ni envío**, en **Puntos ES** (nunca en dinero), y se **acredita sola 7 días después de la entrega**. Las que parecen autocompra, pasan de $50 o superan la ganancia de la venta esperan la revisión del equipo.
- **Solicitud para ser promotor** desde la cuenta del cliente, con aprobación de un clic.
- La página del promotor y "Compartir y ganar" dejan de prometer dinero, comisión por recargas, por registros o por cursos, y beneficios por nivel.
- Una tabla nueva (`influencer_applications`) y seis columnas. Un cron nuevo (promotores).

## [1.0.0-rc.2] - 2026-10-02
### Seguridad
- **Content-Security-Policy en modo "solo avisar"** (C-166): la tienda declara de qué dominios puede cargar scripts, conexiones y marcos, y el navegador avisa de lo demás sin bloquear nada. Los avisos se agrupan en Reportes → Seguridad. Pasar a bloquear queda para cuando el panel lleve días limpio.
- Una tabla nueva (`csp_violations`).

## [1.0.0-rc.1] - 2026-10-02
Primera versión numerada. Resume todo lo hecho desde el 03/12/2025 (más de 130 tareas).

### Tienda
- Inicio vitrina, catálogo con filtros y buscador por relevancia (sin acentos, por SKU y código de barras), ficha con confianza junto al botón de compra, ofertas, cupones, cinta ES, productos usados y reacondicionados, reseñas solo de quien compró, favoritos con aviso de rebajas, catálogo legible para Google, Meta y las IA (`sitemap`, `llms.txt`, `feed/productos.xml`).
- Carrito y checkout con todos los métodos de pago: Puntos ES, Pago Móvil que verifica solo, métodos manuales con reserva, pago mixto, gift cards y cupones. Precios, totales, envío, impuestos y dueño de la orden se calculan siempre en el servidor.
- Envíos con ZOOM y MRW (oficinas, cobro a destino, rastreo), retiro en tienda y embalaje según el paquete.
- Cotizaciones para empresas e instituciones con retención del IVA, envío por correo y "Mis cotizaciones".
- Páginas legales (términos y privacidad) editables desde el panel, con firma de documentos y PDF con huella.

### Panel del cliente
- Resumen, mis pedidos, Puntos ES con historial y recargas, direcciones, perfil con sesiones por dispositivo, documentos firmados, garantías y avisos por correo (incluido el que pide la reseña).

### Panel del administrador
- Dashboard de trabajo, pedidos y pedidos digitales, productos con asistente de búsqueda en la web, carga masiva, ofertas, marketing y campañas, reportes, notificaciones por panel, correo y Telegram.
- Roles (dueño y administrador), equipo por invitación, **verificación en dos pasos obligatoria**, bitácora de seguridad y límites de intentos.

### Seguridad y operación
- Datos públicos con listas blancas (nunca objetos crudos de la base), IP real, modo mantenimiento, captcha, cabeceras de seguridad (sin `X-Powered-By`), `deploy.sh` sin cortes y crons del servidor (favoritos, envíos, reseñas, respaldos).
- **Respaldos automáticos cifrados a Google Drive** (C-165): base cada día, fotos y constancias los domingos, comprobación de integridad, retención, aviso si fallan y restauración con clave privada fuera del servidor.

### Antes de llegar a 1.0.0
- Revisión final de dinero en el teléfono real (compra con Pago Móvil y con Puntos ES, recarga, cupón y cancelación).
- Subir y probar el respaldo en producción, con una restauración de prueba.
- Abogado (términos y privacidad) y contador (IVA de digitales y retención): ver `docs/plan/SIGUIENTE.md` §3.
