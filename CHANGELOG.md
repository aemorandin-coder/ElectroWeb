# Cambios de ElectroShopVe

Cada versión que se sube a producción tiene su número, su etiqueta de git (`v1.0.0-rc.1`) y su entrada aquí. El detalle de cada tarea está en `docs/plan/estado/C-XX.md` y lo subido, con su SQL y sus pruebas, en `docs/plan/HISTORIAL.md`.

## Cómo se numera (MAYOR.MENOR.PARCHE)
- **MAYOR** (2.0.0): algo que ya funcionaba deja de funcionar igual para los clientes o para quien se conecta a la tienda: cambian direcciones públicas (`/productos/...`), el feed de productos o la API pública, una regla de negocio de `docs/plan/PLAN.md` §7, o un cambio de base borra o renombra datos.
- **MENOR** (1.1.0): algo nuevo que no rompe nada. Las tablas y columnas nuevas entran aquí.
- **PARCHE** (1.0.1): arreglos, textos y ajustes internos, sin funciones nuevas.
- **`-rc.N`** (candidata): la tienda ya vende pero falta cerrar la revisión final (`docs/plan/REVISION_FINAL.md`, en especial el dinero). `1.0.0` es la primera versión sin ese pendiente.
- Un bloque de deploy = una versión. `package.json`, esta lista y la etiqueta se actualizan en el mismo commit que arma el bloque. En el servidor, `git describe --tags` dice cuál está corriendo.
- **Por módulo (desde C-168):** cada módulo del panel lleva su propia versión en `lib/modulos.ts`, con la misma regla. Cada tarea que toca archivos de un módulo le sube la versión (`npm run check:modulos` falla si no), y esta lista agrupa los cambios por módulo (`### Productos 1.1.0 (C-169)`). La página Administración → Versiones los muestra.

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
