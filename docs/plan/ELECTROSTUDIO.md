# ElectroStudio 2.0: el plan (C-269)

> **El pedido del 16/11** (el equipo, mirando el error del video): "vamos a mejorar muchísimo la herramienta aprovechando la IA incluida". Pidió:
> - la ruta de pasos (breadcrumb) para los pasos;
> - plantillas nuevas, fuentes nuevas y stickers;
> - unas 5 mejoras para construir las historias;
> - animaciones de entrada y de salida;
> - crear títulos y subtítulos, moverlos y agrandarlos a gusto, en px.
>
> "Concentra todo tu poder para esta herramienta, rediseña y crea algo épico". Y después: "haz un plan de mejora para que no nos perdamos en todo lo que queremos construir".
>
> **Este documento es el mapa.** Cada fase es una tarea `C-*` con su rama, sus pruebas, su versión y su deploy. Lo que pide una decisión del equipo está en §6, con la opción recomendada. Las maquetas para decidir están en la PC del equipo: `~/.cache/electroshop-trabajo/c269/`.

## 1. Lo más importante
1. **Primero, el video** (C-268, hecha, rc.85): el error no se reprodujo con rc.84 en una pestaña nueva. El editor ya no lo puede dar así, y si una pestaña vieja falla, dice "Guardar y recargar". La grabación tampoco se queda pegada al cambiar de pestaña.
2. **La base de todo lo nuevo son las capas.**
   - Hoy cada texto tiene su lugar fijo en la plantilla: se escribe en un campo y la plantilla decide dónde y de qué tamaño va.
   - Con capas, un título, un subtítulo o un sticker es una pieza suelta encima de la plantilla: se toca en la vista previa, se arrastra, se agranda con las esquinas o escribiendo los px, y tiene su propia animación de entrada y de salida.
   - Fuentes, stickers, animaciones y la IA se apoyan en las capas: por eso van primero.
3. **El orden:** capas y editor nuevo → títulos, subtítulos y fuentes → stickers → animaciones → plantillas → la IA. Cada fase deja algo que se usa en producción; ninguna espera a la siguiente.
4. **Nada de lo que ya funciona se pierde** (regla 7 de `CLAUDE.md`):
   - los precios en vivo de la tienda, con la tasa BCV;
   - el enlace y el QR con su código, y Resultados;
   - la revisión antes de descargar y el guardado automático, con deshacer;
   - los lotes, la semana, la descarga en ZIP, compartir y la marca.
5. **Sin cambios en la base:** las capas viven dentro de la historia (la columna `data`, JSON). Las fuentes y los stickers son archivos de la tienda. Cada fase es un deploy sin SQL.

## 2. Cómo está hoy (rc.85, ElectroStudio 1.2.9)
| Qué | Hoy |
|---|---|
| Pasos | 4 botones con número (Contenido, Foto, Diseño, Publicar), sin la ruta de pasos del panel (`PLAN.md` §1.6) |
| Plantillas | 11: 1, 2 y 3 productos, Llegó nuevo, Gift card, Cupón, Reseña, Mensaje, Tasa BCV, Regalos por presupuesto y Felicitación |
| Fondos | 18, con miniatura; uno con tu foto y otro con la del producto |
| Textos | Fijos: cada plantilla pone el título, el modelo y el precio en su lugar. Se encogen para caber (y avisan si no caben) |
| Fuentes | Una: Montserrat (y Arial Black mientras carga) |
| Stickers | Ninguno suelto. Hay piezas fijas: el sello del descuento, el QR, el contador, Chispa en 2 plantillas |
| Animación | 5 estilos para toda la historia (Entrada, Zoom, Deslizar, Destello, Escribir). Todo entra; **nada sale**. 7 segundos fijos |
| Efectos | Reflejo, partículas y confeti |
| IA | Ninguna. "Escribirlo con los datos" arma el texto de Instagram con reglas |
| Formatos | Historia 9:16, post 4:5 y 1:1. Imagen PNG y video MP4 (WEBM en Firefox) |

**Lo que funciona bien y se queda:** el motor de dibujo propio (`lib/studio/engine.ts`, 2.900 líneas), que ya mide cada texto, elige blanco u oscuro según el fondo y graba el video del mismo dibujo.

## 3. Hacia dónde vamos
**Una historia buena en 2 minutos, sin diseñador.**
1. Se elige qué publicar (o se le pide a Claude: "las recargas de Free Fire para el fin de semana").
2. La plantilla trae los productos de la tienda con su precio en vivo.
3. Se suman un título y un subtítulo, que se mueven y se agrandan sobre la vista previa, con fuentes que no parecen de plantilla.
4. Se pegan stickers: "-30 %", una flecha a mano, Chispa señalando, "Desliza".
5. Se elige cómo entra y cómo sale cada pieza en el video, y se ve en la línea de tiempo.
6. Claude revisa que se lea, propone el gancho y escribe el texto de Instagram.
7. Se descarga la imagen o el video, con el enlace que cuenta las visitas y las compras.

## 4. Las fases
| Fase | Tarea | Qué entra | Versión de ElectroStudio |
|---|---|---|---|
| 0 | **C-268** | El video (hecha) | 1.2.9 (rc.85) |
| 1 | **C-269** | Este plan y las maquetas | (sin código) |
| 2 | **C-270** | Las capas, el editor nuevo y la ruta de pasos (hecha, rc.86) | **2.0.0** |
| 3 | **C-271** | Títulos, subtítulos y fuentes (hecha, rc.87; soltar un texto de la plantilla, pendiente) | 2.1.0 |
| 4 | **C-272** | Stickers (hecha, rc.88) | 2.2.0 |
| 5 | **C-273** | Animaciones de entrada y de salida, y la línea de tiempo (hecha, rc.89) | 2.3.0 |
| 6 | **C-274** | Plantillas nuevas | 2.6.0 |
| 7 | **C-275** | La IA en el estudio: las 5 mejoras | 2.7.0 |
| — | **C-295** | En el teléfono: pantalla completa, gestos para el dedo, 60 cuadros y el final (hecha, rc.106, 18/11; `estado/C-295.md`) | **2.5.0** |

El 2.0.0 va en C-270 porque cambia la forma de trabajar (los pasos y el editor). Lo demás suma sin romper. C-287 tomó la 2.4.0 y C-295 la 2.5.0: las plantillas y la IA pasan a 2.6.0 y 2.7.0.

**El 18/11 (C-295):** el equipo pidió ElectroStudio "espectacular en el teléfono, nativa y a 60 fps", los ajustes "touch friendly" y un final que diga qué hacer. Eligió seguir dentro del panel, sin app aparte. Lo que sigue de esas ideas (los gestos que faltaron, "Para hoy", el fondo de Claude, "Programar" y las seis opciones nuevas) está en `PLAN.md` §5.2, bajo C-295.

### Fase 2 · C-270 · Las capas, el editor nuevo y la ruta de pasos (hecha el 16/11, `estado/C-270.md`)
**Qué entra:**
- **Las capas en la historia** (`capas`, hasta 20): cada una es un texto o un sticker, con su lugar, tamaño, giro, color y animación. Se guardan con la historia y se copian al duplicarla.
- **Tocar y mover sobre la vista previa:**
  - tocar elige la capa (con su recuadro); arrastrar la mueve;
  - las esquinas la agrandan o la achican, y el asa de arriba la gira;
  - **las guías:** al acercarse, se pega al centro, a los bordes y al límite de lo que tapa Instagram (la línea azul aparece y se va);
  - **con el teclado:** las flechas la mueven 1 px (con Mayús, 10 px), Supr la borra, Ctrl+D la duplica y Esc la suelta;
  - **en el teléfono:** un dedo la mueve y dos dedos la agrandan y la giran;
  - **cada gesto es un solo paso de deshacer** (hoy se agrupa lo que se escribe; con las capas, de soltar a soltar).
- **El orden de las capas:** adelante, atrás, ocultar, bloquear y duplicar, en la barra de la capa elegida.
- **La ruta de pasos (breadcrumb)**, la misma del panel y del checkout (`components/admin/Pasos`, §1.6):
  - cada paso con su ícono del pack, la línea que se llena y el check al terminarlo;
  - en el teléfono, "Paso N de M", lo que sigue y "Ver pasos".
  - **Los pasos** (decisión D1): Contenido · Fotos · Diseño · Textos y stickers · Animación · Publicar.
- **El editor** (decisión D2): la vista previa más grande, al lado (en la computadora) o arriba y fija (en el teléfono), con la barra "+ Título · + Subtítulo · + Sticker" siempre a mano.

**Cómo se prueba:**
- mover, agrandar y girar con el ratón, con el teclado y con dos dedos (Chrome en modo teléfono);
- que la imagen y el video salgan igual que la vista previa, en los 3 formatos;
- que una historia vieja (sin capas) se abra y se descargue igual que antes;
- a 360, 768, 1024 y 1440 px.

### Fase 3 · C-271 · Títulos, subtítulos y fuentes (hecha el 16/11, `estado/C-271.md`; soltar un texto de la plantilla, pendiente)
- **"+ Título" y "+ Subtítulo"** (y "+ Texto"), cada uno con un estilo listo:
  - **Título de oferta:** grande, en mayúsculas, con contorno;
  - **Subtítulo:** mediano, en una cinta del color de la marca;
  - **Precio:** el número grande con los decimales chicos arriba, como el de la tienda (`$8,25`), en vivo si sale de un producto;
  - **Etiqueta** (en una píldora), **Llamado** ("Escríbenos") y **Nota a mano**.
- **El tamaño en px:**
  - con el campo (de 12 a 400 px, sobre los 1080 de ancho de la imagen), los botones − y + y las esquinas;
  - el ancho máximo hace que el texto baje de línea.
- **El estilo:**
  - el color: los de la marca, blanco, el oscuro, el rojo de las ofertas o uno propio;
  - el contorno, la sombra y el fondo (píldora, cinta o caja);
  - mayúsculas, cursiva, el peso, la alineación, el interlineado y el espacio entre letras;
  - **resaltar con asteriscos:** "Feliz \*Navidad\*" pinta la palabra en el color de acento, como ya hace el Mensaje.
- **Las fuentes nuevas** (decisión D3): unas 10, locales y con licencia libre (OFL), en `public/fonts`. Se cargan solo cuando una historia las usa: la tienda no pesa más.
  - La del logo (Tektrron) no tiene tildes ni ñ (se vio en la maqueta): si entra, es solo para "ELECTRO SHOP".
- **Soltar un texto de la plantilla:** el título o el modelo de la plantilla pasa a ser una capa, en el mismo lugar y del mismo tamaño, para moverlo. La plantilla deja de dibujarlo, y "Devolver a la plantilla" lo regresa.
- **Los textos siguen avisando** si no caben o quedan diminutos (C-116), también los de las capas.

### Fase 4 · C-272 · Stickers (hecha el 16/11, `estado/C-272.md`)
Unos 50, dibujados con las reglas del pack (trazo redondo, rellenos planos, un solo acento) en lugar de clipart, en 6 grupos (decisión D4):
1. **Ofertas,** con el texto que se cambia: "-30 %", "OFERTA", "NUEVO", "2x1", "ÚLTIMAS UNIDADES", "ENVÍO GRATIS", "HOY", "ORIGINAL". En estrella, sello redondo, cinta, etiqueta de precio o globo.
2. **Flechas y trazos a mano:** flecha curva, flecha en lazo, el círculo para encerrar algo, el subrayado, el destello y las rayitas de "¡mira!".
3. **Llamados:** "Desliza", "Toca el enlace", "Escríbenos al WhatsApp", "Comenta QUIERO" y "Guarda esta historia", cada uno en su píldora con su ícono.
4. **Íconos del pack:** los 166, en su placa (hoy las historias usan 33).
5. **Chispa:** las 5 poses, con y sin gorro, en cualquier plantilla y en cualquier lugar (hoy, solo en Mensaje y Felicitación).
6. **Navidad y fechas:** el gorro, la estrella, el regalo, el copo, la esfera y el sello "Feliz Navidad".

**Además:** un buscador, los usados hace poco, y los logos de pago que ya tiene la marca.

### Fase 5 · C-273 · Animaciones de entrada y de salida (hecha el 16/11, `estado/C-273.md`)
La línea de tiempo quedó en el panel del paso Animación (no debajo de la vista previa: en el teléfono la vista previa va arriba y fija), y la salida de toda la historia es fundido, barrido o cortina.
- **Por capa:**
  - **la entrada,** 12 a elegir: aparecer, subir, bajar, desde un lado, zoom, rebote, sello (cae grande y se asienta), girar, máquina de escribir, de borroso a nítido, barrido y letra por letra;
  - **la salida,** 9 a elegir: desvanecer, subir, bajar, hacia un lado, encoger, zoom hacia afuera, barrido y caer;
  - **un énfasis opcional** mientras está: latido, flotar, brillo o un temblor corto;
  - **cuándo:** en qué segundo entra, cuánto tarda y cuándo sale (o "al final").
- **Para toda la historia:**
  - los 5 estilos de hoy, como están;
  - **la salida del conjunto** en el último segundo: todo se desvanece, sube o se barre;
  - **el cierre con el logo** (opcional): el último segundo en el azul de la marca, con el logo, @electroshopgre y la web. Sirve para Reels.
- **La duración del video:** 5, 7, 10 o 15 segundos.
- **La línea de tiempo** debajo de la vista previa:
  - una fila por capa con su barra (de la entrada a la salida), que se arrastra para cambiar los tiempos;
  - reproducir, pausar y llevar la aguja a un segundo.
- **El video sale igual que la vista previa:** el mismo dibujo, cuadro a cuadro.

### Fase 6 · C-274 · Plantillas nuevas
Pensadas para lo que vende la tienda hoy (herramientas, electricidad, gift cards y recargas). El equipo elige cuáles y en qué orden (decisión D5):
1. **Lista de precios:** hasta 6 renglones con el nombre y el precio en vivo. Las recargas de Free Fire, los Robux, los rollos de cable.
2. **Combo:** 2 o 3 productos juntos, con el precio de los tres y "Ahorras $…". Por ejemplo, el taladro, la batería y el cargador Emtop de 20 V.
3. **Antes y después:** dos fotos con la línea que se arrastra, para los trabajos del taller (Servicios).
4. **¿Cuál prefieres?:** dos productos cara a cara, con el lugar libre para la encuesta de Instagram.
5. **Cuenta regresiva:** los días que faltan, en grande. Para el sorteo (20 de diciembre), el corte de Navidad o una oferta.
6. **Lienzo libre:** solo el fondo y tus capas, para avisos, eventos o una foto del local.

Ya estaban en `PLAN.md` §5.2 (C-193) sin elegir: "Fecha límite y gift card", "Antes y después" y "¿Cuál prefieres?".

### Fase 7 · C-275 · La IA en el estudio: las 5 mejoras
Con el Claude del panel (`lib/ia/claude.ts`, Claude Haiku 5.5, como "Armar con Claude" de las campañas, C-217).
- **Las reglas de siempre:**
  - los precios, las fotos y los enlaces los pone la tienda, nunca la IA;
  - lo que escribe llena el editor y nada se publica sin que una persona lo revise;
  - sin emojis, en "Puntos ES", y sin prometer lo que la tienda no cumple.
- **Las cinco** (el equipo elige el orden, decisión D6):
1. **"Armar con Claude":** escribes el objetivo ("las recargas de Free Fire para el fin de semana") y arma la historia entera:
   - la plantilla y los productos reales;
   - el título y el subtítulo como capas, y los stickers;
   - el fondo, la animación y el texto de Instagram.
2. **"Ideas de título":** 3 ganchos para el título y el subtítulo de la historia abierta, cada uno con otro ángulo (el precio, la urgencia, el beneficio). Un toque y queda puesto.
3. **El texto de Instagram con Claude:**
   - con los datos reales: el precio en dólares y en Bs, el envío, los pagos, el enlace y el WhatsApp;
   - los hashtags y el texto alternativo de la imagen (para quien no ve);
   - "Con los datos" (el de hoy, sin IA) sigue como respaldo.
4. **"Revisión de Claude":** Claude mira la imagen de verdad y dice qué arreglar:
   - por ejemplo, "el precio se pierde en el fondo", "el título tapa la foto", "demasiado texto" o "Instagram tapa el logo";
   - cada arreglo que se puede hacer solo trae su botón "Arreglar" (mover, agrandar, cambiar el color).
5. **"Acortar con Claude":** los textos que el motor marca como "no cabe" o "diminuto" traen 3 versiones más cortas que dicen lo mismo.

**Si se quiere una sexta:** "Tres versiones", que hace tres variantes de la historia (otra plantilla, otro fondo, otro gancho) en un lote, para probar cuál vende más con Resultados.

## 5. Cómo se construye (para Claude)
- **Las capas** (`lib/studio/schema.ts`): `capas: z.array(capaSchema).max(20)`, con `default([])`. Una historia vieja se abre igual.
  - **Lo común a cada capa:** `id`, `tipo` (`texto` | `sticker`), `x` e `y` (el centro, de 0 a 1 del lienzo: sobrevive al cambio de formato), `tamano` (px sobre 1080 de ancho), `giro` (grados), `opacidad`, `oculta` y `bloqueada`.
  - **La animación:** `entrada` y `salida` (`{ tipo, inicio, duracion }`) y `enfasis`.
  - **Un texto:** `texto` (hasta 200), `fuente`, `peso`, `cursiva`, `mayusculas`, `color`, `contorno`, `sombra`, `fondo`, `alinear`, `anchoMax`, `interlineado`, `espaciado` y `estilo` (el que se eligió).
  - **Un sticker:** `sticker` (id del catálogo), `texto` (si lleva), `color` y `color2`.
  - **El servidor** valida todo con el mismo esquema: los ids de fuentes y stickers son de una lista cerrada y los colores son `#RRGGBB`.
- **El dibujo** (`lib/studio/engine.ts`):
  - las capas se dibujan después de la plantilla y antes del confeti, en coordenadas del lienzo;
  - cada capa calcula su instante con su entrada, su énfasis y su salida;
  - `capasDibujadas()` devuelve la caja de cada una (centro, ancho, alto y giro) para tocarla en la vista previa;
  - los textos de las capas pasan por la misma medida de "no cabe" y "diminuto".
- **Tocar y mover** (`app/admin/(dashboard)/studio/_components/Lienzo.tsx`, nuevo):
  - una capa transparente encima del canvas, con eventos de puntero (ratón, dedo y lápiz);
  - las asas se dibujan en HTML, no en el canvas, para que no salgan en la imagen;
  - durante el gesto, `update(…, { history: false })`; al soltar, un solo paso en el historial.
- **Las fuentes** (`lib/studio/fuentes.ts`): la lista cerrada con su archivo y sus pesos. `FontFace` carga cada una al usarla; antes de descargar se esperan todas las de la historia. Los archivos van en `public/fonts/studio/` con su licencia (OFL) al lado.
- **Los stickers** (`lib/studio/stickers.ts`): cada uno es un dibujo con Path2D, sin imágenes de afuera (el canvas no se "ensucia" y se puede descargar).
  - Los íconos salen del pack: `scripts/studio-iconos.py` pasa a generar los 166.
  - Chispa usa las imágenes de `public/images/studio/chispa-3`.
- **El tiempo:** `DURATION` deja de ser fija: `duracion` en la historia (5, 7, 10 o 15) y la grabación la usa. La vista previa y el video usan la misma función.
- **La IA** (`app/api/admin/studio/ia/*`): con permiso `MANAGE_CONTENT`, un límite por minuto y `pedirJSON` con esquema, con las opciones como listas cerradas (plantillas, fondos, stickers, fuentes y animaciones).
  - **La revisión** manda la imagen achicada (540 px de ancho, JPEG): `pedirJSON` suma la imagen al pedido.
  - **"Armar con Claude"** elige los productos entre los candidatos de la tienda, como C-217, y la historia se arma con `linkProduct`: el precio sale de la base.
- **Las pruebas** de cada fase: un guion `scripts/e2e/_tNNN.ts` sobre la tienda de prueba, con Chrome sin ventana (perfil propio) y Firefox; la IA, con el Claude simulado de C-213.

## 6. Decisiones del equipo
**Decididas el 16/11:** el equipo eligió lo recomendado en las seis, viendo las maquetas (`~/.cache/electroshop-trabajo/c269/index.html`, con la demo de mover y agrandar):
- **D1:** los seis pasos;
- **D2:** el editor A;
- **D3:** las 8 fuentes propuestas (Montserrat, Anton, Bebas Neue, Unbounded, Space Grotesk, Rubik, Caveat y Playfair Display);
- **D4:** los 6 grupos de stickers, con el trazo del pack;
- **D5:** las 6 plantillas, en el orden de la Fase 6;
- **D6:** las 5 mejoras de la IA, en el orden de la Fase 7. "Tres versiones" queda para después.

Lo que se preguntó, con la opción recomendada primero:
- **D1 · Los pasos:**
  - **A (recomendada):** Contenido · Fotos · Diseño · Textos y stickers · Animación · Publicar. Seis pasos, uno por idea.
  - **B:** cuatro, como hoy (Contenido · Fotos · Diseño · Publicar), con los textos, stickers y animación dentro de Diseño.
- **D2 · El editor:**
  - **A (recomendada):** los pasos arriba, el panel del paso a la izquierda y la vista previa grande a la derecha, con la barra "+ Título · + Subtítulo · + Sticker" encima. En el teléfono, la vista previa arriba y fija.
  - **B:** como Canva: las herramientas en una columna a la izquierda, la vista previa al centro y lo de la capa elegida a la derecha. Más espacio para la vista previa y más pantallas que aprender.
- **D3 · Las fuentes:** cuáles de las propuestas (en la maqueta, con textos de verdad de la tienda).
- **D4 · Los stickers:** los grupos y el estilo (la maqueta muestra una hoja de cada grupo).
- **D5 · Las plantillas nuevas:** cuáles de las 6 y en qué orden.
- **D6 · La IA:** el orden de las 5 mejoras y si va la sexta ("Tres versiones").

## 7. Lo que no entra (por ahora)
- **El plan semanal automático:** quedó fuera el 28/09 (`PLAN.md` §7). "Armar con Claude" arma una historia cuando se le pide; no publica ni planifica solo.
- **Música y voz en el video:** el video sale sin sonido, como hoy (Instagram pone la música). Si se quiere, es otra tarea.
- **Fotos hechas por IA y quitar fondos con IA:** Claude no edita imágenes. Sigue el recorte del fondo blanco de hoy.
- **Varias escenas en un video** (una pantalla por producto): después de C-273, si la línea de tiempo funciona bien.
- **Publicar directo en Instagram:** pide la API de Meta y una cuenta de empresa conectada. Se ve aparte.

## 8. Riesgos y cómo se evitan
- **El teléfono:** más capas, más dibujo por cuadro. Las capas se miden una vez por cambio, no en cada cuadro, y el fondo sigue guardado como hoy. Se mide en un teléfono de gama baja con Chrome en modo lento.
- **Que no se lea:** el texto elige blanco u oscuro según el fondo (ya lo hace la plantilla) y la revisión avisa del contraste bajo, con o sin IA.
- **Las fuentes:** solo con licencia libre y su archivo de licencia al lado, y ninguna desde un servidor de afuera (el canvas se "ensuciaría" y no se podría descargar).
- **Las historias guardadas:** se abren igual; las capas empiezan vacías.
- **Una pestaña con dos versiones:** C-268 ya dice "Guardar y recargar". El editor nuevo usa lo mismo en cada descarga.
- **La IA:** si no hay clave o no responde, el estudio funciona igual sin ella, y cada botón dice por qué no pudo.

## 9. Cómo sabemos que salió bien
- **El tiempo para hacer una historia,** medido con el guion de la prueba: hoy unos 6 minutos (elegir, fotos, diseño, texto); la meta, 2.
- **Cuántas historias se publican por semana:** se ve en la lista y en la semana.
- **Lo que venden:** Resultados ya cuenta las visitas y las compras de cada historia. La meta es que las de 2.0 vendan más que las de antes, con la misma regla de medir.
