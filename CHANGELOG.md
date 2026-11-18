# Cambios de ElectroShopVe

Cada versión que se sube a producción tiene su número, su etiqueta de git (`v1.0.0-rc.1`) y su entrada aquí. El detalle de cada tarea está en `docs/plan/estado/C-XX.md` y lo subido, con su SQL y sus pruebas, en `docs/plan/HISTORIAL.md`.

## Cómo se numera (MAYOR.MENOR.PARCHE)
- **MAYOR** (2.0.0): algo que ya funcionaba deja de funcionar igual para los clientes o para quien se conecta a la tienda: cambian direcciones públicas (`/productos/...`), el feed de productos o la API pública, una regla de negocio de `docs/plan/PLAN.md` §7, o un cambio de base borra o renombra datos.
- **MENOR** (1.1.0): algo nuevo que no rompe nada. Las tablas y columnas nuevas entran aquí.
- **PARCHE** (1.0.1): arreglos, textos y ajustes internos, sin funciones nuevas.
- **`-rc.N`** (candidata): la tienda ya vende pero falta cerrar la revisión final (`docs/plan/REVISION_FINAL.md`, en especial el dinero). `1.0.0` es la primera versión sin ese pendiente.
- Un bloque de deploy = una versión. `package.json`, esta lista y la etiqueta se actualizan en el mismo commit que arma el bloque. En el servidor, `git describe --tags` dice cuál está corriendo.
- **Por módulo (desde C-168):** cada módulo del panel lleva su propia versión en `lib/modulos.ts`, con la misma regla. Cada tarea que toca archivos de un módulo le sube la versión (`npm run check:modulos` falla si no), y esta lista agrupa los cambios por módulo (`### Productos 1.1.0 (C-169)`). La página Administración → Versiones los muestra.

## [1.0.0-rc.105] - 2026-11-18
El dispositivo de confianza (C-291), la fase 2 del plan de Ajustes: en un navegador marcado, el panel no pide el número de la app por 30 días. La contraseña se sigue pidiendo, y la sesión sigue igual (12 horas, se cierra tras 1 hora sin uso). **Cambio de base aditivo:** una tabla nueva (`dispositivos_confianza`) y dos columnas en `user_sessions`. Sin variables nuevas y sin cron.
### Marco del panel 1.18.0 (C-291)
- **Al entrar con el número de la app,** la casilla "No pedir el número en esta computadora por 30 días" ("en este teléfono" en uno), apagada al abrir: "Solo si es tuyo".
- **La galleta** lleva un número al azar (en la base, solo su huella); es HttpOnly, Secure y SameSite Strict, y vence a los 30 días de marcarla. Hasta 5 por persona: el sexto quita el más viejo.
- **Se anulan solos** al cambiar la contraseña, con "No fui yo", al reiniciar los dos pasos o al cerrar las sesiones. Una galleta de otra cuenta, inventada o vencida no sirve.
- **Mi seguridad → Dispositivos de confianza:** cada uno con desde cuándo, su último uso y hasta cuándo; el de ahora dice "Este"; "Quitar" y "Quitar todos".
- **Al marcar uno llega un correo** con "No fui yo".
- **Lo delicado pide el número otra vez** si la sesión entró por confianza: la clave de la IA y la del correo, Equipo (invitar, cambiar un rol, quitar o devolver el acceso, reiniciar los dos pasos), Métodos de pago y Respaldos. La ventana "Confirma que eres tú" sale en cualquier pantalla, acepta una llave de repuesto y, al confirmar, el cambio sigue solo. Vale 15 minutos.
### Configuración 1.5.1 (C-291)
- **Equipo** cuenta los dispositivos de confianza de cada persona, y el dueño los quita.
### Carrito, checkout y cuenta del cliente 1.13.1 (C-291)
- La casilla de 30 días en la pantalla del número.
### Marketing 1.25.2 (C-291)
- El correo "Marcaste un dispositivo de confianza". Guardar el servidor de correo pide el número si la sesión entró por confianza.

## [1.0.0-rc.104] - 2026-11-18
Los dos pasos que se entienden (C-290), el primero del plan de Ajustes (`docs/plan/AJUSTES.md`). La contadora no supo "qué app es doble factor" ni qué hacer después: ahora la guía va dibujada, con las apps y dónde se bajan. Sin cambio de base, sin variables y sin cron.
### Marco del panel 1.17.0 (C-290)
- **Mi seguridad, la primera vez,** abre con la hoja "Así entras al panel": tu contraseña + un número de tu teléfono = entras. Después, cuatro pasos con su ícono:
  1. **Baja la app:** Google Authenticator (la recomendada), Microsoft Authenticator o Authy, con su logo y sus botones de Play Store y App Store. En la computadora, el QR de cada tienda para abrirla desde el teléfono.
  2. **Agrega Electro Shop:** el teléfono dibujado con lo que se toca en la app elegida y el QR. En el teléfono, "Abrir en la app", porque la pantalla no se puede escanear a sí misma. La clave escrita, detrás de "¿No puedes escanear?".
  3. **Escribe el número:** la app dibujada con "Electro Shop · 123 456". El error dice qué hacer ("Escribe el que ves ahora en la app").
  4. **Guarda tus llaves de repuesto** (los 10 códigos de respaldo, con su nombre nuevo) y cómo será cada entrada.
- **Ya activa:** "Tu cuenta está protegida" con el camino de cada entrada, las llaves que quedan y qué hacer si cambias de teléfono, con el WhatsApp de la tienda.
### Carrito, checkout y cuenta del cliente 1.13.0 (C-290)
- **Entrar al panel:** "Escribe el número de tu app" nombra las tres apps y dibuja cómo se ve Electro Shop en ella; el número equivocado dice qué hacer; "¿Sin el teléfono? Usa una llave de repuesto"; quien cambió de teléfono lo pide por WhatsApp. La verificación de seguridad del inicio de sesión ya no va en ámbar.
### Marketing 1.25.1 (C-290)
- La invitación al panel avisa antes lo que va a hacer falta: el teléfono y una app gratis, con los enlaces de Google Authenticator para Android y iPhone.

## [1.0.0-rc.103] - 2026-11-18
Claude en el panel: sus ajustes en Configuración y las reglas estrictas que la tienda comprueba en cada respuesta (C-288). **Cambio de base aditivo:** tres tablas nuevas (`ia_ajustes`, `ia_pedidos`, `ia_atajadas`), sin tocar las que hay. Sin variables nuevas y sin cron.
### Configuración 1.5.0 (C-288)
- **IA · Claude** (solo el dueño, con los dos pasos):
  - **El motor:** el modelo (Haiku, Sonnet u Opus 5.5, con lo que habría costado el mes con cada uno) y el esfuerzo, con "Revisar y publicar" antes → después.
  - **La clave de la API:** se prueba antes de guardarla (si no es válida o no tiene crédito, lo dice y no se guarda), queda cifrada en la base y nunca se muestra entera. "Volver a la del servidor" devuelve la del `.env`.
  - **Las instrucciones de cada uno de los seis usos**, por pasos: lo que hace y sus reglas, las instrucciones, "Probar" con un caso real (no guarda nada) y "Revisar y publicar". "De fábrica" las devuelve.
  - **Las reglas de la tienda:** lo que se comprueba en código y lo que va fijo en las instrucciones, las frases que nunca van en lo que se publica (editables) y "Lo que atajaron".
  - **Consumo y fallas:** pedidos, tokens, costo y tiempo por uso en el mes, los pedidos por día y las últimas fallas.
  - **La guía:** las cuatro reglas de oro y cómo pedirle las cosas en cada lugar, con pedidos para copiar.
### Marco del panel 1.16.0 (C-288)
- Claude toma el motor y la clave de Configuración (sin nada guardado, los del servidor, como antes) y **anota cada pedido**: el uso, el modelo, los tokens, el costo, lo que tardó y si falló. Nunca lo que se mandó ni lo que respondió.
- **Las reglas se comprueban en cada respuesta:**
  - la tienda quita sola una nota para el equipo ("Revisar antes de guardar", "Verificar con el proveedor"), emojis y enlaces de otras tiendas;
  - cambia sola "saldo" por Puntos ES y los gritos ("GRATIS SOLO HOY!!!");
  - lo que no puede arreglar se lo pide otra vez a Claude, una sola vez, diciéndole qué regla rompió. Si lo vuelve a romper, eso queda vacío y anotado.
### Productos 1.18.0 (C-288)
- **"Buscar en la web", "Completar con la web" e Importar con claude.ai** pasan por las reglas:
  - un solo modelo: con "posibles modelos" se le pide otra vez;
  - el modelo del nombre: si la ficha habla de otro, la descripción no se pone y lo dice;
  - peso y medidas posibles;
  - la descripción en español y de dos frases o más;
  - especificaciones con datos: "Potencia: alta" se quita.
- La segunda vuelta solo se pide si la búsqueda lleva menos de 30 s, porque nginx corta a los 60.
### Marketing 1.25.0 (C-288)
- "Armar con Claude": el asunto de 6 a 9 palabras y sin gritos (si no, se le pide otra vez), sin precios en el texto y solo productos de la lista.
### Clientes 1.8.0 (C-288)
- La respuesta a una consulta no pide claves ni datos de tarjeta, lleva su saludo y su firma y marca los montos que no están en los datos. La urgencia y el resumen del cliente, sin datos personales.

## [1.0.0-rc.102] - 2026-11-17
ElectroStudio pregunta a dónde va cada imagen y video, sus títulos se arrastran, y Claude investiga el modelo exacto de los productos (C-287). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### ElectroStudio 2.4.0 (C-287)
- **"¿Qué hago con la imagen / el video?":** al sacarlos se elige descargarlos, mandarlos por Telegram (los chats del bot, en Full HD y con el texto de la historia) o las dos cosas. Antes (rc.99) el video iba siempre a Telegram. Pregunta en la vista previa, en Publicar y en el inicio.
- **Los títulos de la plantilla se arrastran** con el mouse o con el dedo sobre la vista previa: el título con su modelo, los dos títulos de 2 productos, el título grande y la etiqueta de arriba. Se pegan al centro, avisan si entran en lo que tapa Instagram, se corren con las flechas y vuelven con "A su lugar". Corrido, el título queda encima de la plantilla.
- **Arreglado:** una historia creada enseguida al entrar a ElectroStudio no se guardaba ("Falta la versión con la que abriste esto").
### Productos 1.17.6 (C-287)
- **La plantilla de Importar productos** le pide a Claude investigar cada producto: el modelo exacto (leído en la etiqueta o la caja y confirmado en la web, primero el fabricante), un solo resultado sin "posibles modelos", y el peso y las medidas del paquete de ese modelo. En "notas", de dónde salió cada dato.
- **"Buscar en la web"** busca la página del modelo exacto y no mezcla datos de otros modelos o versiones.
### Marco del panel 1.15.8 (C-287)
- El bot de Telegram manda también imágenes, como archivo para que no las achique. Notificaciones ya no tiene "Video de ElectroStudio".

## [1.0.0-rc.101] - 2026-11-17
Acceso y seguridad: lo que quedó de la auditoría del 17/11 (C-285). Sin cambio de base, sin SQL, sin variables nuevas y sin cron. Sube junto con rc.100.
### Marco del panel 1.15.7 (C-285)
- **Lo que cambia algo solo se acepta si sale de la propia tienda:** un `POST`, `PUT`, `PATCH` o `DELETE` a `/api` que llega con el `Origin` de otro sitio responde 403. Los avisos de otros servidores (webhooks, Numen, el cron) y el inicio de sesión no se revisan.
- El enlace de "No fui yo" de una sesión se guarda como huella.
### Reportes y seguridad 1.1.13 (C-285)
- **La espera por contraseñas fallidas cuenta por correo y conexión juntos:** quien falla cinco veces se frena a sí mismo, y el dueño de la cuenta entra desde su conexión sin esperar. El captcha sigue saliendo desde el segundo fallo del correo, desde cualquier conexión.
### Carrito, checkout y cuenta del cliente 1.12.6 (C-285)
- **Los enlaces de activar la cuenta y de recuperar la contraseña se guardan como huella:** en la base ya no queda el valor que abre el enlace. Los enlaces que ya se enviaron siguen sirviendo hasta que vencen.
- **Pedir otro enlace de activación** responde lo mismo exista o no la cuenta, con un tope de 5 pedidos cada 15 minutos por conexión. Desde tu propia cuenta te dice lo que pasó ("Te enviamos un nuevo enlace", "Espera 40 segundos").
### Clientes 1.7.5 (C-285)
- **El formulario de contacto** acepta 10 mensajes cada 10 minutos por conexión, y el correo de "recibimos tu mensaje" sale 5 veces cada 10 minutos por conexión y 3 por hora a una misma dirección. Los mensajes se guardan igual.
- El enlace de activación que el equipo le manda a un cliente se guarda como huella.
### Cursos 1.3.2 (C-285)
- **La ficha de un creador** entrega solo lo que usa su pantalla (sin las notas del equipo), y su perfil se valida al guardarlo: los largos y la foto.
### Productos 1.17.5 (C-285)
- Un error al guardar un producto ya no devuelve el detalle interno. Las fotos que se suben desde el panel comprueban el WebP completo.
### Configuración 1.4.8 (C-285)
- El enlace de invitación al equipo se guarda como huella.
### Fuera
- `/api/public/stats`, una ruta pública que nadie usaba.

## [1.0.0-rc.100] - 2026-11-17
Dinero: lo que quedó de la auditoría del 17/11 (C-284). **Cambia la base, aditivo:** una columna (`compraId` en `orders`) y tres índices; `deploy.sh` se para y muestra el SQL. Sin SQL de datos, sin variables nuevas y sin cron.
### Órdenes y pagos 1.8.0 (C-284)
- **Una compra, una sola vez:** cada envío del checkout lleva su llave (`compraId`). Si llega dos veces (un doble toque, un reintento por la red), la tienda devuelve la compra que ya se hizo: no crea otra ni cobra otra vez. Los paquetes de una misma compra comparten la llave.
- **La referencia de un pago manual** (Zelle, transferencia…) no entra dos veces, tampoco si dos compras llegan a la vez.
- **La devolución de una garantía** toma el pedido antes de acreditar: un pedido cancelado ya devolvió su dinero y no devuelve otra vez, y varias solicitudes del mismo producto no devuelven, entre todas, más de lo que costó.
- **Un código digital** no se entrega a una orden que se canceló en ese mismo instante.
- **"Recarga por revisar"** le llega al equipo solo cuando un Pago Móvil verificado no alcanza para aprobarse solo.
- La verificación del Pago Móvil pide para qué es el pago: una compra, o una recarga con su solicitud.
- Cuando una compra o un pago confirmado agota un producto, la tienda lo muestra agotado enseguida.
- Tres índices nuevos en las órdenes (por compra, por cliente y fecha, y por estado y fecha).
### Carrito, checkout y cuenta del cliente 1.12.5 (C-284)
- **"Completar pedido" dos veces** (o un reintento con mala señal) deja una sola compra.
- **Pedir una recarga por Pago Móvil** ya no le avisa "Recarga por aprobar" al equipo: se aprueba sola al verificar el pago. Las recargas manuales siguen avisando.
- La referencia de una recarga manual no entra dos veces, tampoco si llegan a la vez.

## [1.0.0-rc.99] - 2026-11-17
Los videos de ElectroStudio enteros y también por Telegram (C-286). Sin cambio de base, sin SQL, sin variables nuevas y sin cron. Una dependencia nueva, `mp4-muxer` 5.2.2, y en `next.config.js` el tope del cuerpo de un pedido pasa a 40 MB.
### ElectroStudio 2.3.1 (C-286)
- **El video ya no se corta a los 3 s en el teléfono:** se arma cuadro por cuadro y sale un MP4 normal, con su duración completa, en Full HD y a 60 cuadros. Antes, Chrome lo grababa en trozos de 3 s y la cabecera decía 0 s.
- **También por Telegram:** al descargarlo, llega a los chats del bot de Notificaciones tal como salió, con el texto de la historia. Se apaga en Notificaciones, "Video de ElectroStudio".
### Marketing 1.24.5 (C-286)
- El video del flyer del sorteo que descarga cada cliente tampoco se corta a los 3 s.
### Marco del panel 1.15.6 (C-286)
- Notificaciones: la fila "Video de ElectroStudio" (solo por Telegram), y la categoría Marketing, que se llamaba "Campañas de correo".

## [1.0.0-rc.98] - 2026-11-17
El Dashboard nuevo, "la recepción" (C-279), que el equipo eligió viendo la maqueta el 17/11. Sin cambio de base, sin SQL, sin variables nuevas y sin cron: los tableros guardados de antes se leen solos.
### Dashboard 2.0.0 (C-279)
- **La recepción en lugar del título "Dashboard":** el saludo, la frase del día con lo que toca (o la venta de hoy), el buscador, los pasos del día con su número y el pulso de la tienda (la tasa, el corte de despachos con lo que falta y quién está en la tienda, en vivo).
- **Cada tarjeta del tamaño que quieras:** una grilla de 12 columnas, con tamaños de Mini (3 × 1) a Ancho (12 × 2) en el menú, o arrastrando la esquina para uno a la medida. El contenido se acomoda solo al tamaño. En el teléfono, los Mini van de a dos y los demás a lo ancho.
- **Personalizar:** mover arrastrando o con las flechas, el menú de tamaño, cuatro plantillas (Dueño, Ventas, Lo justo y Marketing), el cajón "Agregar" y "De fábrica". Sin tablero guardado se ve la plantilla Dueño.
- **Tres tarjetas nuevas:** el sorteo activo con su cuenta atrás, ElectroStudio de la semana con la historia sugerida, y lo que viene (el corte de hoy, la alcaldía el 10, el IVA el 15 y las fechas del sorteo).
- **Actuar desde el tablero:** "Por atender" muestra el primer pago por confirmar y el último mensaje con su botón; "Se están acabando" sube la existencia ahí mismo ("Guardar 1 → 3"); la meta del mes se cambia tocando su monto.
- **Ctrl K:** busca acciones, pantallas, productos y órdenes (por número, cliente, teléfono, cédula, referencia o guía), cada cosa con su permiso.
- **El movimiento de ElectroStudio, una sola vez:** el destello de la recepción, el saludo palabra por palabra, la corriente que enciende los pasos, las tarjetas en cascada, los íconos que se dibujan y el confeti en los azules de la marca cuando llega un pago confirmado. Quieto con "reducir movimiento".
### Contabilidad 1.3.1 (C-279)
- La hoja "Así funciona" de la mesa de la contadora sale sin Chispa: en el panel no va el personaje de la tienda.
### Carrito, checkout y cuenta del cliente 1.12.4 (C-279)
- Interno: la hoja "Así funciona" puede salir sin Chispa. En la tienda sale igual.

## [1.0.0-rc.97] - 2026-11-17
Dinero: lo más urgente de la auditoría del 17/11 (C-283). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Órdenes y pagos 1.7.3 (C-283)
- **Un Pago Móvil se reconoce escrito de cualquier forma:** con espacios, o con menos dígitos de su referencia ("5678" y "12345678"). El mismo pago no se registra dos veces, ni en una recarga ni en una compra, aunque llegue dos veces a la vez.
- **Quien vuelve a escribir su pago con menos dígitos** recupera el suyo y cierra su compra con él.
- **Cambiar el estado de una orden** va de uno en uno: dos personas (o dos clics) a la vez sobre la misma orden ya no la cancelan ni la confirman dos veces.
- **Una orden cancelada o reembolsada** ya no cambia de estado ni de pago; las notas y la guía, sí.
- La consulta del panel "¿este pago ya pasó por la tienda?" lo encuentra aunque esté guardado con otra cantidad de dígitos.
### Carrito, checkout y cuenta del cliente 1.12.3 (C-283)
- Se quitaron dos rutas que nadie usaba: la de apartar stock del carrito y una de fotos que nunca se ejecutaba.

## [1.0.0-rc.96] - 2026-11-17
La guía web y los arreglos sueltos de la auditoría del 17/11 (C-282). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Tienda 1.22.0 (C-282)
- **La tienda se puede instalar en el teléfono** ("Agregar a la pantalla de inicio"), con su ícono y a pantalla completa. La barra del navegador va en blanco, como el encabezado.
- **"Saltar al contenido"** con el primer Tab de cada página.
- Las imágenes principales usan `preload` y las demás que se ven al abrir, `loading="eager"` (`priority` está en desuso en Next 16).
### Carrito, checkout y cuenta del cliente 1.12.2 (C-282)
- **La ventana de recarga** es un formulario accesible: su nombre, etiquetas en cada campo, teclado decimal en el monto, Enter, Escape y el foco que vuelve al cerrarla.
- **Las direcciones de Mi panel** se guardan con Enter y se autocompletan con lo que el navegador ya sabe.
- "Completar pedido" ya no se queda en "Procesando" si la sesión se cerró justo al tocarlo.
### Órdenes y pagos 1.7.2 (C-282)
- **El CSV de Transacciones escapa cada texto:** una fórmula que escribe un cliente ya no se ejecuta al abrir el archivo en Excel.
- Un pedido de retiro o digital marcado "Enviada" ya no le dice al cliente "Va en camino": "Ya puedes retirarlo en la tienda" o "Tus códigos ya salieron".
### Clientes 1.7.4 (C-282)
- **El lote de gift cards impresas ya no se pierde** al salir sin cerrarlo: Gift Cards avisa que hay uno abierto y "Ver el lote" lo vuelve a abrir con sus PIN.
### Reportes y seguridad 1.1.12 (C-282)
- Los CSV de Reportes frenan las fórmulas, como el de Transacciones.
### Configuración 1.4.7 (C-282)
- El CSV de las firmas de Legal frena las fórmulas.
### Marketing 1.24.4 y Cotizaciones 1.5.4 (C-282)
- La foto del premio y del ganador de `/sorteo` y el logo del presupuesto cargan con las propiedades nuevas de Next 16.

## [1.0.0-rc.95] - 2026-11-17
Dinero y seguridad: los arreglos medios de la auditoría del 17/11 (C-280). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.12.1 (C-280)
- **Recargas de Puntos ES:** hasta 10 pedidos por hora y 3 por confirmar a la vez. Una recarga por Pago Móvil que quedó sin terminar la reemplaza la siguiente, y una referencia de pago manual no sirve para dos recargas.
- **Una recarga con un pago ya verificado no se cancela:** espera la revisión del equipo.
- **Cambiar la contraseña** cierra siempre las otras sesiones y tiene límite de intentos.
- **Si la sesión venció al pagar,** el checkout lo dice ("no se cobró nada") y lleva a entrar; sin una orden en la respuesta ya no vacía el carrito ni muestra la confirmación.
### Órdenes y pagos 1.7.1 (C-280)
- **La recarga por Pago Móvil que se aprueba sola** se compara con la tasa que vio el cliente al pedirla (vale 3 horas) y solo perdona el redondeo de Bs. 14. Lo pagado de más también va a Puntos ES.
- **Un cupón de un uso por cliente** ya no hace fallar la compra que sale en dos paquetes.
- Verificar un pago contra una recarga que ya no está por confirmar se rechaza antes de consultar al banco.
### Configuración 1.4.6 (C-280)
- **La tasa escrita a mano:** si cambia más de 50 % (un cero de más o de menos), el panel muestra antes → después y pide confirmar antes de guardarla.
### Promotores 1.3.1 (C-280)
- Aprobar o rechazar comisiones deja en la bitácora quién lo hizo, cuántas y por cuánto. Una orden deja una sola comisión aunque su pago se confirme dos veces a la vez.
### Clientes 1.7.3 (C-280)
- Una gift card con fecha de vencimiento no se canjea después de vencer, y lo dice. Al cambiar la foto de perfil se borra la anterior, con un límite de cambios por hora.
### Cursos 1.3.1 (C-280)
- El progreso solo cuenta las lecciones de ese curso: el certificado sale al completarlas. Las subidas de un creador tienen un límite por hora y el WebP se comprueba completo.
### Trabajos realizados 1.1.2 (C-280)
- Las reseñas de un trabajo se ven sin entrar a la cuenta (antes quedaban cargando para siempre), con el nombre corto de quien reseña.
### Tienda 1.21.1 (C-280)
- La ventana de recarga muestra el monto en bolívares que calculó el servidor, y no cancela una recarga cuyo pago ya se verificó.
### Marco del panel 1.15.5 (C-280)
- **Las API sin sesión responden "No autorizado" (401)** en vez de rebotar a la página de entrada: una pantalla con la sesión vencida ya no recibe una página donde esperaba datos.
- **El tiempo real** guarda cupos para el panel y tiene un tope por conexión de internet.
- **Los archivos subidos:** un archivo que no existe ya no queda guardado un año en el navegador como roto.

## [1.0.0-rc.94] - 2026-11-17
Los flujos que venden y el día del panel (C-281, la Fase 4 de la auditoría del 17/11). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.12.0 (C-281)
- **El Pago Móvil verificado ya no se pierde:** si el cliente recargó la página o se le cerró la pestaña después de verificarlo, el pago le dice "Ya tienes un Pago Móvil verificado de Bs. …" con "Usar en esta compra", y no paga dos veces.
- **Con la cuenta sin activar,** "Completar pedido" se apaga y dice por qué; la capa del pago trae "Reenviar el correo", y al volver a la pestaña después de activarla se puede pagar sin recargar.
- **El carrito sin cuenta** muestra el precio y el stock de hoy (antes, los del día en que se agregó) y dice lo que ya no se puede comprar.
- **La confirmación de la compra** abre ese pedido ("Ver mi pedido") cuando es uno solo.
### Tienda 1.21.0 (C-281)
- **"Comprar ahora" sin cuenta** deja el producto en el carrito y, al entrar o crear la cuenta, sigue al pago (antes había que volver a tocarlo).
- **Canjear gift card** y **cada curso** tienen su imagen para compartir (el curso, con su portada, su precio y su nivel).
### Clientes 1.7.2 (C-281)
- **Canjear gift card siendo nuevo:** "Crear mi cuenta gratis" ahí mismo, y el código lo espera hasta que vuelve con la cuenta, ya verificado.
- **Consultas, Solicitudes y Verificaciones** dicen el error cuando algo falla (antes no decían nada), y sus listas tienen tope: los mensajes pendientes salen todos.
### Órdenes y pagos 1.7.0 (C-281)
- **Órdenes y Transacciones buscan entre todo,** no solo entre lo cargado: por número, cliente, teléfono, cédula, referencia del Pago Móvil o guía.
- **Órdenes** suma las píldoras Listas para recoger, Canceladas y Reembolsadas: "Todas" ya es la suma.
### Cursos 1.3.0 (C-281)
- Cada curso con su imagen para compartir; si la reseña de un estudiante no se publica, se lo dice.
### Productos 1.17.4 (C-281)
- La tienda pregunta el precio y el stock de hoy de lo que hay en un carrito. Reseñas usa la pieza común del panel para los errores.

## [1.0.0-rc.93] - 2026-11-17
La lista de Clientes, sin las cifras repetidas (C-278). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Clientes 1.7.1 (C-278)
- La lista ya no lleva las cuatro cifras de arriba: repetían lo que cuentan los filtros (Todos, Nuevos, Sin activar). Las órdenes en curso siguen en cada fila y en la ficha.

## [1.0.0-rc.92] - 2026-11-16
Clientes rediseñado (C-276). **Cambia la base: una tabla nueva, `notas_cliente` (aditiva).** Sin SQL de datos, sin variables nuevas y sin cron.
### Clientes 1.7.0 (C-276)
- **La ficha de cada cliente en su propia página** (`/admin/customers/<id>`), en dos columnas:
  - arriba, quién es, sus sellos y cuatro cifras: lo gastado, sus Puntos ES, sus boletos y su último ingreso;
  - a la izquierda, lo que hay que atender y cómo compra (C-213), sus pedidos y la línea de tiempo de todo lo que pasó en su cuenta;
  - a la derecha, Confianza con "Recordarle", sus documentos y firmas con el PDF, sus datos, los avisos que recibió y quién se los mandó, lo que le interesa y las notas del equipo.
- **Los sellos de confianza** en la lista y en la ficha: correo verificado, teléfono, cédula, términos de Puntos ES firmados y empresa verificada.
- **Escribirle** por la campana, el correo o WhatsApp, por pasos y con lo que verá en cada uno: firmar los términos, activar su cuenta, sobre un pedido, su carrito o un mensaje propio.
- **La lista:**
  - busca por nombre, correo, teléfono, cédula, RIF o empresa;
  - filtra (nuevos, sin activar, con pedidos, con Puntos ES, empresas por verificar, dormidos y suspendidos);
  - dice desde cuándo es cliente y cuándo entró por última vez;
  - va de 25 en 25 con páginas.
- **Cuidar la cuenta:** notas del equipo con quién y cuándo, reenviar la activación y suspender o reactivar (con el motivo en la bitácora).
- **Editar, por pasos,** con antes → después y a quién afecta. Cambiar el correo lo deja sin verificar y le manda el enlace a la dirección nueva.
- **Borrar** solo a quien no tiene pedidos, Puntos ES, movimientos, gift cards, reseñas ni garantías (antes borraba con Puntos ES); a los demás se los suspende.
- **La ficha va en lista blanca:** sin la IP, el carrito crudo, los tokens ni la clave (antes salía la fila entera).
### Órdenes y pagos 1.6.8 (C-276)
- Una orden se abre por su dirección (`/admin/orders?orden=…`): el pedido de una garantía, la ficha del cliente y los resúmenes de Claude llevaban a una página que no existía.
### Marco del panel 1.15.4 (C-276)
- La campana del cliente muestra los mensajes del equipo con el ícono del chat.
### Reportes y seguridad 1.1.11 (C-276)
- La bitácora anota los mensajes al cliente, la suspensión y la reactivación de su cuenta y el reenvío de su activación.
### Tienda 1.20.3 (C-276)
- La lista blanca de lo que el panel ve de un cliente (`lib/dto/cliente.ts`).

## [1.0.0-rc.91] - 2026-11-16
El permiso de la lista de Verificaciones (C-277). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Clientes 1.6.4 (C-277)
- **La lista de Verificaciones** pide el permiso de clientes, como ya lo pedía la aprobación, y entrega solo los campos que muestra la pantalla.

## [1.0.0-rc.90] - 2026-11-16
El libro de ventas, con las respuestas de la contadora del 16/11 (C-230). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Contabilidad 1.3.0 (C-230)
- **El libro de ventas del mes** (Contabilidad → Libro de ventas), para el dueño y la contadora:
  - una línea por factura, con las columnas que pidió ella: fecha, número de factura y de control, RIF, nombre, total, exento, base imponible, IVA y lo retenido con su comprobante;
  - la anulada sale marcada y en cero;
  - arriba, el IVA del mes con su fecha (hasta el 15 del mes siguiente); abajo, lo que va en la declaración;
  - desde 1280 px, una tabla; más angosto, una tarjeta por factura.
- **En Excel** (un .xlsx de verdad, sin librerías nuevas): fechas y montos que se ordenan y se suman, los totales con su fórmula, la fila de títulos fija y apaisado en carta. **"Imprimir"** saca solo la hoja del libro, apaisada.
- **La tasa de la factura es la del BCV del día en que se escribe** (antes, la de la orden). Si la fecha es hoy, viene la de Configuración; si es otro día, se escribe. Una tasa con la coma corrida (más del triple o menos de un tercio de la de hoy) se rechaza.
- **Facturas dice hasta cuándo alcanza el talonario,** al ritmo de las ventas de los últimos 30 días, y al dueño, cuántas facturas pedir a la imprenta para llegar al 19/04/2027.
- **La mesa de la contadora:** el IVA dice hasta cuándo se declara, "Descargar" trae el Excel del libro y "Lo que viene" sigue el orden de sus respuestas. La primera vez que ella entra, la hoja "Así funciona" le cuenta lo que hace: revisa los libros, declara el IVA y la alcaldía y firma el cierre.
### Marco del panel 1.15.3 (C-230)
- El menú de Contabilidad suma el Libro de ventas.
### Tienda 1.20.2 (C-230)
- La regla de impresión del libro en `app/globals.css`.

## [1.0.0-rc.89] - 2026-11-16
Las entradas y salidas de ElectroStudio (C-273). Sin cambio de base (la animación va dentro de cada historia), sin SQL, sin variables nuevas y sin cron.
### ElectroStudio 2.3.0 (C-273)
- **Cada pieza elige cómo entra** (12 entradas: aparecer, subir, bajar, desde un lado, zoom, rebote, sello, girar, máquina de escribir, de borroso a nítido y barrido, o "como la historia"), **qué hace mientras está** (latido, flotar, brillo o temblor corto) **y cómo sale** (9 salidas), con el segundo en que empieza y lo que tarda.
- **La línea de tiempo:** una fila por pieza; la barra se arrastra para cambiar cuándo entra y sus bordes, cuándo empieza y cuándo termina de salir. La regla muestra cualquier segundo en la vista previa, y "Reproducir" arranca desde ahí.
- **El video dura 5, 7, 10 o 15 segundos,** termina quieto, con fundido al azul, barrido o cortina, y puede cerrar con el logo, el Instagram y la web (para los Reels).
- **Publicar avisa** si una pieza entra cuando el video ya terminó o sale antes de terminar de entrar.
- **Arreglado:** los números del paso Textos y stickers (tamaño, ancho máximo, posición y giro) se escriben tecla por tecla. Escribir "80" en el tamaño dejaba 400, y el "-" de un giro negativo saltaba a 0.

## [1.0.0-rc.88] - 2026-11-16
Los stickers de ElectroStudio (C-272). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### ElectroStudio 2.2.0 (C-272)
- **"+ Sticker"** abre la galería con 6 grupos: Ofertas (con el texto que se cambia), Flechas y trazos a mano, Llamados, los 166 íconos del pack (con buscador), Chispa (5 poses, con o sin gorro) y Navidad.
- **Cada sticker** se mueve, se agranda (hasta 1080 px de ancho), se gira y se ordena como los textos; cambia sus dos colores, y las flechas, Chispa y los adornos se dan vuelta.
- **Salen en la imagen y en el video,** con la misma revisión de lo que sale del borde o tapa Instagram.

## [1.0.0-rc.87] - 2026-11-16
Las fuentes y los estilos de los textos de ElectroStudio (C-271). Sin cambio de base, sin SQL, sin variables nuevas y sin cron. Archivos nuevos: las fuentes en `public/fonts/studio/`, cada una con su licencia.
### ElectroStudio 2.1.0 (C-271)
- **Ocho fuentes** con licencia libre, guardadas en la tienda (no se piden a otro sitio): Montserrat, Anton, Bebas Neue, Unbounded, Space Grotesk, Rubik, Caveat y Playfair Display. Se cargan solo cuando una historia las usa.
- **Nueve estilos listos** para los títulos y textos sueltos: cambian la letra, el contorno, la sombra y el fondo en un toque.
- **Resaltar con asteriscos:** "¡Feliz \*Navidad\*!" pinta la palabra en el azul de la historia.
- **"Que baje de línea solo"** con el ancho máximo en px.

## [1.0.0-rc.86] - 2026-11-16
ElectroStudio 2.0: las capas, el editor A y la ruta de seis pasos (C-270). Sin cambio de base (las capas van dentro de la historia), sin SQL, sin variables nuevas y sin cron.
### ElectroStudio 2.0.0 (C-270)
- **Seis pasos con la ruta del panel:** Contenido, Fotos, Diseño, Textos y stickers, Animación y Publicar, con su ícono, la línea que se llena y lo elegido en cada uno.
- **El editor A:** la vista previa grande y fija al lado del paso; en el teléfono, fija arriba debajo de la ruta.
- **Títulos, subtítulos y textos sueltos** encima de la plantilla: se arrastran sobre la vista previa (se pegan al centro y avisan si Instagram los tapa), se agrandan con las esquinas, con dos dedos o escribiendo los px, se giran, se ordenan, se ocultan, se bloquean y se duplican. Con el teclado, las flechas los mueven. Cada gesto se deshace de una vez.
- **Su estilo:** el color automático (blanco u oscuro según el fondo) o uno elegido, mayúsculas, cursiva, contorno, sombra, el grosor y un fondo de cinta, píldora o caja.
- **Salen en la imagen y en el video,** y la revisión avisa si uno sale del borde, queda muy chico o lo tapa Instagram.

## [1.0.0-rc.85] - 2026-11-16
El video de ElectroStudio (C-268): el error "(0 , p.recordCanvas) is not a function" y la grabación que se quedaba pegada. Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### ElectroStudio 1.2.9 (C-268)
- **Si la pestaña quedó abierta durante un deploy** y una descarga falla, dice "El panel se actualizó mientras lo tenías abierto" con **"Guardar y recargar"**, en lugar del error crudo. El editor ya no busca la grabación a través de otro archivo.
- **Si sales de la pestaña mientras graba el video,** se detiene y lo dice. Antes quedaba grabando para siempre, con los botones de descarga apagados hasta recargar.
- **El aviso "Grabando el video…"** se va al terminar, también cuando falla.
### Marketing 1.24.3 (C-268)
- **El video del flyer del sorteo,** igual: si el cliente sale de la pestaña, se detiene y le dice que vuelva a descargarlo sin salir.
### Marco del panel 1.15.2 (C-268)
- Reconoce el error de una pestaña con código de dos versiones, para decir "recarga".

## [1.0.0-rc.84] - 2026-11-16
Lo que encontró la revisión de rc.83 antes de las pruebas del teléfono (C-267). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Marco del panel 1.15.1 (C-267)
- **Mis pedidos y Puntos ES ya no se salen del teléfono.** Con filtros, la página medía el doble de la pantalla y el teléfono la achicaba (desde rc.83): el texto para el lector de pantalla de cada píldora quedaba fuera de la fila que se desliza.
### Marketing 1.24.2 (C-267)
- **El flyer, si el teléfono no abre la hoja de compartir:** se descarga y lo dice (antes no pasaba nada).
- **Si no se pudo copiar el enlace,** el aviso dice que toques «Copiar» para pegarlo en el sticker de Instagram.

## [1.0.0-rc.83] - 2026-11-15
Mi panel rediseñado (C-265). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.11.0 (C-265)
- **Mi panel, con el kit** (el equipo eligió la A, "tarjetas en rejilla", viendo las maquetas):
  - sin el marco blanco de cada página: las tarjetas van sobre el gris, en un solo nivel, junto al menú;
  - el menú es una columna de arriba abajo (antes, en una captura de página entera, quedaba a mitad);
  - WhatsApp va en la cabecera, junto a la campana (antes flotaba encima de montos y botones);
  - cada pestaña tiene su título ("Mis pedidos | Electro Shop"), y Mi panel queda fuera de los buscadores.
- **El inicio:**
  - **una sola pieza fuerte:** los boletos mientras dura el sorteo (Puntos ES en blanco) y Puntos ES en el azul oscuro sin ellos;
  - **los pedidos en curso** en dos columnas, con sus fotos;
  - **"Pedidos anteriores"** en lugar de "Últimos pedidos", que repetía los de arriba;
  - **las misiones ya cumplidas,** en una línea.
- **Mis pedidos:**
  - en dos columnas, agrupados en "En curso" y "Entregados y cancelados";
  - cada tarjeta dice qué se compró;
  - los filtros en una línea y solo cuando separan algo, y la búsqueda desde 6 pedidos.
- **El detalle del pedido:** el seguimiento y el recibo, lado a lado en la computadora.
- **Puntos ES:** los movimientos en una tarjeta y "Cómo funcionan", al lado.
- **Garantía:**
  - **las solicitudes** en dos columnas, con la foto, "Te toca responder" y "Responder";
  - **la pestaña "Info"** pasa a "Cómo funciona";
  - **solo lo físico:** los códigos y las recargas van por WhatsApp, y el servidor ya no acepta su garantía.
- **Mis códigos:** "Solo tú los ves" y "Si no funciona, te ayudamos" (antes "Encriptado" y "Garantizado"), con la ayuda por WhatsApp.
- **Las demás:**
  - Mi perfil, con sus datos lado a lado;
  - Mis documentos, Mis cotizaciones y Mis reseñas (con la foto del producto), en dos columnas;
  - Direcciones, en tres;
  - Notificaciones, con "Qué te avisamos" al lado.
- **Las ventanas:** el foco entra y vuelve a donde estaba al cerrarlas.
### Tienda 1.20.1 (C-265)
- **En Mi panel** el botón de WhatsApp no flota.
- **El aviso de cookies** tiene su capa, debajo de los cajones.
- **La recarga de Puntos ES:**
  - cerrar la firma de los términos ya no la cierra: queda con "Leer y firmar";
  - el total en bolívares va en azul, no en ámbar.
### Marco del panel 1.15.0, Órdenes y pagos 1.6.7, Productos 1.17.3, Marketing 1.24.1 y Configuración 1.4.5 (C-265)
- **Los filtros en píldoras** tienen su tamaño chico.
- **"Te toca responder"** también en la garantía del cliente.
- **Mis reseñas** recibe la foto del producto.
- **La tarjeta del sorteo** recibe los datos del inicio.
- **La ventana de firmar** devuelve el foco.

## [1.0.0-rc.82] - 2026-11-15
El boleto épico y el flyer para compartir (C-263). **Cambia la base:** una columna nueva en `sorteos`, aditiva (`ganadorCodigo`, `SIGUIENTE.md` §2). Sin variables nuevas, sin SQL de datos y sin cron.
### Marketing 1.24.0 (C-263)
- **El boleto épico** (el equipo eligió la A, "el talón", viendo las maquetas):
  - uno por cada boleto del cliente, troquelado como uno de verdad;
  - lleva el premio, su correo tapado ("así participa"), de dónde salió ("Compra ORD-2026-0041" o "Invitaste a 2 amigos") y su código ("F3E-XEP");
  - se anima una sola vez; con "reducir movimiento", quieto;
  - va en `/sorteo` ("Tus boletos", con el monto chico debajo), en Mi panel ("¡Tienes 3 boletos para la PS4!") y en el correo "¡Ganaste un boleto!", y se descarga como imagen.
  - Con más de 3, los 3 últimos y "Ver los N".
- **El código de cada boleto** sale de la compra o del par de amigos que lo originó, sin guardarlo: no cambia cuando entran boletos de otros, y el panel del sorteo lo calcula igual.
- **El flyer de estado** (la F1, "Mis boletos"):
  - una historia de 1080 × 1920 con sus boletos, la foto del premio, Chispa, el QR y el enlace corto;
  - "Compartir" en el teléfono (WhatsApp Estado, Instagram Historia o TikTok, con el enlace copiado para el sticker), "Descargar imagen" en la computadora y "Descargar video" aparte;
  - desde Mi panel y desde `/sorteo`.
- **El enlace corto para invitar:** `electroshopve.com/s/<código>` lleva a `/sorteo?invita=<código>`. No se indexa, y la vista previa al compartirlo es la de `/sorteo`.
- **Al sortear:** "Ganó el boleto F3E-XEP de an***@gmail.com" en `/sorteo`, en el correo del resultado y en el panel. El correo al ganador también lleva su código.
- **Chispa, en el correo "¡Ganaste un boleto!":** ya no dice "no hace falta comprar". Dice los dos caminos, con la compra mínima de verdad.
### Tienda 1.20.0, Carrito, checkout y cuenta del cliente 1.10.2 y ElectroStudio 1.2.8 (C-263)
- **Los boletos de cada cliente salen con lista blanca:** su correo tapado, sus códigos y su enlace corto. Nunca su id ni nada de otro cliente. En Mi panel, sin los nombres de sus amigos.
- **Bajar, compartir y grabar el video de un canvas** pasaron a `lib/studio/exportar.ts`, que usan ElectroStudio y el flyer.

## [1.0.0-rc.81] - 2026-11-15
Un amigo, dos cuentas: cuenta para quien lo invitó primero (C-264). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Marketing 1.23.0 (C-264)
- **La misma persona con dos cuentas** (el mismo teléfono, cada una con el enlace de alguien distinto) cuenta una sola vez, para quien la invitó primero.
  - Antes, los dos que la invitaban la veían como "Cuenta", y la lista que se sortea se la daba a quien había entrado antes al sorteo.
  - Ahora la pantalla de cada cliente, la lista y los avisos salen del mismo reparto: lo que se ve es lo que cuenta.
- **En "Tus boletos",** el amigo repetido dice "Ya cuenta con otra cuenta".
- **Si un participante pierde un amigo así,** le llega a la campana con sus boletos de ahora.
- **Las bases** suman: "si se registra con el enlace de dos participantes, cuenta para quien la invitó primero".

## [1.0.0-rc.80] - 2026-11-15
Los amigos invitados y los boletos del sorteo, más claros (C-262). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Marketing 1.22.0 (C-262)
- **"Invitando amigos", en "Tus boletos" de `/sorteo`:**
  - cuántos boletos se ganaron invitando, y el par que se está llenando con "Te falta 1 amigo para tu próximo boleto";
  - cada amigo con su nombre corto y su sello (Cuenta, Falta activar, Falta su teléfono o No suma) y, si hace falta, por qué;
  - "Recordarles por WhatsApp", con el mensaje listo y sin el número del amigo.
- **La tarjeta del sorteo de Mi panel** dice lo de los amigos: "2 amigos tuyos todavía no cuentan" o "Te falta 1 amigo para tu próximo boleto".
- **La campana:** cuando un amigo se une con tu enlace, cuando ya cuenta o no suma, y cada boleto ganado. Antes solo llegaba el correo del boleto.
### Clientes 1.6.3 (C-262)
- **El amigo que entró con Google** (ya activado, sin teléfono) avisa a quien lo invitó al agregar su teléfono. Antes no avisaba nunca.
### Marco del panel 1.14.2 y Carrito, checkout y cuenta del cliente 1.10.1 (C-262)
- **El ícono del boleto en la campana** y los números de los amigos para la tarjeta de Mi panel.

## [1.0.0-rc.79] - 2026-11-15
La semana del ganador del sorteo (C-254). **Cambia la base:** seis columnas nuevas en `sorteos`, aditivas (`SIGUIENTE.md` §2). Sin variables nuevas, sin SQL de datos y sin cron.
### Marketing 1.21.0 (C-254)
- **"Publicar la entrega",** en el sorteo ya hecho (Marketing → Sorteo, debajo del ganador), en 3 pasos con la vista previa al lado:
  - **la foto y el video:** la foto se sube o se toma con el teléfono, y se achica antes de subirla (una de teléfono pasaba los 5 MB). El enlace de YouTube dice si es un Short o un video, o que no es de YouTube;
  - **su nombre:** el nombre y de dónde es;
  - **revisar y publicar:** con la casilla "La persona aceptó salir en la tienda". Sin ella, no se publica.
  - Publicada, "Cambiar" y "Quitar de la tienda" (si la persona cambia de idea: se borra lo suyo, también su foto del disco, y vuelve el correo tapado). Cambiarla no alarga la semana de la bandera.
- **El servidor:**
  - exige el permiso, una foto subida del sorteo y, si hay video, un enlace de YouTube válido. Lo guarda de una sola forma (`lib/youtube.ts`);
  - el nombre, sin números ni @;
  - la foto se publica sin el EXIF (el GPS de un teléfono) y de hasta 1600 px, y la subida original se borra (nunca la foto del premio).
- **`/sorteo`, ya sorteado:**
  - el banner cuenta quién ganó: "¡Ya hay ganador!", su nombre y de dónde es, y su foto, que es la portada del video. El video se abre ahí mismo con youtube-nocookie, y antes de tocarlo no se le pide nada a YouTube;
  - sin permiso, el correo tapado y la foto del premio;
  - ya no dice "Gana una" ni "Si ganas…";
  - las bases dicen que el nombre, la foto y el video se publican solo si la persona lo acepta.
### Tienda 1.19.0 (C-254)
- **La bandera del sorteo en el inicio, por etapas:**
  - cerrado, "Resultado el 20 de diciembre" (el día, "Hoy sale el ganador"), con el calendario que pasa la hoja;
  - sorteado, "¡Ya hay ganador!" con la foto del premio y la medalla que salta;
  - con la entrega publicada, la foto de la persona y "¡Ganó una PS4!" ("¡María G. ganó una PS4!" en el teléfono), 7 días desde que se publica. Sin entrega, se va a los 7 días del sorteo.
- **La imagen para compartir `/sorteo`,** ya sorteado, dice "¡Ya hay ganador!", sin la cara ni el nombre de la persona.

## [1.0.0-rc.78] - 2026-11-15
El kit de onboarding en más lugares, y las misiones de Mi panel (C-260). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Tienda 1.18.0 (C-260)
- **Al agregar al carrito,** el aviso dice "¡Listo! Ya está en tu carrito", con el producto y "Ver carrito". Los carritos a la vista saltan una vez, para que se vea dónde quedó. "Comprar ahora" va directo al checkout, sin el aviso.
- **Las animaciones nuevas del kit:** la vuelta de las flechas de girar, la flecha que baja y la firma que se dibuja. Una sola vez, y quietas con "reducir movimiento".
### Carrito, checkout y cuenta del cliente 1.10.0 (C-260)
- **Mis códigos:** "Voltear tarjeta" es el botón principal hasta ver el código, y su ícono da una vuelta.
- **Las misiones de Mi panel** dibujan sus íconos. "¿Cómo funciona la tienda?" abre la hoja del kit con el camino en tres íconos: recargar Puntos ES, pagar al instante y recibir el pedido.
### Configuración 1.4.4 (C-260)
- **Al firmar un documento** (los términos de los Puntos ES y los demás):
  - "Baja hasta el final para firmar" mientras falta leer; tocarla baja una pantalla;
  - con el recuadro vacío, una firma de muestra se dibuja con "Firma aquí", y se va al empezar a firmar.

## [1.0.0-rc.77] - 2026-11-15
Las tres decisiones del equipo sobre los callejones que midió C-258 (C-261). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Tienda 1.17.1 (C-261)
- **"Solicitar producto" sin cuenta pide entrar antes del formulario:** "Entra para pedirlo", con "Crear mi cuenta gratis" y "Ya tengo cuenta". Los dos vuelven a la página. Antes se llenaba todo, se resolvía el captcha y el botón quedaba apagado.
- **La recarga de Puntos ES con un método manual ya no pregunta "¿Estás seguro?".** El botón dice el monto y el método ("Recargar $20,00 con Binance Pay").
### Carrito, checkout y cuenta del cliente 1.9.1 (C-261)
- **Mi panel → Garantía abre donde hace falta.** Sin garantías en curso, en "Nueva". Con alguna, en Mis solicitudes, con "Pedir garantía" arriba. Antes abría en "Info".

## [1.0.0-rc.76] - 2026-11-15
El kit de onboarding: Chispa te guía (C-257). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.9.0 (C-257)
- **El recorrido de bienvenida, rehecho** con la A que eligió el equipo:
  - **El foco:** todo se oscurece en el azul oscuro del logo menos lo que se explica, y un anillo blanco se dibuja una vez alrededor.
  - **La tarjeta:** dos palabras grandes y una frase. La placa con el ícono se dibuja y hace su gesto (la lupa busca, el carrito llega rodando, la cuadrícula se acomoda, la cuenta saluda), y la flecha de "Siguiente" invita a seguir.
  - **Chispa** se asoma por detrás de la tarjeta, con una pose por paso. Se le ven las manos, nunca tapa lo que se explica y nunca se le ve el corte. Entre un paso y otro se agacha y vuelve a asomarse.
  - **La cuenta sin activar** ve primero "Activa tu cuenta con el enlace de tu correo y ya puedes comprar".
  - **Al teclado:** el Tab ya no se sale del recorrido, y el contorno del foco solo aparece al usar el teclado.
- **La hoja "Así funciona",** la primera vez, en el checkout ("Así compras: pagas solo en el último paso") y en Puntos ES ("1 Punto ES paga $1 de compras"). Su botón abre la recarga.
### Marketing 1.20.0 (C-257)
- **"Así participas" en `/sorteo`,** la primera vez: los dos caminos con la compra primero, en tres íconos, y "Quiero participar" baja a "Cómo participar".
### Tienda 1.17.0 (C-257)
- **Las animaciones del kit** (`.onb-*` en `app/globals.css`): pasan una sola vez y, con "reducir movimiento", todo llega quieto.
- **El confeti va en los azules de la marca.** Llevaba el ámbar y el rojo de las ofertas.
### Pruebas
- **`scripts/e2e/lib.ts`** marca todas las guías como vistas (`electroweb_guias`) antes de cada prueba.

## [1.0.0-rc.75] - 2026-11-15
El estrés de cada camino del cliente, medido, y lo que estaba roto en esos caminos (C-258). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.8.4 (C-258)
- **El checkout ya no se traba con el teléfono de una cuenta vieja.**
  - Pasaba si estaba guardado sin el código del país ("0414-555-1234") o pegado a él ("+584145551234").
  - "Quién recibe" mostraba el número y a la vez pedía "Escribe tu número de teléfono", sin dónde escribirlo.
  - Ahora se lee como venezolano.
  - Si lo guardado es un fijo, el checkout pide el celular ahí mismo.
- **El login sale de una vez,** sin "Verificando sesión…" para quien no tiene sesión abierta.
- **Las pestañas** dicen "Carrito de compras", "Checkout", "Recuperar contraseña" y "Activar tu cuenta". Decían la marca dos veces o el título de la portada.
- **Con la sesión abierta, el carrito ya no se vuelve a guardar igual en cada página.** Tampoco pisa el carrito que el cliente cambió en otro dispositivo.
- **El ícono del carrito tiene nombre** para el lector de pantalla ("Carrito, 1 producto").
### Tienda 1.16.2 y Órdenes y pagos 1.6.6 (C-258)
- **"Calcula tu envío" pide la lista de ciudades de ZOOM una vez por visita.** Antes la pedía cada ficha y el carrito.
### Reportes y seguridad 1.1.10 (C-258)
- **El latido de "quién está conectado" aguanta 120 por minuto por IP** (eran 20).
  - Dos o tres personas detrás de la misma IP ya lo pasaban: el Wi-Fi de una oficina o los datos móviles.
  - El navegador mostraba un error por cada latido, y Reportes contaba de menos.
### Pruebas
- **`scripts/e2e/estres-caminos.ts`:** el estrés de 13 caminos del cliente, en el teléfono y en la computadora.
  - Mide pasos, toques, palabras, cuánto bajar, opciones, el tiempo hasta usable, los errores, las cascadas de pedidos y los enlaces muertos, con un puntaje por camino.
  - Del primer recorrido: estrés 1945 → 1697 y errores 30 → 0.
- **`fetch-mock.cjs` simula ZOOM y MRW** con `E2E_ENVIOS=simulado`.

## [1.0.0-rc.74] - 2026-11-15
Dos decisiones del equipo sobre lo de C-255 (C-256). Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Carrito, checkout y cuenta del cliente 1.8.3 (C-256)
- **El recorrido de bienvenida ya no sale en `/sorteo`.** Tapaba los pasos justo cuando la cuenta nueva volvía del registro a buscar su enlace. Sigue saliendo en el resto de la tienda.
### Marketing 1.19.1 (C-256)
- **Una sola palabra, "activar la cuenta",** como el botón del correo. Las bases decían "verifiquen su correo" y la página, "activan su correo". El aviso del panel de los invitados que no cuentan dice "sin activar la cuenta".

## [1.0.0-rc.73] - 2026-11-15
"Cómo participar" en `/sorteo`, explicado con íconos (C-255): la gente le preguntaba al equipo "¿cómo participo?, ¿a juro tengo que comprar?, ¿cómo creo mi cuenta?". El equipo eligió la B de las maquetas, con los dos caminos y la compra primero. Y dos arreglos del camino de registro. Sin cambio de base, sin SQL, sin variables nuevas y sin cron.
### Marketing 1.19.0 (C-255)
- **Cómo participar, en tres pasos unidos por un camino:**
  1. **"Crea tu cuenta gratis"**, con "Crear mi cuenta gratis" y "¿Ya tienes cuenta? Entra", que vuelven a `/sorteo`. Con la cuenta, el paso queda hecho en verde y, si falta, pide activar el correo para poder comprar.
  2. **"Gana boletos por dos caminos":**
     - Camino 1, "Compra $5 o más": 1 boleto por compra, sin límite, "Mientras más compras, más oportunidades" y "Ver productos";
     - Camino 2, "Invita a tus amigos": 2 amigos = 1 boleto, hasta 3, con tu enlace para compartir.
  3. **"Espera el 20 de diciembre".**
  - Al lado (en el teléfono, debajo), **tus boletos** con cada compra, o "Cada boleto es una oportunidad".
  - **Quien llega con el enlace de un amigo** lo ve: "Te invitó un amigo. Crea tu cuenta y actívala desde tu correo: así sumas para su boleto".
- **Los íconos entran una vez al llegar a la vista:** el camino se dibuja, la placa hace un pop, el visto se dibuja y el "+1" salta. Con "reducir movimiento", quietos.
- **"Lo que más nos preguntan":** siete preguntas con su ícono y respuestas cortas sacadas de las bases. La primera, abierta: "¿Hay más de una forma de ganar boletos? Sí, dos…".
- **En el banner:** "PlayStation 4" escrito y el logo corto de PS4 donde decía "Sony" (para Google y los lectores sigue diciendo "Sony"), y el logo de ZOOM en una píldora blanca. En la vista previa del panel, igual.
- **En las bases,** el punto de invitar empieza con "Invitando amigos" (decía "Sin comprar"); la regla es la misma.
- **La tarjeta de Mi panel,** con boletos: "suma más comprando o invitando".
### Carrito, checkout y cuenta del cliente 1.8.2 (C-255)
- **Al activar la cuenta desde el correo, vuelve a donde estaba** ("Volver al sorteo"). Antes iba al login, el login al inicio, y el sorteo se perdía. Sin la sesión abierta, el login lo lleva ahí.
### Configuración 1.4.3 (C-255)
- **El correo para activar la cuenta** lleva el regreso y, a quien llegó con el enlace de un amigo, "Te invitó un amigo al sorteo. Al activar tu cuenta sumas para su boleto".
### Marco del panel 1.14.1 (C-255)
- **La sesión se entera cuando el cliente activa su correo,** aunque lo active en otro navegador (el del correo, en el teléfono). Antes el checkout lo frenaba ("Debes verificar tu correo") hasta salir y volver a entrar.
- **Con Google:** quien entra por primera vez desde el enlace de un amigo del sorteo queda como su invitado, como con el registro por correo.
### Tienda 1.16.1 (C-255)
- Las animaciones de entrada del sorteo en `app/globals.css` (`.sorteo-*`): una sola vez, y con "reducir movimiento" no se mueven.

## [1.0.0-rc.72] - 2026-11-15
El sorteo, más atractivo (C-253): el banner nuevo de `/sorteo`, la bandera del inicio y el paso "Lo que trae" del panel. El equipo eligió cada pieza viendo las maquetas. **Cambia la base: tres columnas nuevas en `sorteos`, aditivas** (`incluye`, `lema` y `nombreCorto`). Sin variables nuevas, sin SQL de datos y sin cron.
### Marketing 1.18.0 (C-253)
- **`/sorteo`, el banner nuevo** (la C2):
  - arriba, "Gana una" y el nombre en grande, con el sello ("¡Lista para jugar!") y la etiqueta. La etiqueta es lo que va entre paréntesis en el premio: "PlayStation 4 Sony (Remanufacturada)";
  - los días que faltan junto al envío gratis, y "Quiero mi boleto", que baja a Cómo participar;
  - la foto a la derecha, sin nada encima: sus bordes se funden con la franja y ya no se ve el cuadro;
  - abajo, de lado a lado, "Lo que trae", cada cosa con su ícono.
- **El aviso de marcas:** Sony, PlayStation, PS4 y sus logos son de Sony Interactive Entertainment. Electro Shop no está afiliada a Sony, y el sorteo no está patrocinado, avalado ni administrado por Sony. Va en las bases y a la vista, debajo. Se arma con lo que dice el premio; con otra marca, va el aviso general.
- **El panel, Marketing → Sorteo:** un paso nuevo, "Lo que trae", entre "El premio" y "Cómo se gana".
  - **Lo que trae:** hasta 4 cosas, con un detalle si hace falta. El ícono sale solo, por lo que dice.
  - **El sello** y **el nombre corto de la bandera:** con PS4 o PS5 sale su logo oficial. Al lado se ve la bandera como sale en el inicio.
  - **Al cambiar el sorteo,** "Lo que cambia" también dice estas tres cosas.
  - **Un panel abierto de antes** no las borra al guardar.
### Tienda 1.16.0 (C-253)
- **La bandera del sorteo en el inicio,** mientras se puede participar. Lleva a `/sorteo`.
  - **En pantallas de 1440 px o más:** una pestaña pegada al borde izquierdo, a media altura, con la foto del premio, "¡Gánate una", el logo de PS4 y el regalo.
  - **Más angosto:** una píldora abajo a la izquierda, frente a WhatsApp.
  - **Entra una sola vez:** se desliza, da dos destellos, el regalo se mueve y se queda quieta. Con "reducir movimiento", no se anima.
  - **Al cerrar el sorteo,** se va sola. La semana del ganador es C-254.

## [1.0.0-rc.71] - 2026-11-15
Mi panel con el kit de marca, la segunda parte (C-251b): los arreglos que quedaron de C-251. Solo pantallas: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Nada desaparece y el dinero no cambia.
### Carrito, checkout y cuenta del cliente 1.8.1 (C-251b)
- **Los estados en su sello lleno:** "Por confirmar", "Rechazada" y "No completada" en Puntos ES; "Recibido" en Mis códigos; "Predeterminada" en Direcciones, en azul (lo que se destaca; el verde es lo hecho). La plataforma de un código y "Necesario para" van como datos en gris.
- **Sin ámbar:** "Escrita a mano" en Direcciones, el ícono de "Importante" en Garantía, el reloj de las reseñas en revisión y el ícono de "Recuperó la contraseña". Las estrellas se quedan.
- **"Tienes un documento por firmar"** lleva su ícono en la placa azul, como todo lo que hay que hacer.
- **Los filtros en píldoras** con su ícono, su cuenta y lo que juntan: Mis pedidos ("Por pagar o por validar"), Puntos ES, Mis reseñas y Notificaciones.
- **Direcciones:** "¿Cómo recibes tus pedidos?", ZOOM o MRW y Casa o Trabajo, con la tarjeta de opción.
- **Puntos ES:** la franja de arriba en el azul oscuro del logo. **El inicio:** "Recargado" y "Este mes" en neutro.
- **Garantía:** el punto de "te toca responder" en azul (iba en rojo) y los títulos en minúscula. **Promotores:** los botones de compartir de 44 px, y Telegram y X como botones del panel.
- **Mi perfil:** cada pestaña del ancho de un formulario, a la izquierda.
### Configuración 1.4.2 (C-251b)
- **Los documentos legales:** "IMPORTANTE…" va en el azul claro con su placa (antes, en el rojo de los errores), en la ventana de firmar y en `/terminos` y `/privacidad`. "Desplázate hasta el final" en gris.

## [1.0.0-rc.70] - 2026-11-15
Dos fallas del servidor que dejó anotadas C-249e (C-252).
### Cursos 1.2.1 (C-252)
- **Al crear un curso,** el servidor revisa lo que llega con las mismas reglas que al cambiarlo. Un precio negativo, un precio que no es número o una portada `javascript:` dan 400. Antes se guardaban.
### Trabajos realizados 1.1.1 (C-252)
- **Las fotos de un trabajo** (miniatura, antes y después) solo pueden ser de la tienda o de una dirección http(s). `javascript:`, `data:` y `//dominio` dan 400, al crear y al cambiar.

## [1.0.0-rc.69] - 2026-11-15
Mi panel (el panel del cliente) revisado a fondo, la primera parte (C-251): las fallas y lo nuevo que no le había llegado. Sin cambio de base, sin SQL, sin variables nuevas y sin cron. El dinero no cambia. Sigue C-251b, con los arreglos del kit.
### Carrito, checkout y cuenta del cliente 1.8.0 (C-251)
- **Mis pedidos trae todos los pedidos.** Antes llegaban los 25 más nuevos: con 29, decía "Todos 25", y un pedido viejo no se abría desde Puntos ES.
- **El inicio:**
  - el estado de cada pedido se llama igual que en Mis pedidos ("Por pagar", "Verificando pago", "En preparación"; antes "Pendiente" y "Pagada");
  - "Compras activas" separa lo que está por pagar de lo que se está validando;
  - los favoritos se cuentan por producto (decía "1 en tu lista de deseos" con 4);
  - la garantía que espera tu respuesta sale con el sello "Te toca responder" (decía "en revisión").
- **"Sale el…" con desde dónde** (C-234 y C-222), en una línea: en el inicio, en la tarjeta de Mis pedidos y en el detalle ("Sale el martes 17 de noviembre desde Aragua (La Victoria)").
- **"Dejar mi reseña"** en cada producto de un pedido entregado, y **Mis reseñas** en el menú para quien dejó alguna (la página no tenía ningún enlace).
- **Mis códigos:** cómo canjear cada código (lo escribe el equipo y no se mostraba); la recarga ya entregada dice "Recarga hecha" (seguía diciendo que se estaba haciendo); el plazo es el del checkout (decía "5 - 15 minutos" a cualquier hora).
- **Mis cursos:** "Ver mi certificado" abre el certificado; a 360 px la tarjeta ya no se sale; si no carga, "Reintentar".
- **Promotores:** las ventas, en una lista que se lee en el teléfono (la tabla se cortaba), y una fecha que ya pasó dice "Se acredita pronto".
- **Favoritos:** "Desde Aragua" o "Desde Portuguesa", como en la tienda.
- Fuera dos rutas de la API del cliente que ya no usaba ninguna pantalla, y los favoritos solo aceptan un producto y una acción válidos.
### Órdenes y pagos 1.6.5 (C-251)
- El seguimiento: "Por pagar" y "Falta tu pago" cuando no hay pago; "Verificando pago" en azul (esperar no es te toca); el reembolsado sin la caja vacía; "Retiras en ZOOM Barquisimeto Centro" sin "ZOOM ZOOM"; los botones de la guía de 44 px; a 360 px los pasos ya no se pegan.
### Configuración 1.4.1 (C-251)
- **Firmar un documento:** con la cédula ya registrada se firma con esa; el campo viene puesto y no se cambia (antes la constancia salía con la cédula que se escribiera).
### Productos 1.17.2 (C-251)
- Por dentro: Mis reseñas pide solo las propias, también desde una cuenta del equipo.
### Clientes 1.6.2 (C-251)
- Por dentro: el perfil le dice al menú de Mi panel si hay reseñas.
### Tienda 1.15.1 (C-251)
- Por dentro: el pedido del cliente trae la dirección de la ficha de cada producto (para "Dejar mi reseña").

## [1.0.0-rc.68] - 2026-11-15
Crear por pasos, la última entrega (C-249e): el curso y el trabajo de Servicios, en su propia página, con la tarjeta de la tienda al lado y "Revisar y publicar" al final. Con esto, los 8 formularios que eligió el equipo van por pasos. Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Las APIs que guardan no cambian; la subida de fotos suma dos tipos.
### Cursos 1.2.0 (C-249e)
- **Crear o cambiar un curso va por pasos** en `/admin/cursos/nuevo` y `/admin/cursos/<id>`: qué es, para quién (la categoría y el nivel con su tarjeta de opción), el precio y la portada, el temario y "Revisar y publicar". Al lado, la misma tarjeta de `/cursos`.
- **La miniatura se sube** (antes se pegaba su dirección).
- **Al cambiarlo,** antes → después y a cuántos inscritos toca: el precio nuevo vale para los que se inscriban, cuántas lecciones se borran y si se aprueba el de un creador.
- **Arreglos de paso:** el último módulo ya se puede quitar, y lo que el creador escribió en una lección ya no se borra al guardar el temario desde el panel.
### Trabajos realizados 1.1.0 (C-249e)
- **Crear o cambiar un trabajo va por pasos** en `/admin/servicios/nuevo` y `/admin/servicios/<id>`: qué se hizo, el video, antes y después, el testimonio y "Revisar y publicar". Al lado, la misma tarjeta de `/servicios`, y las fotos de antes y después.
- **La miniatura y las fotos de antes y después se suben** (antes se pegaba su dirección). Sin miniatura propia, la tienda usa la del video de YouTube, como antes.
### Marketing 1.17.1 (C-249e)
- **Arreglo de C-249d:** al guardar una campaña nueva, la vuelta a la lista a veces abría Promotores: Next dejaba la dirección con `#campanas#campanas`. Ahora Marketing lee el último y deja uno solo. Por precaución, una campaña guardada a mitad ya no cambia la dirección de la página.
### Marco del panel 1.14.0 (C-249e)
- **La foto que se sube en un asistente** (`components/admin/SubirFoto`), la del sorteo para todos.
- **En el teléfono,** el botón "Siguiente: …" crece en lugar de cortar el texto.

## [1.0.0-rc.67] - 2026-11-15
Crear por pasos, la cuarta entrega (C-249d): la campaña de correo y el promotor, en su propia página, con lo que verá el cliente al lado y "Revisar y publicar" al final. Van 6 de los 8 formularios; sigue C-249e (el curso y el trabajo de Servicios). Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Las APIs que guardan no cambian.
### Marketing 1.17.0 (C-249d)
- **Crear o cambiar una campaña va por pasos** en `/admin/marketing/campanas/nueva` y `/admin/marketing/campanas/<id>`: lo que dice (el asunto y la línea de la bandeja), el contenido, la prueba a tu correo y "Revisar y enviar". Al lado, la bandeja y el correo, del mismo `renderCampana` de siempre en un iframe sin scripts.
- **"Armar con Claude" sigue al principio,** en el primer paso: llena el asunto, la vista previa y los bloques sin cambiar de paso.
- **Al revisar:** a cuántos clientes llega, quiénes no y por qué, si pasa del límite del día y "Ver destinatarios". Se guarda como borrador o se envía a todos, con la confirmación de siempre. Al cambiar un borrador, antes → después.
- **"Guardar borrador"** sigue en cualquier paso. Una campaña nueva guardada a mitad ya no pide recargar para el siguiente guardado (le faltaba su versión).
- La edición entre dos personas sigue igual.
### Promotores 1.3.0 (C-249d)
- **Crear o cambiar un promotor va por pasos** en `/admin/marketing/promotores/nuevo` y `/admin/marketing/promotores/<id>`: quién es, su código (solo al crearlo), la comisión y el descuento, y "Revisar y publicar". Al lado, su código en el carrito con una compra de la tienda y lo que gana en Puntos ES, con las cuentas del servidor (sin IVA ni envío).
- **Antes de guardar, el servidor dice si pasa** (`POST /api/influencers/vista-previa`, que no guarda nada): el código libre y la cuenta. Al cambiarlo, cuántas comisiones por acreditar siguen con el % de antes y cuántas compras usaron su código.
- **Nuevo:** se puede crear en pausa, y al cambiarlo, sus notas. La edición entre dos personas sigue igual.
### Marco del panel 1.13.2 (C-249d)
- Un asistente puede llevar la vista previa más ancha (la de un correo).

## [1.0.0-rc.66] - 2026-11-15
Dos preguntas del informe de C-249b, con lo que eligió el equipo (C-250).
### Productos 1.17.1 (C-250)
- **El color de cada categoría,** que solo se ve en el panel, va solo con los azules del kit de marca: el de la marca, el medio, el oscuro del logo y el claro.
- Las que tenían morado, rosa, cian u otro color pasan al azul más parecido, sin tocar la base. Ya no hay color personalizado.
### Clientes 1.6.1 (C-250)
- **La gift card impresa:** "Se activa al pagar en caja" en el azul oscuro del logo, ya no en ámbar.

## [1.0.0-rc.65] - 2026-11-15
Crear por pasos, la tercera entrega (C-249c): el método de pago y la categoría, en su propia página, con lo que verá el cliente al lado y "Revisar y publicar" al final. Van 4 de los 8 formularios; siguen C-249d y C-249e. Solo el panel: sin cambio de base, sin SQL, sin variables nuevas y sin cron. Las APIs que guardan no cambian.
### Configuración 1.4.0 (C-249c)
- **Crear o cambiar un método de pago va por pasos** en `/admin/payments/nuevo` y `/admin/payments/<id>`: el método, la cuenta, lo que ve el cliente, el logo y el QR, y "Revisar y publicar". Al lado, el mismo panel del checkout.
- **Antes de guardar, el servidor dice si los datos pasan** (`POST /api/admin/payments/vista-previa`, que no guarda nada). Al cambiar uno, antes → después y cuántas recargas y órdenes esperan un pago con los datos de antes.
- **Arreglo:** Zinli pide el titular, que el servidor exige; antes pedía el teléfono, que no se guarda, y no se podía guardar.
### Productos 1.17.0 (C-249c)
- **Crear o cambiar una categoría va por pasos** en `/admin/categories/nueva` y `/admin/categories/<id>`: qué es, cómo se ve y "Revisar y publicar", con la casilla y el chip de la tienda al lado.
- Al cambiarla, antes → después y cuántos productos y subcategorías van con ella. "Dentro de" ya no ofrece sus propias subcategorías. La edición entre dos personas sigue igual.
### Marco del panel 1.13.1 (C-249c)
- "Lo que cambia", en el teléfono, sin cortar las palabras.

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
