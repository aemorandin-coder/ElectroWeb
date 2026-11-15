# Cambios de ElectroShopVe

Cada versión que se sube a producción tiene su número, su etiqueta de git (`v1.0.0-rc.1`) y su entrada aquí. El detalle de cada tarea está en `docs/plan/estado/C-XX.md` y lo subido, con su SQL y sus pruebas, en `docs/plan/HISTORIAL.md`.

## Cómo se numera (MAYOR.MENOR.PARCHE)
- **MAYOR** (2.0.0): algo que ya funcionaba deja de funcionar igual para los clientes o para quien se conecta a la tienda: cambian direcciones públicas (`/productos/...`), el feed de productos o la API pública, una regla de negocio de `docs/plan/PLAN.md` §7, o un cambio de base borra o renombra datos.
- **MENOR** (1.1.0): algo nuevo que no rompe nada. Las tablas y columnas nuevas entran aquí.
- **PARCHE** (1.0.1): arreglos, textos y ajustes internos, sin funciones nuevas.
- **`-rc.N`** (candidata): la tienda ya vende pero falta cerrar la revisión final (`docs/plan/REVISION_FINAL.md`, en especial el dinero). `1.0.0` es la primera versión sin ese pendiente.
- Un bloque de deploy = una versión. `package.json`, esta lista y la etiqueta se actualizan en el mismo commit que arma el bloque. En el servidor, `git describe --tags` dice cuál está corriendo.
- **Por módulo (desde C-168):** cada módulo del panel lleva su propia versión en `lib/modulos.ts`, con la misma regla. Cada tarea que toca archivos de un módulo le sube la versión (`npm run check:modulos` falla si no), y esta lista agrupa los cambios por módulo (`### Productos 1.1.0 (C-169)`). La página Administración → Versiones los muestra.

## [1.0.0-rc.64] - 2026-11-15
Lo que eligió el equipo de C-245, la parte b: crear por pasos en su propia página, con lo que verá el cliente al lado y "Revisar y publicar" al final (la A). Esta entrega trae la oferta o el cupón y las gift cards impresas; los otros seis formularios siguen en C-249c, C-249d y C-249e. Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Las APIs que guardan no cambian.
### Marco del panel 1.13.0 (C-249b)
- **El marco de los asistentes** (`components/admin/Asistente`): la vuelta a la lista, los pasos con su ícono, un paso a la vez con su pie y, al lado, la vista previa. En el teléfono, "Ver cómo queda". Al cambiar algo, antes → después y a cuántos afecta.
### Ofertas y cupones 1.3.0 (C-249b)
- **Crear o cambiar una oferta o un cupón va por pasos** en `/admin/discount-requests/nuevo` y `/admin/discount-requests/<id>`: qué es, el descuento, el código (solo el cupón), las fechas y "Revisar y publicar".
- **La vista previa, con las piezas de la tienda:** la tarjeta del producto con el precio rebajado, o el "Aplicar cupón" de la ficha y el descuento al pagar.
- **Una nueva se puede guardar en pausa.** Al cambiar una, "Lo que cambia" (antes → después) y a cuántos productos y compras toca, contado por el servidor sin guardar (`POST /api/admin/promotions/vista-previa`).
- La edición entre dos personas sigue igual. Un cupón usado deja el código de solo lectura, y el de un promotor dice dónde se cambia.
### Clientes 1.6.0 (C-249b)
- **Generar gift cards impresas va por pasos** en `/admin/gift-cards/nuevo`: el monto, cuántas y "Revisar y generar", con la tarjeta impresa al lado. El pedido, las reglas, el lote con los PIN y la hoja para imprimir son los de siempre.

## [1.0.0-rc.63] - 2026-11-15
Lo que eligió el equipo de C-245, la parte a: los filtros en las píldoras de estado, en todos los tamaños (la A). Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. La parte b (crear por pasos) sigue en C-249b.
### Órdenes y pagos 1.6.4 (C-249)
- **Órdenes:** los 7 estados en píldoras con ícono, cuenta y lo que juntan, en la computadora y en el teléfono (antes, un selector y pestañas). Lo que te toca, en el azul claro.
- **Transacciones:** el estado en píldoras, con la cuenta de las pendientes. El tipo queda en su selector.
### Clientes 1.5.2 (C-249)
- **Mensajes y solicitudes:** el estado de los mensajes y el de las solicitudes de producto, en píldoras con su cuenta.
### Cursos 1.1.3, Trabajos realizados 1.0.7 y ElectroStudio 1.2.7 (C-249)
- Las categorías de los cursos y de los trabajos, los estados de Creadores y lo que hay que atender en ElectroStudio, en píldoras con ícono, cuenta y lo que juntan.

## [1.0.0-rc.62] - 2026-11-15
Dos botones de Contabilidad con la regla de C-245: lo que se suma a un botón compartido gana con `!`. Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Contabilidad 1.2.2 (C-248)
- **"Quitar el renglón"** (Nueva factura → una venta en la tienda → Qué se vendió): el tacho se ve entero en su cuadrado de 44 px. El relleno del botón compartido lo dejaba en 4 px.
### Órdenes y pagos 1.6.3 (C-248)
- **"Copiar datos para facturar"** (el detalle de la orden → Facturación) se pone en verde con "¡Copiado!", como estaba pensado: el borde y la letra del botón le ganaban al verde.

## [1.0.0-rc.61] - 2026-11-15
El panel entero con el kit de marca (el equipo, 15/11: "repase todo el admin panel para rediseñar con ese kit nuevo"). Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Dos cosas quedan para decidir, con maquetas (`docs/plan/estado/C-245.md`).
### Marco del panel 1.12.1 (C-245)
- **El aviso de una versión nueva** va como lo que hay que hacer, con su placa; borrar una notificación se ve siempre; la sesión por cerrarse, sin ámbar.
- **Seguridad y Notificaciones** empiezan junto al menú.
- **Los botones cuadrados** ya no aprietan el ícono y rechazar, borrar y cancelar van en rojo (lo que se suma a un botón compartido gana con `!`).
### Dashboard 1.1.6 (C-245)
- Lo que falta configurar de la tienda, con el ícono en el azul de la marca.
### Órdenes y pagos 1.6.2 (C-245)
- **El detalle de una orden tiene una sola acción principal:** cancelar y enviar códigos pasan a secundarios. En el teléfono, "Ver detalles" va al lado de la acción.
- **Transacciones:** el estado, lleno y con su ícono; el tipo, como dato en gris; "Salidas" en vez de "Retiros"; el selector de estado, del ancho de su dato.
- **Garantías:** "Por atender" en el sello de te toca (antes, en el rojo de lo cancelado), y los filtros en píldoras con ícono.
### Productos 1.16.1 (C-245)
- **Los filtros de la lista y de Reseñas** van en píldoras con ícono, cuenta y lo que juntan; lo que hay que revisar, en el azul claro.
- **Las acciones de las fotos y "Importar" de SADES se ven siempre** (antes, solo al pasar el ratón; "Importar" no se veía en el teléfono).
- Las variantes, las etiquetas y el margen son datos en gris. Categorías, con números en neutro y el estado lleno.
### Ofertas y cupones 1.2.1 (C-245)
- Oferta o cupón y su alcance se eligen con la tarjeta de opción; los filtros, en píldoras.
- El historial de solicitudes: estados llenos, números en neutro, el descuento en rojo y los botones del panel.
### Marketing 1.16.1 (C-245)
- Marketing ocupa el ancho del marco, junto al menú. En Campañas, "Desactivados" sin ámbar y "Verificado" lleno.
### Promotores 1.2.1, ElectroStudio 1.2.6 y Reportes y seguridad 1.1.9 (C-245)
- Sin ámbar en la comisión por acreditar, los accesos fallidos y las alertas por IP. El comentario de los sellos de ElectroStudio, al día.
### Cursos 1.1.2 y Trabajos realizados 1.0.6 (C-245)
- **Los formularios de un curso y de un trabajo ya no se cierran al tocar adentro** (se perdía lo escrito).
- La cabecera y los botones del panel; la categoría y la plataforma, como datos en gris; el estado, lleno.
- En Creadores, aprobar, rechazar y suspender con los botones del panel.
### Cotizaciones 1.5.3 (C-245)
- La lista y el detalle empiezan junto al menú; los filtros, en píldoras; el inventario que faltó, en negrita (sin ámbar).
### Clientes 1.5.1 (C-245)
- **Verificaciones**, con la cabecera, la tabla y la ventana del panel. La ventana ya no se cierra al tocar adentro, y "Aprobar" va en el verde fuerte (antes, letra blanca sobre el verde claro).
- En Clientes, el pendiente de verificar como te toca y las órdenes activas en azul. En Mensajes, los números en neutro.
### Configuración 1.3.2 (C-245)
- **Métodos de pago** con la cabecera del panel y los títulos de cada método en neutro (Binance y Zinli iban en ámbar).
- La tasa automática o manual, con la tarjeta de opción. Configuración y Equipo, junto al menú; los filtros de Legal, en píldoras.

## [1.0.0-rc.60] - 2026-11-15
El destino claro para la guía y los datos fiscales del proveedor (el equipo, 15/11: "tienes que insertar claramente dónde el cliente necesita el envío, eso va a la guía de ZOOM"; y el RIF de Ferrecla).
### Marketing 1.16.0 (C-246)
- **"¡Se vendió su producto!" y el recordatorio dicen claramente a dónde va el paquete.** Bajo el logo de la empresa, "Envíelo a" con:
  - la ciudad en grande y su código de ZOOM;
  - la oficina con su código y su dirección, o, puerta a puerta, la casa del cliente con su referencia;
  - a nombre de quién, con la cédula y el teléfono.
- **Los datos para la guía** van en el orden de su formulario: destinatario, cédula, teléfono, ciudad, oficina o dirección, contenido, piezas y peso.
- **La credencial de la bienvenida** lleva la razón social y el RIF del proveedor.
### Productos 1.16.0 (C-246)
- **Lista del proveedor → "Datos fiscales":** la razón social, el RIF (se escribe como sea y queda como J-12345678-9) y el domicilio fiscal, como en su RIF. Sirven también para sus facturas de compra (Contabilidad).
- **Hasta 3 correos de despacho,** separados por coma: a todos les llega cada venta, el recordatorio y la cancelación.
- **La página del proveedor** muestra el mismo "Envíelo a", y "Copiar los datos" los copia en el orden de la guía.
- **Cambio de base (aditivo):** las columnas `legalName`, `taxId` y `fiscalAddress` de `suppliers`.

## [1.0.0-rc.59] - 2026-11-15
La foto del premio del sorteo (C-247). El equipo, el 15/11, mirando /sorteo: "hazle una consola PS4 allí con el control", "usa imagen real", "esfuérzate con buen diseño, bien integrado, que no sea genérico". Eligió la A viendo la maqueta.
### Marketing 1.15.2 (C-247)
- **En /sorteo, la foto del premio va más grande** (28 rem en la computadora) y **sin fondo blanco**. Una foto hecha sobre el azul de la franja queda parada en ella, sin un cuadro alrededor; una foto de fondo blanco se sigue viendo como una tarjeta.
- **La foto en sí** se sube desde el panel (Marketing → Sorteo → Cambiar → Subir foto). Es la PS4 Slim de 1 TB con el control azul translúcido del premio, sobre el azul del sorteo, con su luz y su reflejo. No va en el repositorio.

## [1.0.0-rc.58] - 2026-11-15
La vista previa de los correos, fija mientras se recorre la lista (el equipo, 15/11: "el marco sale muy bajo, con su propio scroll, y debajo queda un espacio blanco enorme").
### Marketing 1.15.1 (C-244)
- **Correos de la tienda:** en la computadora, la vista previa queda fija debajo de la barra del panel, con el alto de la pantalla, mientras se recorre la lista de los 58 correos. El correo se lee con un solo scroll, el del marco.
  - En el teléfono, el marco toma casi la pantalla.
- **Las descripciones largas de la lista bajan de línea** (antes se cortaban contra el marco).

## [1.0.0-rc.57] - 2026-11-15
El kit de marca (C-243). El equipo, el 14/11, viendo el sorteo y los correos: "hay demasiada discrepancia de colores… ¿por qué no tenemos todos los chats un concepto claro de cómo crear?". Eligió la paleta A viendo las maquetas: solo los dos azules del logo.
### Marco del panel 1.12.0 (C-243)
- **El kit de marca, en Marketing → Kit de marca** (`/admin/marca`): el logo y sus dos azules, la paleta con para qué es cada color, las reglas, y las piezas de verdad (botones, sellos, placas, el aviso, la opción, la pieza fuerte y un correo de muestra).
- **La fuente única es `lib/marca.ts`.** `npm run check:marca` rechaza lo que quede fuera: el azul noche, el cian, los fondos más oscuros que el logo y los contenedores ámbar.
- **El sello de "te toca"** va en el azul oscuro del logo, con texto e ícono blancos. **La placa de un aviso,** en el azul de la marca con el ícono blanco.
### Tienda 1.15.0 (C-243)
- **Sin azul noche ni cian:** el sorteo, la barra de abajo del teléfono, las tarjetas y los sellos van en el azul oscuro del logo.
- **Las imágenes para compartir,** en el azul oscuro del logo con el lema en azul claro. Cambian de dirección, así que WhatsApp y Facebook las vuelven a pedir.
### Marketing 1.15.0 (C-243)
- **Los correos:** la gift card, el boleto y el certificado van en el azul oscuro del logo, con los rótulos en azul claro.
- **Los íconos de los avisos y de las ventajas,** en blanco sobre el azul de la marca (`?v=2`, para que Gmail no muestre los viejos).
### Y los demás módulos, con los mismos colores (C-243)
- Dashboard 1.1.5, Órdenes 1.6.1, Contabilidad 1.2.1, Productos 1.15.1, ElectroStudio 1.2.5 (la pantalla; las imágenes para redes no cambian), Cursos 1.1.1, Trabajos realizados 1.0.5, Cotizaciones 1.5.2 (también el PDF), Reportes 1.1.8, Configuración 1.3.1 y Carrito, checkout y cuenta 1.7.2.

## [1.0.0-rc.56] - 2026-11-14
Facturas, ordenada, y la tarjeta para elegir entre opciones. El equipo, 14/11, mirando Contabilidad → Facturas en producción: "los grids se ven perdidos, íconos amontonados". Eligió la A viendo las maquetas.
### Contabilidad 1.2.0 (C-242)
- **Tres datos del mismo alto,** como el inicio del panel:
  - la próxima factura, con su control y "Escribir la 0072";
  - el talonario, con cuántas quedan y su barra;
  - lo cobrado sin factura: "Al día", o cuántas faltan con "Te toca" y "Ver y facturar".
- **Lo raro, en gris bajo el talonario:** "Anular un papel dañado" (antes, "Se dañó un papel", un botón a todo lo ancho) y "Cargar otro talonario", solo el dueño.
- **Las dos notas de la ley,** detrás de su (i). Lo que falta facturar va en su lista, solo si hay.
- **El asistente de factura:** "De dónde sale" con el ícono al lado del título, "Contado / Crédito" centrados, la compra que se elige y el "(E)" de cada renglón, con la tarjeta nueva. También los títulos de la firma de la contadora.
### Marco del panel 1.11.0 (C-242)
- **La tarjeta para elegir una cosa entre varias** (`components/admin/Opcion`): el ícono en su placa, el título, una línea y el círculo de elegida, con su relleno adentro.
- **La causa:** `adminChoice` solo da el borde y el color, y una pantalla la usó sin lo demás. La regla quedó en `PLAN.md` §1.10, `CLAUDE.md`, `GEMINI.md` y `AGENTS.md`.

## [1.0.0-rc.55] - 2026-11-14
Los correos al aliado comercial: el proveedor que despacha él mismo recibe cada venta con todo para despacharla (el equipo, 14/11; eligió lo recomendado en las ocho preguntas y el nombre de la relación, "aliado comercial").
### Productos 1.15.0 (C-227)
- **El proveedor que despacha él mismo es aliado comercial de Electro Shop.** En Productos → Lista del proveedor:
  - "Su contacto de despacho": quién lo recibe, el correo y el WhatsApp;
  - "Ver la bienvenida", con la vista previa antes de enviarla.
- **Cada venta le llega por correo** al confirmarse el pago, nunca antes, con un enlace sin cuenta. Su página muestra:
  - la empresa (ZOOM o MRW) en grande, la oficina y el plazo;
  - los datos de la guía, con "Copiar los datos";
  - sus productos con su código y su costo, y el empaque.
  - Ahí marca "Lo estoy preparando" y anota la guía, con una revisión del número antes.
- **El día del plazo** (un día hábil después del pago), si no hay guía, le llega un recordatorio y al equipo un aviso, una sola vez (cron diario nuevo, `cron-despachos.sh`).
- **Nunca ve** el correo del cliente, lo que pagó ni el precio de venta.
- **Cambio de base (aditivo):** cuatro columnas en `suppliers` y cuatro en `orders`, con un índice.
### Órdenes y pagos 1.6.0 (C-227)
- **La guía del proveedor deja la orden Enviada,** con el rastreo. Al cliente le llegan el correo y la campana de "va en camino", como cuando la marca el panel.
- **Si la orden se cancela antes de la guía,** al proveedor le llega "Se canceló la orden: no la despache".
- **El detalle de la orden** dice cuándo se le avisó, desde cuándo lo prepara y si se le recordó; el historial marca lo que hizo el proveedor.
### Marketing 1.14.0 (C-227)
- **Los cuatro correos del aliado comercial,** de usted y con su propio cierre ("Lo suyo llega a toda Venezuela"):
  - la bienvenida, con su credencial;
  - "¡Se vendió su producto!";
  - el recordatorio de la guía;
  - "Se canceló: no la despache".
  - Están en Plantillas, en el grupo Proveedores.
### Marco del panel 1.10.0 y Tienda 1.14.2 (C-227)
- **Tres avisos nuevos para el equipo:** un proveedor sin correo de despacho, la guía que anotó un proveedor y el plazo vencido sin guía.
- **Arreglo de C-219:** el cron del sorteo rebotaba al login; ahora responde.
- La barra de abajo del teléfono no sale en la página del proveedor.

## [1.0.0-rc.54] - 2026-11-14
La contadora en el equipo (el dueño, 14/11: "con invitación a ella como parte del equipo de trabajo, dame la opción a mí también de kickear a la contadora y colocar una nueva, su firma"; eligió que revise, declare y firme, sin facturar).
### Contabilidad 1.1.0 (C-235)
- **La mesa de la contadora,** su inicio en el panel:
  - el saludo con su nombre, la empresa, el RIF y la fecha; lo facturado en el mes y cuántas quedan del talonario;
  - el mes en números: facturas emitidas, base imponible, IVA (débito fiscal) y exento;
  - las últimas facturas del mes y lo que viene en Contabilidad;
  - las notas del mes, entre ella y el dueño.
- **Su firma y su sello:** la dibuja una vez con el dedo, el lápiz o el mouse, con su nombre, su título y su C.P.C. Va en los cierres y en el Excel (C-230 y C-232). El dueño la ve en su mesa.
- **La contadora ve las facturas y lo cobrado sin factura, pero no factura ni anula.** Cargar un talonario queda solo para el dueño.
- **Cambio de base (aditivo):** el rol `ACCOUNTANT` y las tablas `firmas_contables` y `notas_contables`.
### Marco del panel 1.9.0 y Configuración 1.3.0 (C-235)
- **Un rol nuevo, Contadora.** Se invita desde Equipo, entra con su contraseña y los dos pasos, y ve solo Contabilidad, Mi seguridad y Versiones. Lo demás del panel la lleva a su mesa; las órdenes, los clientes y Configuración no le llegan.
- **Quitarla y poner otra:** Equipo → "Quitar el acceso", e invitar a la nueva. Su firma queda guardada.
### Carrito, checkout y cuenta del cliente 1.7.1, Reportes y seguridad 1.1.7 y Dashboard 1.1.4 (C-235)
- La contadora acepta su invitación y recupera su contraseña como el resto del equipo, y no entra con Google.
- La bitácora nombra su firma. El Dashboard y los reportes no la cuentan como clienta.

## [1.0.0-rc.53] - 2026-11-14
El checkout por pasos (el equipo, 14/11: "en el checkout necesitamos, como te comenté, las reglas: crear un breadcrumb"; eligió la A viendo las maquetas, y pagar al final).
### Carrito, checkout y cuenta del cliente 1.7.0 (C-241)
- **Un paso a la vez:** Entrega, Revisar y Pagar. Cada paso dice qué le falta para seguir ("Elige ZOOM o MRW para tu envío", "Acepta los términos para seguir").
- **Se paga al final,** cuando ya se revisó todo. Revisar muestra la entrega elegida, con "Cambiar".
- **Lo escrito no se pierde al ir y volver.** Con un Pago Móvil ya verificado no se vuelve atrás.
- **El resumen del pedido sigue a la derecha.** El dinero no cambia: el servidor calcula y valida como antes.
- **Sin letras ámbar y con los sellos llenos** (el equipo, 14/11, mirando las capturas: "esas letras ámbar no me gustan, es dispar" y "la píldora de verificado, los colores están invertidos"):
  - la frase de los términos va en negrita, del mismo color del texto;
  - lo que falta para pagar va en gris, como en los otros pasos;
  - "Verificado", "Conciliación BDV" y "Puntos ES suficientes" van en verde fuerte con letra blanca.
### Tienda 1.14.1 (C-241)
- **Los pasos de la compra** (Carrito, Entrega, Revisar y Pagar) con su ícono, la línea que se llena y el visto, como los del panel. Lo hecho se toca para volver.

## [1.0.0-rc.52] - 2026-11-14
Cuándo sale cada pedido, dicho antes de comprar (el equipo, 14/11: "un cliente que compra un sábado al mediodía, su producto sí o sí sale el lunes; ser lo más transparente"; eligió lo recomendado en las seis preguntas).
### Órdenes y pagos 1.5.0 (C-234)
- **Las reglas de los despachos, en un solo lugar** (`lib/horarios`), en hora de Venezuela:
  - lo pagado de lunes a viernes antes de las 2:00 p. m. sale ese día; lo de después, el siguiente día hábil;
  - el sábado y el domingo no se despacha: sale el lunes;
  - no se despacha en los feriados de Venezuela, con el 24 y el 31 de diciembre (Carnaval y Semana Santa se calculan cada año);
  - lo de un proveedor (la ferretería de La Victoria) sale un día hábil después.
- **Cambio de base (aditivo):** las columnas `horaCorte`, `diasCerrados` y `diasAbiertos` de `company_settings`.
### Configuración 1.2.0 (C-234)
- **Envíos y retiro → "Cuándo sale cada pedido":** la hora de corte, los feriados que vienen (con "Abre" para el que la tienda abra) y los días cerrados de más.
- **Abajo, el ejemplo con lo escrito:** "si alguien paga el sábado a las 12:00, lo de la tienda sale el lunes y lo de un proveedor, el martes".
### Tienda 1.14.0 y Carrito, checkout y cuenta del cliente 1.6.0 (C-234)
- **La ficha, junto al botón de comprar:** "Compra en las próximas 2 h 15 min y sale hoy" o "Compra hoy y sale el lunes 16"; lo de la ferretería, "desde Aragua".
  - Lo digital dice cuándo llega: "Te llega en minutos" o "Te llega al abrir: el lunes 16 a las 9:00".
- **El carrito,** una línea por paquete. **El checkout,** apenas se elige cómo recibirlo. **Mi pedido,** "Sale el lunes 16 de noviembre" mientras está pagado y sin salir.
- La cuenta se rehace sola cada minuto, sin animación.
### Marketing 1.13.0 (C-234)
- **El correo de la compra** dice en "Así te llega" el día que sale ("Sale el lunes 16 de noviembre") y, en lo digital, cuándo llega.

## [1.0.0-rc.51] - 2026-11-14
Lo que nos hace únicos hoy (el equipo, 14/11: no hablar como si fuéramos fuertes en el mercado, sino decir lo que nos distingue).
### Tienda 1.13.0 (C-224)
- **"Por qué comprar en Electro Shop"** en el inicio, en lugar de "Compra con confianza", con tres cosas que la tienda ya cumple:
  - **Sabes cuánto pagas antes de pagar:** dólares y bolívares a tasa BCV, IVA incluido y el envío calculado con ZOOM.
  - **Tu Pago Móvil lo confirma el banco:** sin capturas. Sale solo si la verificación con el BDV está activa; si no, la atención por WhatsApp.
  - **Una tienda de verdad, con taller propio:** 14 años en Portuguesa, ahora a toda Venezuela. Lleva a Servicios.
- **El pie** dice los 14 años, y la garantía de la ficha, que la atiende el servicio técnico de la tienda.
### Trabajos realizados 1.0.4 (C-224)
- **Servicios** dice "14 años en Portuguesa" (antes "más de 10 años"). Se cuentan solos desde 2012.

## [1.0.0-rc.50] - 2026-11-14
Contabilidad, primera parte: las facturas de talonario (el equipo, 14/11; el plan en `docs/plan/CONTABILIDAD.md`).
### Contabilidad 1.0.0 (C-229)
- **Una sección nueva del panel, Contabilidad → Facturas.**
  - El dueño carga el talonario una vez, con lo que trae impreso: la serie, los números, el control, el emisor, la imprenta y la próxima por usar.
- **"Nueva factura de talonario", en 4 pasos** (la maqueta B):
  - de dónde sale: una compra de la web o una venta en la tienda, con la fecha y la condición de pago;
  - a nombre de quién;
  - qué se vendió;
  - "Revisar y emitir", con la factura tal como se escribe: cada casilla numerada en la computadora y casilla por casilla en el teléfono.
- **"Ya la escribí: registrar la 0072":** queda registrada con su número y su control, y la orden queda facturada sola.
  - Los montos en bolívares (sin IVA, base, IVA, exentos con "(E)" y total) los calcula el servidor desde la orden.
  - Dos personas no pueden registrar el mismo número.
- **Lo cobrado en el mes sin factura**, por compra, con "Facturar".
- **Una factura mal escrita se anula con su motivo**, y la orden vuelve a quedar sin factura. Un papel dañado sin escribir también se anula. Nada se borra.
- **"Imprimir borrador":** sale solo la réplica, para copiarla a mano.
- **Cambio de base (aditivo):** las tablas `talonarios` y `documentos_fiscales` y la columna `orders.documentoFiscalId`.
### Marco del panel 1.8.0, Órdenes y pagos 1.4.0, Reportes y seguridad 1.1.6 y Tienda 1.12.1 (C-229)
- **El menú tiene la sección Contabilidad.** Permisos nuevos: facturar (administradores y dueño), y ver la contabilidad y declarar (el dueño; la contadora llega con C-235).
- **En el detalle de la orden:**
  - "Facturar en el talonario" lleva a la factura con esa orden ya elegida.
  - Con la factura hecha, "Ver la factura A-0072".
  - El número escrito a mano queda solo para una factura hecha fuera del sistema.
- **La bitácora nombra** las facturas registradas y anuladas, y el talonario cargado.

## [1.0.0-rc.49] - 2026-11-14
El aviso de cookies, antes de encender Google Analytics y el píxel de Meta (el equipo, 14/11).
### Tienda 1.12.0 (C-223)
- **El aviso de cookies:** chico y abajo (en el teléfono, encima de la barra), con "Solo las necesarias" y "Aceptar" del mismo tamaño, y "Elegir" para la medición y los anuncios por separado.
- **Hasta el sí del cliente,** Google Analytics va sin cookies (Consent Mode) y el píxel de Meta no se carga. Si después dice que no, el píxel deja de enviar.
- **"Cookies", al pie,** vuelve a abrir el aviso con lo que eligió.
- **Sale solo cuando la tienda tiene Google Analytics o el píxel configurados.** Hoy no los tiene: no cambia nada a la vista.
### Reportes y seguridad 1.1.5 y Configuración 1.1.10 (C-223)
- **La medición propia guarda la IP sin su último tramo.** Los límites de intentos y la bitácora siguen con la completa.
- **El texto inicial de la política de privacidad** nombra todas las cookies. El publicado se cambia en Legal → Documentos, con el abogado.

## [1.0.0-rc.48] - 2026-11-14
Los textos para buscadores dicen lo que la tienda es hoy (el equipo, 14/11: "ya estamos creciendo, eso debe cambiar desde ya").
### Tienda 1.11.1 (C-225)
- **Sin texto propio en Configuración → SEO,** el título, la descripción, las palabras clave, el título oculto del inicio y la presentación del catálogo se arman con lo que vende la tienda: "tecnología, ferretería y gift cards". Crecen solos con cada departamento nuevo. Antes decían "Gaming, Laptops & Tecnología" y "tecnología, gaming y gift cards".
- **La ficha para Google** es de una tienda (Store), no de electrónica. **llms.txt** dice "Tienda en Guanare, Portuguesa".
- **La imagen de la portada al compartir:** con el lema nuevo, el título dice lo que vende y el lema va debajo, sin repetirse.
### Configuración 1.1.9, Cotizaciones 1.5.1, Cuenta 1.5.1 y ElectroStudio 1.2.4 (C-225)
- **El lema de respaldo** es "Todo lo encuentras con nosotros.". Y tres textos más sin "tecnología": el presupuesto, el código del promotor y compartir un producto.

## [1.0.0-rc.47] - 2026-11-14
Los correos de la tienda, rediseñados (el equipo, 14/11: "muy pobres, no tienen nuestra esencia"; eligió la maqueta C, clara con la cinta, con ELECTRO SHOP grande arriba y Chispa abajo).
### Marketing 1.12.0 (C-219)
- **Todos los correos con el marco nuevo:**
  - arriba, el logo grande, la cinta ES y el lema;
  - el sello y el título del momento ("¡Es oficial, María! Tu pedido ya arrancó");
  - abajo, Chispa en su globo, con gorro mientras esté encendido el tema de Navidad;
  - el cierre "Compra tecnología sin miedo", con el WhatsApp, ZOOM y MRW, la razón social y el RIF.
- **En los de compra:** la barra de seguimiento, la foto de cada producto (en JPEG, para que Outlook la muestre), el total en $ y en Bs. con la tasa de la orden, y el IVA incluido.
- **19 correos que faltaban.** Antes solo había el aviso dentro de la web, o nada.
- **La vista previa** (Marketing → Correos → Plantillas) muestra los 54, por grupo. Antes, 15.
- **La versión de solo texto** se arma ordenada, con los enlaces a la vista.
- **El sorteo:** el boleto ganado, el recordatorio de los últimos días (un cron nuevo), el resultado a todos y el correo al ganador.
### Órdenes y pagos 1.3.0 (C-219)
- **Pagos y entregas:**
  - "¡Pago confirmado!" cuando el equipo confirma el pago;
  - "Listo para retirar", con la dirección y el horario;
  - el delivery en Guanare, con su propio texto.
- **La recarga de Puntos ES aprobada o rechazada a mano,** también por correo.
- **Al comprar sale un solo correo.** Antes salían dos cuando el pago quedaba en revisión.
### Clientes 1.5.0 (C-219)
- **"Enviar con el diseño de la tienda"** en la respuesta a un mensaje de contacto: sale desde la tienda y el mensaje queda respondido.
- **Correos nuevos:** la garantía recibida, el mensaje recibido, la solicitud de producto recibida y "¡Ya llegó lo que pediste!".
### Carrito, checkout y cuenta del cliente 1.5.0 (C-219)
- **La bienvenida sale al activar la cuenta o al entrar con Google.** Existía y nadie la enviaba.
- **Correos nuevos:** la contraseña cambiada y el pedido de eliminar la cuenta. La gift card avisa a quien la compró cuando le llega a la otra persona y cuando la canjea.
### Cotizaciones 1.5.0, Promotores 1.2.0, Cursos 1.1.0 y Ofertas y cupones 1.2.0 (C-219)
- **Correos nuevos:**
  - el acuse del presupuesto pedido y la confirmación del aprobado;
  - el promotor no aprobado, "¡Alguien compró con tu código!" y la comisión acreditada;
  - el curso aprobado, al creador;
  - el descuento aprobado de la lista de deseos.
- Parches en Marco del panel 1.7.1 (los avisos al equipo), Productos 1.14.3 (el pedido de reseña) y Configuración 1.1.8 (el correo de prueba).
- **Base (aditiva):** `sorteos.recordatorioAt`.

## [1.0.0-rc.46] - 2026-11-14
Desde dónde sale cada producto, dicho por su estado (el equipo, 14/11: "Sale desde La Victoria" no se entiende).
### Tienda 1.11.0 (C-222)
- **La tarjeta de todo lo físico** lleva el ícono de ubicación con "Desde Aragua" o "Desde Portuguesa". Antes, solo lo de la ferretería decía "Sale desde La Victoria".
- **La ficha** empieza la entrega con "Sale de La Victoria, estado Aragua" ("Solo envío, por ZOOM o MRW. La garantía la atiende la tienda.") o "Sale de Guanare, estado Portuguesa".
- **El catálogo filtra por "Desde dónde sale",** con la cuenta de cada lugar. Filtra al tocarlo, como las categorías, y se quita con un toque desde arriba. Esas páginas no se indexan.
### Carrito, checkout y cuenta del cliente 1.4.4 (C-222)
- **Un pedido en dos paquetes** dice el estado y la ciudad de cada uno en el carrito, el pago, "Calcula tu envío" y el detalle del pedido: "desde Portuguesa (Guanare)" y "desde Aragua (La Victoria)".
### Productos 1.14.2 y Órdenes y pagos 1.2.3 (C-222)
- **El proveedor guarda el estado de su ciudad de ZOOM, y la orden el de su paquete** (dos columnas nuevas, aditivas, con su relleno para la ferretería).

## [1.0.0-rc.45] - 2026-11-14
El sorteo por pasos, el primero hecho con las reglas nuevas del panel (`docs/plan/PLAN.md` §1.9; el equipo, 14/11: "básico, sin comprensión, desordenado").
### Marketing 1.11.0 (C-221)
- **Crear el sorteo es un asistente de 4 pasos:** el premio, cómo se gana, las fechas y "Revisar y publicar".
  - Al lado, la vista previa de /sorteo en un teléfono; al revisar, también la tarjeta de Mi panel.
  - La foto se sube o se elige de un producto de la tienda: ya no se pega una dirección.
  - Cómo se gana se explica con un ejemplo ("Compra de $25 → 1, 4 amigos → 2 = 3 boletos").
  - Publicar o guardarlo sin publicar se elige al final, no con un interruptor antes de que exista.
- **Ya creado, su tablero:** el estado en su sello, la línea de tiempo con "hoy", los cuatro números con su ícono, cuánto del premio ya está pagado y quiénes participan. Arriba: Copiar enlace, Ver en la tienda, Cambiar y Publicar o Apagar.
- **Al cambiar algo,** el último paso dice qué cambia (antes → después) y cuántos boletos quedan y a cuántos clientes les cambian, antes de guardar.
- **Al cerrar, sortear en 3 pasos:** revisa, sortea (con su confirmación) y avísale. El ganador tiene "Escribirle".
### Marco del panel 1.7.0 (C-221)
- **Los pasos de un trabajo largo llevan su ícono:** la línea hasta el siguiente se llena y aparece el visto al terminar cada uno, una sola vez. En el teléfono, una barra con un tramo por paso. La Lista del proveedor sigue igual, con sus números.
- **La ayuda que no cabe en una línea va detrás de un (i)** que se abre al tocarlo.
### Carrito, checkout y cuenta del cliente 1.4.3 (C-221)
- **La tarjeta del sorteo en Mi panel** dice la compra mínima de verdad (decía "$10" fijo).

## [1.0.0-rc.44] - 2026-11-14
Ningún contenedor ámbar (Andrés, 14/11: "ese color de contenedor ámbar lo detesto, está en todos lados"; eligió el azul claro de la tienda viendo las tres opciones).
### Marco del panel 1.6.2 y todos los módulos con avisos (C-226)
- **Lo que alguien tiene que hacer, en bloque, va en el azul claro de la tienda** con el ícono cian en su placa azul noche: el aviso compartido del panel (42 lugares) y 24 pantallas escritas a mano.
- **En la tienda:** el checkout (verificar el correo, la responsabilidad del envío), el pago por Pago Móvil, el cupón que no aplica, el cobro a destino de Mis pedidos, Mis documentos y la cuenta sin verificar.
- **En los correos:** el aviso del cobro a destino y el del código digital ya no van en caja ámbar.
- **"Lo que no incluye" del presupuesto** pasa al mismo azul.
- **El monto a pagar del Pago Móvil, en azul de marca:** el ámbar no destaca.
- Parches en Dashboard 1.1.3, Órdenes y pagos 1.2.2, Productos 1.14.1, Marketing 1.10.1, ElectroStudio 1.2.3, Cursos 1.0.7, Cotizaciones 1.4.4, Configuración 1.1.7, Tienda 1.10.3 y Carrito, checkout y cuenta del cliente 1.4.2.

## [1.0.0-rc.43] - 2026-11-13
### Productos 1.14.0 (C-218)
- **La lista completa de cada proveedor queda guardada al subirla** (tabla nueva, aditiva).
- **"Proponer con Claude" en la Lista del proveedor:** la categoría y el nombre de la tienda de todo lo nuevo.
  - Va de a 40 códigos, con su avance y "Parar". Los 3.114 de la ferretería, en unos 7 minutos.
  - Queda guardado: no se vuelve a pagar.
  - Llena el nombre y la categoría de cada fila y marca para revisar lo que Claude no tuvo claro. Lo que el equipo escribió no se toca.
### Clientes 1.4.0 (C-218)
- **Las solicitudes de productos buscan también en la lista de los proveedores:** "Lo tiene <proveedor>", con el código y su existencia (una columna nueva, aditiva).

## [1.0.0-rc.42] - 2026-11-13
### Marketing 1.10.0 (C-217)
- **"Armar con Claude" en las campañas de correo:** se escribe el objetivo ("gift cards para Navidad") y Claude arma el asunto, la vista previa y el texto con hasta 4 productos de la tienda.
  - La foto, el precio y el enlace de cada producto los pone la tienda, no la IA.
  - Usa lo que se sabe de la tienda: el envío gratis, las fechas de Navidad y el sorteo.
  - Llena el editor para revisarlo y guardarlo como siempre.
- **Las campañas aceptan las fotos de los productos** (antes, solo las imágenes subidas sueltas).

## [1.0.0-rc.41] - 2026-11-13
Sin píldoras ámbar (Andrés, 13/11; eligió la opción A viendo las tres).
### Marco del panel 1.6.1 y todos los módulos con píldoras (C-216)
- **Lo que alguien tiene que hacer va en un sello azul noche,** con texto blanco y el ícono en cian, en todo el panel y en Mi panel: Pendiente, Te toca, Por revisar, Por firmar, Sin verificar, Sin guardar…
- **Mensajes, solicitudes, descuentos, verificaciones, creadores y cursos tienen sus estados como el resto del panel:** azul lo que avanza, verde lo hecho, rojo lo rechazado.
- **"Pausado", "Necesario para…" y los avisos del sorteo, en gris:** son datos, no tareas.
- **En el documento de la cotización,** "Pendiente de aprobación" va en azul suave.
- Parches en Órdenes y pagos 1.2.1, Productos 1.13.2, Ofertas y cupones 1.1.3, Marketing 1.9.1, ElectroStudio 1.2.2, Cursos 1.0.6, Cotizaciones 1.4.3, Clientes 1.3.1, Reportes y seguridad 1.1.4, Configuración 1.1.6, Tienda 1.10.2 y Carrito, checkout y cuenta del cliente 1.4.1.

## [1.0.0-rc.40] - 2026-11-13
### Clientes 1.3.0 (C-215)
- **Mensajes y solicitudes por urgencia:**
  - Claude marca cada uno como urgente o que puede esperar, dice de qué trata (su pedido, garantía, quiere comprar…) y por qué;
  - en las solicitudes, dice si lo pedido ya está en la tienda, con el enlace.
  - Lo nuevo se revisa solo al llegar, y "Ordenar por urgencia" revisa lo que falte. "Más urgentes primero" ordena las dos pestañas.
- **Queda guardado** (9 columnas nuevas en mensajes y solicitudes, aditivas): abrir la pantalla no vuelve a gastar.
- En el teléfono, las cifras de las solicitudes van de a dos.

## [1.0.0-rc.39] - 2026-11-13
### Clientes 1.2.0 (C-214)
- **"Redactar con Claude" en cada mensaje de contacto:** la respuesta lleva lo real de la tienda:
  - el estado de su orden, con la guía y el rastreo;
  - los productos que nombra, con su precio, si hay y el enlace;
  - lo que cobra ZOOM a su ciudad.
  - Lo que no está en los datos va a "Antes de enviar, confirma". Se edita y se manda por correo o por WhatsApp, o se copia.
- **Una orden de otra persona no se usa,** aunque el mensaje la nombre. Si el teléfono del mensaje no es el de su cuenta, solo se ofrece responder por correo.
- **En el teléfono, el detalle del mensaje cabe en la pantalla.**

## [1.0.0-rc.38] - 2026-11-13
Claude en el panel, la primera de las ideas que eligió Andrés.
### Clientes 1.1.0 (C-213)
- **La pestaña "Resumen" de la ficha del cliente** (antes "Estadísticas"):
  - **lo que hay que atender:** órdenes abiertas, garantías, cotizaciones, pedidos de producto y descuentos, cada uno con su enlace y a quién le toca;
  - **cómo compra:** la última compra, el promedio, sus Puntos ES, con qué paga y cómo recibe;
  - **"Resumir con Claude":** quién es como cliente, lo que conviene hacer ahora y hasta 3 productos de la tienda para ofrecerle. Solo le llegan a la IA su primer nombre y su ciudad, no su correo ni su teléfono.
- **"Total gastado" cuenta solo lo pagado:** antes sumaba lo pendiente y lo cancelado.
- **En la ficha, cada orden tiene su monto y su estado:** antes salían en $0,00 y en inglés.
- **"Órdenes abiertas" cuenta también las confirmadas, pagadas y listas para recoger.**
### Marco del panel 1.6.0 (C-213)
- **La base para usar Claude en todo el panel:**
  - el modelo y el esfuerzo salen del `.env`;
  - dice qué IA redactó cada cosa;
  - las reglas se aplican aunque el modelo se equivoque: sin emojis y "Puntos ES", nunca saldo ni billetera.
### Productos 1.13.1 (C-213)
- "Buscar en la web" usa esa base. Hace lo mismo que antes.

## [1.0.0-rc.37] - 2026-11-13
El sorteo de la PlayStation 4 (pedido de Andrés del 13/11; eligió los números para que la empresa no pierda).
### Marketing 1.9.0 (C-212)
- **Marketing → Sorteo:**
  - **Cómo es:** el premio, su foto, las fechas, la compra mínima (USD 10), el tope por invitar (3) y lo que cuesta el premio, que solo se ve en el panel.
  - **Lo que dejó el sorteo:** boletos, participantes, ventas con boleto y cuánto del premio ya pagó el margen.
  - **Quiénes participan,** con un aviso cuando un invitado no cuenta.
  - **"Sortear ahora":** solo cuando cerró y una sola vez, al azar entre todos los boletos. Queda en la bitácora con la huella de la lista.
### Carrito, checkout y cuenta del cliente 1.4.0 (C-212)
- **La página `/sorteo`:**
  - el premio y cuántos días faltan;
  - cómo participar: 1 boleto por cada compra pagada de USD 10 o más, o invitando a 2 amigos sin comprar (1 boleto por cada 2, hasta 3);
  - con sesión, los boletos y el enlace para compartir por WhatsApp;
  - las bases;
  - después del sorteo, quién ganó, con el correo tapado.
- **Mi panel muestra el sorteo con los boletos del cliente.** Quien se registra con el enlace de un participante queda como su invitado.
- **Dos tablas nuevas** (`sorteos` y `sorteo_participantes`). No se borra ni se cambia nada de lo que hay.
### Tienda 1.10.1 y Marco del panel 1.5.1 (C-212)
- La imagen para compartir de `/sorteo` y el enlace `?invita=`, que se guarda 30 días para el registro.

## [1.0.0-rc.36] - 2026-11-13
### Productos 1.13.0 (C-211)
- **"Buscar en la web" y "Completar con la web" usan Claude Haiku 5.5 en esfuerzo alto** (pedido de Andrés): lee las páginas del fabricante y redacta la ficha, y busca por su cuenta cuando no encuentra páginas. Lo que devuelve pasa por las mismas comprobaciones de la tienda que antes.
  - Groq queda de respaldo, si Claude falla o se acaba el crédito.
  - La ficha dice qué IA la redactó ("Claude Haiku 5.5 (esfuerzo alto)").
  - El modelo y el esfuerzo se cambian en el `.env` (`ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`), sin deploy.
- **Dependencia nueva:** `@anthropic-ai/sdk` 1.3.0, sin alertas de seguridad nuevas.

## [1.0.0-rc.35] - 2026-11-13
Correcciones que pidió Andrés mirando producción. Eligió lo recomendado en las cuatro preguntas.
### Tienda 1.10.0 (C-210)
- **"Destacados de la semana" muestra solo lo que tiene la estrella,** de toda la tienda (la ferretería también). Antes se completaba con ofertas y lo nuevo, y por eso, aunque se quitaran las estrellas, seguían saliendo los mismos. Sin ninguna estrella, la sección no sale.
- **"Recién llegados" ordena por la fecha en que se publicó cada producto,** no por la de creación: lo que se publica hoy sale primero, aunque se haya creado antes en borrador con la Lista del proveedor. Lleva hasta 4 de cada departamento o categoría.
### Productos 1.12.0 (C-210)
- **Cada producto guarda cuándo se publicó por primera vez:** al publicarlo uno por uno, en lote, con "Publicar los listos" o al crearlo ya publicado. Volver a publicarlo no le cambia la fecha.
### Marco del panel 1.5.0, Órdenes y pagos 1.2.0 y Cursos 1.0.5 (C-210)
- **Las píldoras de estado, como los sellos de la tienda:**
  - llenas y con texto blanco (azul, verde fuerte o rojo); lo que falta hacer, en ámbar claro;
  - en Órdenes, con su ícono;
  - "Digital", en azul como en la tienda;
  - la guía de ZOOM, en gris con el camión.
- **Los botones se levantan un poco al pasar el ratón y se hunden al tocarlos.**

## [1.0.0-rc.34] - 2026-11-13
### Tienda 1.9.0 (C-207)
- **El inicio que vende** (Andrés eligió el 13/11, después de ver el plan de los 5 cambios):
  - **Cada producto sale una sola vez,** en la primera sección que le toca. Antes "Recién llegados" repetía los 8 destacados y las gift cards salían tres veces.
  - **"Recién llegados" trae lo último de toda la tienda,** ferretería incluida, con pocos de cada departamento o categoría: una carga grande de un proveedor no llena la sección. El mismo día, los destacados primero.
  - **"Destacados de la semana"** se completa solo hasta lo que necesita para verse (5): lo nuevo va a "Recién llegados".
  - **Las gift cards y recargas, en una sola sección,** con cada plataforma y su monto. Antes la franja tenía enlaces a búsquedas, y las de Google Play y Apple no traían nada.
  - **"Compra por categoría"** con la foto de un producto real, la cuenta solo desde 10 productos y las categorías chicas juntas en "Más categorías". Ninguna dice "1 producto".
- **El saludo navideño ya no tapa la tienda al entrar:** es una franja dentro del inicio, después de los destacados.
### Marketing 1.8.0 (C-207)
- **Navidad:** "El saludo en el inicio", con la franja navideña (recomendada) o la imagen del popup. La vista previa muestra la franja.

## [1.0.0-rc.33] - 2026-11-13
### Productos 1.11.0 (C-205)
- **La Lista del proveedor, por pasos** (pedido de Andrés del 13/11; eligió la maqueta A): proveedor y precio, su lista y las fotos, revisar, crear y actualizar, y terminar y publicar.
  - Arriba se ve en qué paso estás y lo que ya elegiste en cada uno.
  - Abajo, "Atrás" y "Siguiente: …", que dice adónde lleva o por qué todavía no se puede.
- **Cada campo, del tamaño de su dato:** el descuento y el margen ya no ocupan un cuarto de pantalla, y el proveedor y la ciudad no van de borde a borde.
- **Los filtros, con ícono, cuenta y una línea** que dice qué juntan. Lo mismo en los borradores.
- **"Así queda":** el precio de lista, el costo y la venta de un producto, para ver la cuenta antes de crear.
### Marco del panel 1.4.0 (C-205)
- **Reglas de ancho para todo el panel** (`PLAN.md` §1.5): la página empieza junto al menú y lo que se limita es lo de adentro. La ayuda de los campos va en líneas cortas.
- **Piezas nuevas** para los trabajos de varios pasos y para los filtros.

### Tienda 1.8.0 y Carrito, checkout y cuenta del cliente 1.3.0 (C-199)
- **"Calcula tu envío"** en la ficha y en el carrito:
  - el cliente elige su estado y su ciudad;
  - ve lo que le cobrará ZOOM al retirar en su oficina, en dólares y bolívares;
  - se recuerda para la próxima y sale de "Mis direcciones" si inició sesión;
  - si ZOOM no responde, un estimado propio marcado como aproximado.
- **Lo de la ferretería sale desde La Victoria,** solo con envío:
  - la ficha y la tarjeta dicen "Sale desde La Victoria";
  - no ofrece retiro ni delivery en Guanare;
  - si el carrito mezcla, llega en dos paquetes, cada uno con su embalaje y su guía, y el carrito y el checkout dan el flete de cada uno.
### Órdenes y pagos 1.1.0 (C-199)
- **Una orden por paquete:** la compra con productos de la tienda y de la ferretería se divide en dos órdenes, que se pagan juntas, cada una con su guía y su correo.
- **El envío gratis vale solo para el paquete de Guanare.** El de la ferretería va siempre con cobro a destino.
- **En el panel,** la orden del proveedor avisa que hay que pasarle el pedido.
- El servidor rechaza el retiro y el delivery con algo de la ferretería.
### Productos 1.10.0 (C-199)
- **Lista del proveedor, "Quién despacha sus pedidos":** la tienda, o él mismo desde su ciudad de ZOOM. La ferretería despacha desde La Victoria.
- **Base:** 4 columnas nuevas (aditivo): `suppliers.dispatchCityCode`, `suppliers.dispatchCityName`, `orders.dispatchCityCode` y `orders.dispatchCityName`.

## [1.0.0-rc.31] - 2026-11-12
### Productos 1.9.1 (C-204b)
- **Lo que no se envía, sin falsos positivos:** después de "a", "para" o "P/" la palabra dice con qué funciona o para qué sirve, y no cuenta. "Motobomba a gasolina" y "Pistola para pintura" se crean; "Gasolina blanca" y "Pintura de aceite" no. Sale "satinado" de la lista (también es un acabado de cerradura).
- **"Sí se envía":** el botón de cada fila marcada deja pasar ese producto (una excepción con su código, que se guarda con el proveedor).
- **De una carpeta solo se toman las fotos.** Las hojas que vienen adentro (como los `.csv` de trabajo de las fotos) ya no se mezclan con su lista: un aviso dice cuáles no se leyeron.

## [1.0.0-rc.30] - 2026-11-12
### Productos 1.9.0 (C-204)
- **La carga masiva, completa** (Productos → Más → Lista del proveedor), con lo que eligió Andrés en las cinco preguntas:
  - **El Excel y las fotos juntos.** Se sueltan encima de la pantalla o se elige la carpeta. La vista previa muestra la foto de cada fila y cada producto se crea con las suyas, con el fondo blanco y la cinta. Si vienen de varias carpetas, se puede dejar fuera una, y una foto repetida en dos carpetas no se sube.
  - **Lo que ZOOM y MRW no llevan** (pinturas, solventes, aerosoles, pegas con solvente y gas) se marca y no se crea. La lista de palabras se edita y se guarda con el proveedor; el servidor la respeta aunque la pantalla mande otra cosa.
  - **"Sugeridos":** primero lo afín a la tienda (electricidad, iluminación, protectores de voltaje, herramientas eléctricas, bombas y cerrajería), con existencia y que aguanta solo su envío.
  - **La columna "Modelo"** entra como la especificación del mismo nombre ("De un vistazo" en la ficha).
  - **El paso 5, "Terminar los borradores y publicar":**
    - cada borrador dice qué le falta: foto, descripción, peso y medidas, el nombre escrito normal, marca o modelo;
    - "Completar con la web" los busca uno por uno y llena solo lo vacío; lo que trajo queda por revisar;
    - "Publicar los listos" publica solo los completos.
- **Base:** 1 columna nueva (aditivo): `suppliers.noShipTerms`.

## [1.0.0-rc.29] - 2026-11-11
### Tienda 1.7.1, Marco del panel 1.3.8 y Configuración 1.1.5 (C-203)
- **Una pestaña abierta antes de un deploy ya no se rompe.** Al navegar mezclaba el código viejo con el nuevo ("getCategoryIconOption is not a function" en Categorías del panel, el 11/11) y pedía archivos que ya no existían (404 y "MIME type 'text/plain'" en la consola). Ahora:
  - cada pedido del router dice de qué versión es la pestaña; si no es la del servidor, `proxy.ts` responde vacío y la página se carga entera, ya con la versión nueva;
  - el deploy sigue sirviendo 7 días los archivos del navegador de las versiones anteriores.
- Después de un deploy no se baja nada de nuevo: el JS y las fotos se siguen guardando en el navegador como antes.
- **De paso:** las miniaturas de los videos de `/servicios` se ven (respondían 400).

## [1.0.0-rc.28] - 2026-11-10
### Tienda 1.7.0 (C-200)
- **El departamento Ferretería.** Sus productos no se mezclan con el inicio, que sigue siendo de tecnología. Tiene:
  - **Acceso:** en la franja, al lado de Ofertas; en el teléfono, el primer chip del inicio y la primera entrada de "Más".
  - **Su vitrina en el inicio,** después de "Recién llegados": el aviso del envío, sus categorías y sus productos.
  - **Su página:** el catálogo de siempre, con el aviso del envío y sus 9 categorías arriba. Cada subcategoría lleva la miga "Productos › Ferretería › …".
  - "Categorías" lo muestra en su propio grupo, y `/categorias`, el sitemap y `llms.txt` suman lo de sus categorías.
  - **No se ve hasta que tenga productos publicados.**
### Productos 1.8.0 y Carrito, checkout y cuenta del cliente 1.2.3 (C-200)
- **Categorías:**
  - la casilla "Departamento aparte";
  - en el selector, los 10 íconos nuevos de ferretería (pack v1.2: rodillo, taladro, enchufe, pala con brote, grifo, llave, bombillo, llave inglesa con destornillador, careta y caja de herramientas).
- **Guion:** `scripts/ferreteria-departamento.ts` crea el departamento y sus 9 categorías.
- **Base:** 1 columna nueva (aditivo): `categories.isDepartment`.

## [1.0.0-rc.27] - 2026-11-10
### Productos 1.7.0 (C-202)
- **Los nombres bien escritos.**
  - En la Lista del proveedor, cada producto nuevo trae su "Nombre en la tienda": escrito normal, con las abreviaturas de su lista completadas ("BOMBA PERIF 1/2 HP 120V DAEWOO" pasa a "Bomba periférica 1/2 HP 120 V Daewoo"). Se corrige antes de crear.
  - Debajo de cada nombre va cómo viene en su lista y lo que hay que mirar: cortado (su sistema corta en 30 letras) o algo que no se entendió. "Nombres para revisar" muestra solo esas filas.
  - Su nombre original queda guardado aparte, para pedirle el producto.
- **En el asistente:** si el nombre está en mayúsculas o trae abreviaturas, un aviso muestra el nombre propuesto, con "Usar este nombre".
### Tienda 1.6.2 y Marco del panel 1.3.7 (C-202)
- **Cambiarle el nombre a un producto ya no rompe su enlace:** la dirección anterior responde con un 308 a la nueva. Antes daba "no encontrado" en Google y en lo que ya se había compartido.
- **Base:** 2 columnas nuevas (aditivo): `products.previousSlugs` y `products.supplierName`.

## [1.0.0-rc.26] - 2026-11-10
### Carrito, checkout y cuenta del cliente 1.2.2 (C-201)
- **Mi panel ya no se sale de la pantalla en el teléfono:** "Últimos pedidos" y "Movimientos" medían 570 px en un teléfono de 360.
- **Los movimientos viejos ya no dicen "Saldo devuelto":** el inicio los limpia como la página de Puntos ES ("Puntos ES devueltos", "Compra de la orden").
- **El inicio, más claro:**
  - Sin "En vivo".
  - "Actividad reciente" en vez de "Movimientos".
  - Para quien ya compró, las misiones van en una tarjeta corta con solo lo que falta.
- **El menú:** "Mis pedidos" y "Mis cursos", con las mayúsculas parejas. "Mis cotizaciones" y "Mis cursos" salen solo a quien tiene alguno.
- **Garantía:** las tres pestañas entran en el teléfono.
### Tienda 1.6.1, Clientes 1.0.5 y Cotizaciones 1.4.2 (C-201, internos)
- El texto limpio de los movimientos, para el inicio de Mi panel (`descripcionLimpia`).
- El perfil dice cuántas cotizaciones y cursos tiene el cliente, para su menú.
- La regla de dueño de las cotizaciones, en una sola función.

## [1.0.0-rc.25] - 2026-11-10
### Tienda 1.6.0 (C-197)
- **La ficha del producto sin huecos:** la descripción y las especificaciones van en una sola tarjeta. La Descripción ya no se estira hasta la altura de las especificaciones.
  - Al lado de la descripción, cuatro datos de un vistazo: marca, modelo, garantía y condición.
  - Las especificaciones van en dos columnas desde la computadora.
- **Las especificaciones se leen mejor:** los nombres en mayúsculas se escriben normal ("TIPO DE LED" pasa a "Tipo de LED") y lo que decía "No especificado" no sale. Lo guardado no cambia.
### Productos 1.6.0 (C-196b)
- **Lista del proveedor:** la casilla "Su lista trae el IVA incluido". El costo queda sin el IVA que se le paga, y la tienda lo vuelve a sumar al precio de venta: con $54,90, costo $47,33 y precio $71,37. Se recuerda por proveedor.
- **Base:** 1 columna nueva (aditivo): `suppliers.pricesIncludeTax`.

## [1.0.0-rc.24] - 2026-11-10
### Productos 1.5.0 y Marco del panel 1.3.6 (C-196)
- **La lista va por páginas de 50.** Antes pedía todos los productos con su descripción: 4.626 KB con 3.100 productos; ahora una página pesa 29 KB.
  - Busca por palabras en cualquier orden, sin acentos: "taladro daewoo" encuentra "TALADRO IMPACT 1050W DAEWOO". También por marca y por código del proveedor.
  - Ordena por lo más nuevo, lo cambiado hace poco, el nombre, el precio o lo que menos existencia tiene.
  - "Seleccionar los N que coinciden" sirve para las acciones en lote de varias páginas.
  - El CSV exporta la vista, con la marca, el costo y el proveedor.
- **Proveedor y costo en cada producto:** en el paso de precios del asistente ("Agregar proveedor" ahí mismo) y en la lista, con el costo, el margen y el filtro por proveedor. Nada de esto sale a la tienda.
- **Productos → Más → Lista del proveedor:**
  - Se sube su Excel (`.xls`, `.xlsx` o `.csv`; los de precios y de existencia juntos se unen por el código).
  - Crea en borrador lo que se marque, con costo, precio sugerido y existencia con reserva.
  - Actualiza el costo y la existencia de lo que ya está, y deja en 0 lo que se agotó allá.
  - Sube las fotos llamadas con el código (`R023127.jpg`, `R023127-2.jpg`).
- **Base:** la tabla `suppliers`, 3 columnas en `products` (`supplierId`, `supplierSku`, `supplierSyncedAt`) y 4 índices. Aditivo.
- El cuadro de "dos personas cambiaron lo mismo" nombra el proveedor y su código.

## [1.0.0-rc.23] - 2026-11-07
### ElectroStudio 1.2.1 y Marketing 1.7.1 (C-195)
- **Chispa 3.0 en las historias, en el editor y en el popup navideño:**
  - pulgares cortos y gruesos, que ya no parecen un índice;
  - cada mano con un solo contorno, sin cortes en las uniones;
  - la mano de señalar con el pulgar cruzado.
- **Las imágenes van en otra carpeta,** `/images/studio/chispa-3/`, con la dirección en `lib/studio/chispa.ts`. El optimizador de imágenes guarda 30 días y no se puede vaciar: con la misma dirección se habrían seguido viendo las manos viejas.
### Chispa (fuera de la web)
- **Las manos:**
  - una silueta por mano;
  - el puño de costado;
  - el OK con un aro chico junto a la cara;
  - manos nuevas: OK, V, teléfono y dedos juntos;
  - `chispa.mano()` para ver una sola.
- **Movimiento:** impulso, curva y rebote, la muñeca con retraso y parpadeo al cambiar de gesto.
- **Cara:** ocho expresiones y miradas por nombre.
- **Poses nuevas:** `ok`, `victoria`, `telefono` y `presenta`.
- Las reglas para dibujar las manos, en `chispa/conocimiento/02-chispa-el-personaje.md`.

## [1.0.0-rc.22] - 2026-11-06
### Marketing 1.5.0 y Carrito, checkout y cuenta del cliente 1.2.0 (C-191)
- **Por qué Marketing decía "1 cliente":** las campañas van solo a quien aceptó promociones (regla de Andrés del 16/09), pero nada se lo preguntaba al cliente: el interruptor estaba solo en Mi perfil → Notificaciones.
- **Ahora se pregunta:**
  - al registrarse, con una casilla sin marcar;
  - y una vez en Mi panel ("¿Te avisamos de las ofertas?", con "Sí, por correo" y "No, gracias"), a quien nunca decidió.
- **Marketing → Campañas de correo** dice "N de M clientes" (todos los de Clientes) y por qué el resto no las recibe: sin decidir, dijeron que no o sin verificar el correo. "1 cliente" en singular.
- **Base:** 1 columna nueva (aditivo): `notification_preferences.emailPromotionsAt`, la fecha del sí o del no.
### Marketing 1.6.0 y 11 módulos más (C-192)
- **El ámbar, solo para avisos que piden hacer algo.** La regla está en `PLAN.md` §1.1, elegida con maquetas reales:
  - el azul de la marca para lo que se destaca;
  - una sola pieza fuerte en azul noche;
  - neutros para notas y datos.
- **Correos con un solo acento:** el certificado, la inscripción, la gift card, el código digital y el código de promotor van en una placa azul noche. El pago en revisión, la guía, la cancelación y los datos de las pruebas, en gris.
- **Tienda y panel:** los niveles y las categorías de cursos, "Destacado", "Antes" y "Después" de Servicios, Promotores, los métodos de pago, los reembolsos y las notas internas dejan el ámbar.
- **Contraste:** sin texto blanco sobre ámbar o verde.
- **Un arreglo de paso:** el círculo del error de Pago Móvil vuelve a tener color.
### ElectroStudio 1.2.0 (C-193)
- **Dos plantillas nuevas:**
  - Regalos por presupuesto: tres regalos de un tramo de Ideas para regalar, con el QR a ese tramo y el buscador limitado al tramo.
  - Felicitación con Chispa.
- **Chispa en las historias:** cinco poses, con el borde de sticker, en los mensajes y en la felicitación.
- **Toque navideño:**
  - el gorro de la tienda en el logo y en Chispa;
  - la franja "pide hasta el … para que llegue antes del 24" en los productos físicos, con las fechas de Marketing → Navidad;
  - tres fondos: Noche, Guirnalda y Nieve.
- **Los íconos propios de Electro Shop** en las historias y en el editor.
- **El texto para publicar** lleva el WhatsApp y de 10 a 15 hashtags.
### Marketing 1.7.0 y Tienda 1.5.0 (C-194)
- **El popup navideño del inicio**, con el diseño de la felicitación que eligió Andrés: el saludo en una tarjeta blanca, el botón "Ver ideas para regalar" y Chispa saludando con el gorro.
### Chispa (fuera de la web)
- En "celebra", "explica" y "hombros", la mano izquierda era la derecha copiada. Ahora va en espejo (`chispa/mascota/chispa.js`).

## [1.0.0-rc.21] - 2026-11-06
### Tienda 1.4.0, Marketing 1.4.0, Carrito 1.1.0 y Configuración 1.1.3 (C-190)
- **Ideas para regalar** (`/ideas-para-regalar`), una de las recomendaciones de Navidad que eligió Andrés:
  - Regalos por presupuesto: hasta $20, de $20 a $50 y más de $50. Primero los destacados, después los más vendidos y los más nuevos.
  - Las gift cards con varios montos entran en cada tramo donde tienen un monto.
  - La página está todo el año y lleva el toque navideño con el tema encendido.
  - Tiene su imagen para compartir y está en el sitemap y en el pie. El botón de la tarjeta navideña lleva ahí, salvo que se haya guardado otro enlace.
- **"Para que llegue antes del 24, pide hasta el …"**, otra de las recomendaciones elegidas:
  - Es una franja con un calendario en la ficha de los productos físicos, en el carrito y en Ideas para regalar.
  - Las fechas de corte (ZOOM o MRW, y Guanare) se cargan en Marketing → Navidad.
  - Solo sale con el tema activo y la fecha cargada, y se va sola después de la fecha.
- **Dos borradores de campaña** (aguinaldo y último minuto): `scripts/campanas-navidad.ts --aplicar`. Nunca envía, ni duplica.
- **Base:** 2 columnas nuevas (aditivo) en `company_settings`: `christmasCutoffShipping` y `christmasCutoffLocal`.
### Productos 1.4.0 (C-189)
- **El selector de íconos de Categorías ofrece solo los íconos propios de Electro Shop** (aprobado por Andrés). Son 35, ordenados por tema, y ya no se importan íconos de otras librerías.
- Las categorías que ya existen se ven igual. Lo nuevo se guarda con el nombre del pack, y un nombre desconocido muestra "Otros".
- **Mucho menos JavaScript:**
  - el checkout pasa de 6,3 MB a 1,3 MB sin comprimir (de 2,3 MB a 370 KB transferidos);
  - los códigos digitales del cliente pasan de 9,8 MB a 2 MB;
  - el sitio completo pasa de 36 MB a 4,7 MB.
- Fuera las dependencias que nadie usaba: `lucide-react` y las de `@fortawesome`.
- Sin cambio de base.

## [1.0.0-rc.20] - 2026-11-06
### Tienda 1.3.0 (C-186)
- **Tema navideño, con el diseño de la marca.** Con el tema encendido:
  - el logo del encabezado y el del pie llevan un gorro de Santa con el trazo azul marino del pack de íconos;
  - al entrar sale la tarjeta navideña, con el sello ES y su gorro, "Feliz Navidad" y el botón "Ver ideas para regalar".
- **Dos gorros, a elegir en el panel:** "Ajustado al sello" (el aro blanco del logo se vuelve la piel del gorro) y "Clásico".
- **La animación pasa una sola vez** (la pantalla del sello se enciende y el gorro cae y se mece hasta quedar quieto), y quien pide menos movimiento la ve quieta. Sin nieve ni animaciones en bucle.
- **Con el tema apagado** (como queda después del deploy), la tienda es idéntica a la de antes y no carga nada del tema.
### Marketing 1.3.0 (C-186)
- **Pestaña Navidad:**
  - Prende y apaga el tema con fechas en hora de Venezuela (por ejemplo del 1/12 al 6/1), sin deploy.
  - Elige el gorro y si al entrar sale la tarjeta navideña o la imagen del popup.
  - Edita los textos y el enlace de la tarjeta, con vista previa.
### Configuración 1.1.1 (C-186)
- Guarda el tema navideño. Marketing también puede guardarlo, pero nada más de la configuración. La tienda solo recibe qué gorro se ve hoy; las fechas no salen del servidor.
- **Base:** 9 columnas nuevas (aditivo) en `company_settings`: `christmasTheme`, `christmasThemeFrom`, `christmasThemeUntil`, `christmasHat`, `christmasPopup` y los cuatro textos de la tarjeta. Sin variables ni crons.

### Íconos propios en toda la web (C-188)
Tienda 1.3.1; Carrito, checkout y cuenta del cliente 1.0.1; Marco del panel 1.3.4; y un parche en Dashboard, Órdenes y pagos, Productos, Ofertas y cupones, Marketing, Promotores, ElectroStudio, Cursos, Trabajos realizados, Cotizaciones, Clientes, Reportes y seguridad y Configuración.
- **Los íconos de librería se cambiaron por los propios de Electro Shop**, dibujados para la tienda: 156 en `components/iconos/`.
  - Todos tienen la misma cuadrícula de 24, el mismo trazo y las puntas redondeadas.
  - De react-icons solo quedan los logos oficiales de las marcas.
- **El sello "Digital" ya no lleva el rayito**, sino la pantalla con el código. Los otros usos del rayito tienen su propio dibujo.
- **Dos tonos de la marca**, azul marino y azul, en "Compra por categoría", "Compra con confianza", el menú "Categorías" y `/categorias`. En el resto van en un solo color, que toma el del texto.
- **Arreglos de paso:**
  - "Gift Cards y Recargas" salía con el ícono de "Otros".
  - Cuatro títulos del checkout tenían el ícono blanco sobre celeste y no se veían.
  - En Transacciones, el movimiento de Puntos ES que decía "Retiro" ahora dice "Salida".
  - La portada baja mucho menos JS: de 4,9 MB a 0,9 MB sin comprimir, porque el cargador de íconos de categorías ya no arrastra familias enteras.
- Sin cambio de base.

## [1.0.0-rc.19] - 2026-11-06
### Productos 1.3.0 (C-187)
- **Ya se pueden eliminar los productos zombis** (pedido de Andrés con una captura de producción).
  - **El problema:** "Borrar para siempre" de un producto con ventas lo dejaba archivado y de vuelta en la lista, todavía destacado, y el cron de la papelera hacía lo mismo a los 30 días.
  - **Ahora:** queda **eliminado**, fuera de la lista, de la papelera y de la tienda para siempre. No cambia nada de su historia: órdenes, garantías, reseñas, códigos y Puntos ES. Solo el dueño puede recuperarlo, y vuelve como borrador.
  - **Papelera:** dice qué productos tienen órdenes y suma "Vaciar la papelera" (solo el dueño).
- **Lo archivado va aparte:** tiene su propio filtro, archivar le quita la estrella de destacado, y no se puede destacar un archivado.
- **Por revisar:** un filtro con los productos sin foto, sin marca o sin peso y medidas. Los avisos del Dashboard llevan ahí.
- **La lista recuerda la vista** (filtro, categoría, búsqueda y pestaña) en la dirección, y al guardar un producto se vuelve a ella. "Ver productos" de Categorías filtra, y también se busca por código de barras.
- **"Deshacer"** al cambiar el estado de un producto desde la lista o la vista rápida.
- **La estrella de destacado en la lista.** El encabezado dice cuántos hay y avisa si pasan del máximo del inicio.
- **Teléfono y tableta:** a 360 caben las pestañas (también la Papelera) y el botón de SADES; a 1024 la tabla cabe con sus acciones; "Más" se cierra al tocar fuera; "Ver en tienda" solo sale si el producto se ve.
- Duplicar ya no copia el número de serie.
- **Categorías:** la API pública cuenta solo lo publicado, y una categoría a la que solo le quedan eliminados se puede borrar.
- **Base:** 1 columna nueva (aditivo): `products.eliminadoAt`. Sin variables ni crons nuevos.
### Dashboard 1.1.1 (C-187)
- Los avisos de productos sin marca, foto o medidas llevan a la lista ya filtrada. El total de productos no cuenta lo archivado.
### Reportes y seguridad 1.1.2 (C-187)
- El total de productos se cuenta igual que en la lista.
### Órdenes y pagos 1.0.2 (C-187)
- El aviso de SADES que archiva un producto le quita la estrella de destacado.
### Sin módulo (C-185)
- Limpieza del repositorio: se borraron archivos sin uso (la plantilla de Next, `ecosystem.config.js` y dos guiones sueltos), y 40 uploads viejos salieron de git. En el servidor se respaldan antes del `git pull` (`SIGUIENTE.md` §2).
- Entran los stickers de WhatsApp de Chispa de Luis (`chispa/`). No cambian la tienda.

## [1.0.0-rc.18] - 2026-10-28
### Cotizaciones 1.4.0 (C-184)
- **El descuento del convenio CCIET, a la vista** (Luis eligió la variante C sin la franja, viendo las maquetas con una cotización real). En las cotizaciones que arma Numen para el convenio:
  - Los equipos y la mano de obra van en tablas separadas, con las columnas alineadas.
  - Cada equipo muestra su **precio de lista** tachado al lado del precio del convenio.
  - En los totales: los equipos a precio de lista, el descuento resaltado en verde y la mano de obra. Debajo, la base imponible, el IVA y el monto total de siempre.
- Igual en la página del enlace (también en el teléfono), en la hoja impresa (en color y en blanco y negro) y en el PDF. Las demás cotizaciones se ven como antes.
- El editor del panel conserva lo que trae Numen (el precio de lista y la mano de obra) al guardar, y lo dice debajo de cada línea.
- **Base:** 3 columnas nuevas (aditivo): `listPriceUSD` y `kind` en `quote_items`, `discountLabel` en `quotes`. Sin variables ni crons.

## [1.0.0-rc.17] - 2026-10-18
### Cotizaciones 1.3.1 (C-183)
- **Las condiciones y las formas de pago, a lo ancho** (pedido de Luis, que eligió la variante A). Los totales quedan a la derecha, pegados a las partidas. Debajo van:
  - las condiciones comerciales a lo ancho, en dos columnas desde tres;
  - las formas de pago, una por línea, con el nombre del método y sus datos seguidos.
- **Por qué:** antes iban en una columna angosta al lado de los totales. Con pocos totales quedaba un hueco, y con muchas condiciones o formas de pago el bloque crecía y saltaba entero a la otra hoja. Ahora las listas siguen en la otra hoja sin dejar huecos.
- Igual en la página, en la hoja impresa (en color y en blanco y negro) y en el PDF. Sin cambio de base, variables ni crons.

## [1.0.0-rc.16] - 2026-10-17
### Cotizaciones 1.3.0 (C-182)
- **El presupuesto con el estilo que eligió Luis**, el del presupuesto técnico de referencia:
  - Arriba, el membrete con el recuadro del documento (número, fecha, validez y estado).
  - El cliente en un recuadro y las partidas con el encabezado azul noche.
  - Las condiciones y las formas de pago al lado de los totales, con el anticipo en verde y el saldo en rojo.
  - Sigue mostrando todo lo de antes.
- **Lo que no incluye y el anexo técnico.** Dos campos nuevos y opcionales en el editor:
  - "Lo que no incluye" sale en un recuadro ámbar debajo de los totales.
  - El anexo técnico va en una segunda hoja, con su título. Arma párrafos, listas ("- ") y tablas (líneas con "|").
- **Imprimir en blanco y negro.** Al lado de "Imprimir o guardar en PDF" está "En blanco y negro", para impresoras sin color. Los fondos de color pasan a bordes y todo sale en tinta.
- **Descargar PDF.** El enlace del cliente trae "Descargar PDF": el mismo presupuesto armado por la tienda, en hoja carta.
  - Mientras está pendiente lleva el código QR, y en el teléfono se toca para aprobarlo.
  - Numen lo pide para mandarlo por WhatsApp. Con `?tinta=bn` sale en blanco y negro.
- **Base:** 3 columnas nuevas en `quotes` (aditivo). Sin variables ni crons nuevos.
### Marco del panel 1.3.3 (C-182)
- El PDF del presupuesto pasa sin sesión: la llave es el enlace del cliente, con límite.
### Tienda 1.2.2 (C-182)
- La hoja impresa del presupuesto pasa de 15 a 14 px de letra, para que quepa en una carta con el membrete nuevo, y tiene sus reglas de blanco y negro.
- Leer una foto subida para las imágenes de compartir pasó a una pieza compartida.
- Para los clientes no cambia nada.

## [1.0.0-rc.15] - 2026-10-17
### Cotizaciones 1.2.0 (C-181)
- **Numen arma las cotizaciones.** Numen es la app de precios y proveedores del equipo. Ahora puede crear cotizaciones en la tienda, mandarlas al cliente (con el correo de siempre) y seguir cómo van, de servidor a servidor con una clave (`NUMEN_API_KEY`). La tienda pone el número, los totales y el IVA. El costo, el proveedor y el margen nunca llegan a la tienda.
- **Cuándo el cliente abrió su enlace.** El detalle de la cotización dice cuándo la abrió y cuántas veces, o que todavía no la abrió. No cuentan la vista previa que arma WhatsApp con el enlace, el equipo ni un borrador.
- Las del panel siguen igual: enviar, aprobar, cerrar y reabrir siguen las mismas reglas desde el panel y desde Numen.
- **Base:** 4 columnas nuevas en `quotes` (aditivo). **Variable nueva:** `NUMEN_API_KEY`. Sin ella, la entrada de Numen responde 503 y lo demás funciona igual.
### Marco del panel 1.3.2 (C-181)
- Las rutas de Numen y el aviso de la vista pasan sin sesión; cada una se autoriza adentro.

## [1.0.0-rc.14] - 2026-10-16
### Tienda 1.2.1 (C-178)
- La imagen de la portada al compartir dice **"Todo lo encuentras con nosotros."** en vez de la lista de categorías.
- Cuando cambian los productos destacados o llegan productos nuevos, cambia también la dirección de las imágenes de la portada, el catálogo y las categorías, así WhatsApp y Facebook bajan la nueva. Sin cambio de base, crons ni variables.

## [1.0.0-rc.13] - 2026-10-16
### Tienda 1.2.0 (C-178)
- **Imágenes para compartir los enlaces.** Al pegar un enlace de la tienda en WhatsApp, Facebook, Telegram o X sale una imagen de 1200 × 630 hecha para eso:
  - **Producto:** la foto con su cinta ES, el nombre, la condición o "Entrega digital", y el precio en dólares, tachado con "Ahorra $X" si hay oferta.
  - **Categorías, portada y páginas:** su título y sus productos.
  - **Antes:** el logo cuadrado, o la foto suelta en WebP.
- La imagen cambia sola cuando cambian el precio o la foto, y las redes la vuelven a pedir. Lo subido a mano en SEO sigue mandando.
- Gift cards, contacto, términos y las demás páginas fijas ya no dicen ser la portada al compartirlas.
### Configuración 1.1.0 (C-178)
- Configuración → SEO: "Así se ve en WhatsApp" muestra la imagen que arma la tienda cuando no se sube una.
### Cursos 1.0.2, Trabajos realizados 1.0.1, Cotizaciones 1.1.2 (C-178)
- Sus páginas tienen su propia imagen para compartir. Sin cambio de base, crons ni variables.

## [1.0.0-rc.12] - 2026-10-16
### Productos 1.2.2, Configuración 1.0.2 (C-177)
- **Dependencias sin fallas conocidas:** Next 16.3.8, sharp 0.35.5 y nodemailer 10.0.13. Se quitó `@auth/prisma-adapter`, que no se usaba. `npm audit` pasa de 11 fallas (3 críticas) a 3 altas, todas de Prisma 6 y solo de su línea de comandos.
- **La tienda escucha solo en `127.0.0.1`.** nginx tiene que apuntar a `127.0.0.1:3000` (paso del deploy).
- Para los clientes y el equipo no cambia nada: las fotos de producto se arman igual y los correos salen igual. Sin cambio de base, crons ni variables.

## [1.0.0-rc.11] - 2026-10-03
### Tienda 1.1.0 (C-172)
- **Destacados que rotan.** En la computadora, cada 7 segundos el primer producto de la columna pasa a ser el grande y el grande anterior se va al final. Da **una sola vuelta** y se queda en el primero. Se detiene con el ratón encima, al usar el teclado, con la pestaña oculta o al tocar un control. Arriba a la derecha de la tarjeta grande: flechas, "2 de 6" y pausa.
- **La estrella del día.** El destacado grande ya no es siempre el mismo: cambia cada día (hora de Caracas) siguiendo el orden de los destacados. Vale también en el teléfono, donde es el primero de la fila.
- En el teléfono nada gira solo, y con "reducir movimiento" tampoco (quedan las flechas). Las fotos grandes de los demás destacados solo se piden cuando les va a tocar.
- Se mide qué se toca (el grande o la columna) y si ya había rotado, para comparar antes y después en Reportes. Sin cambio de base.

## [1.0.0-rc.10] - 2026-10-03
### Correos (C-175)
- El logo largo de los correos es ahora **el mismo del encabezado de la tienda**: el ícono y "Electro Shop" con mayúscula y minúsculas (la rc.9 lo traía todo en mayúsculas). Solo cambian dos imágenes.

## [1.0.0-rc.9] - 2026-10-03
### Marketing 1.2.0 (C-175)
- **Todos los correos rediseñados, con el logo largo.** Arriba va el logo largo de Electro Shop (antes un logo chiquito dentro de un cuadro, sobre una franja azul con el nombre escrito), y debajo el contenido limpio y el pie con las redes, el teléfono y los enlaces.
- **Un solo estilo para todos:** el mismo título, el mismo botón azul, las mismas cajas (aviso, éxito, dato) y el mismo pie en los 30 correos de la tienda. Antes había 12 botones y 10 títulos distintos, y tres correos (pedido recibido, reseña publicada y los avisos al equipo) tenían un diseño aparte.
- **Se ven igual en Gmail, Outlook y el teléfono:** sin degradados, sombras ni trucos que Outlook no pinta; botones que no se rompen; el logo se lee aunque el teléfono esté en modo oscuro.
- **Marketing → Correos → Plantillas** suma la vista previa del correo de reseña publicada.
- Arreglos de paso: el texto de vista previa (el que se lee al lado del asunto) estaba mal puesto y algunos clientes de correo no lo mostraban; el nombre del cliente, el mensaje de una Gift Card y la referencia de una recarga ahora van siempre escapados.
### Marco del panel 1.3.1, Configuración 1.0.1 (C-175)
- Los avisos al equipo por correo y el correo de prueba de la configuración llevan el mismo diseño.
### Órdenes 1.0.1, Productos 1.2.1, Promotores 1.1.1, Cotizaciones 1.1.1, Clientes 1.0.2 (C-175)
- Sus correos salen con el diseño nuevo. Sin cambio de base, crons ni variables.

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
