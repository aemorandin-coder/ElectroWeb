# 6. Piezas para redes y sus medidas

Cada pieza es una página en `piezas/` y se saca con `captura.mjs`:
```bash
node herramientas/captura.mjs <pagina.html[?parámetros]> salida/<archivo>.png <ancho> <alto> [escala] [t]
```
Con `t` al final sale con fondo transparente.

## Instagram
| Pieza | Medida | Lo importante | Ejemplo |
|---|---|---|---|
| **Reel** | 1080 x 1920, 30 fps (24 si lleva clips de Flow), H.264, AAC 192k, -14 LUFS | Subtítulos abajo, pero no en el último 15 % (ahí van los botones de Instagram) | `videos/` |
| **Portada del reel** | 1080 x 1920 | Lo importante en el **centro 1080 x 1440**: es lo que se ve en la cuadrícula del perfil | `piezas/portada-andres-chispa.html` |
| **Portadas de historias destacadas** | 1080 x 1920 | Solo cuenta el **círculo del centro**. Sin texto: el nombre va debajo, en Instagram | `piezas/destacada.html` |

**Cada reel se entrega con su portada, de una vez** (regla de Andrés del 11/10). La portada lleva el título corto del reel, a Chispa o una cara real, y el logo. Se puede usar un cuadro del video de fondo (`ffmpeg -ss 12 -i reel.mp4 -frames:v 1 fondo.jpg`).

### Las destacadas
Fondo azul de marca, Chispa grande y un ícono de línea. Se cambian por parámetros:
```bash
node herramientas/captura.mjs "piezas/destacada.html?pose=saluda&ojos=feliz&icono=camion" salida/2_Envios.png 1080 1920
```
Íconos: `carrito`, `camion`, `telefono`, `llave`, `rayo`, `chip`, `escudo`, `estrella`, `cursos`, `chat`. Con `color=%23...` cambia el color del ícono.

Las diez que se hicieron:

| Destacada | Parámetros |
|---|---|
| Productos | `pose=señala&boca=e&cejas=arriba&icono=carrito` |
| Envíos | `pose=saluda&ojos=feliz&icono=camion` |
| Pagos | `pose=pulgar&ojos=guino&icono=telefono` |
| Servicio técnico | `pose=piensa&boca=sonrisa&cejas=duda&icono=llave` |
| Energía | `pose=explica&boca=a&icono=rayo` |
| Software | `pose=señala&boca=sonrisa&icono=chip` |
| Garantía | `pose=brazos&boca=sonrisa&icono=escudo` |
| Clientes | `pose=celebra&ojos=feliz&icono=estrella` |
| Cursos | `pose=hombros&boca=o&cejas=arriba&icono=cursos` |
| Contacto | `pose=habla&boca=a&icono=chat` |

Consejo de Andrés: "sin sobrecargar". Un personaje, un ícono y nada más.

## YouTube
| Pieza | Medida | Lo importante | Ejemplo |
|---|---|---|---|
| **Video** | 1920 x 1080 (`VIEWPORT=960x540` en `render.mjs`) | El mismo guion que el reel, con la composición a lo ancho | `videos/ficha-yt.src.html` |
| **Miniatura** | 1280 x 720 (menos de 2 MB) | Texto grande y corto, cara de Chispa; la esquina de abajo a la derecha la tapa la duración | `piezas/miniatura-ficha.html` |
| **Banner del canal** | 2560 x 1440 | Lo que se ve en todas partes es el **centro 1546 x 423**; en computadora se ve una franja de 2560 x 423 | `piezas/banner-youtube.html` |

- **Pantalla final:** los **últimos 10 s** del video se dejan tranquilos (fondo y poco texto), porque YouTube pone ahí las tarjetas de "ver otro video" y "suscribirse". Por eso la versión de YouTube de la ficha dura 12 s más (`EXTRA=12` en `sonido-ficha.py`).
- **Capítulos:** en la descripción, empezando en `0:00`, y cada uno de **10 s o más**.

Para el banner se sacan las tres medidas:
```bash
node herramientas/captura.mjs piezas/banner-youtube.html salida/banner.png 2560 1440
ffmpeg -i salida/banner.png -vf "crop=2560:423:0:508" salida/banner-computadora.png
ffmpeg -i salida/banner.png -vf "crop=1546:423:507:508" salida/banner-telefono.png
```

## WhatsApp: stickers animados
| Pieza | Medida | Lo importante | Ejemplo |
|---|---|---|---|
| **Sticker animado** | 512 x 512, WebP animado, **menos de 500 KB**, 10 s como máximo | Fondo transparente, 16 px de margen, borde blanco recortado (se lee en chats claros y oscuros), bucle que empalma | `piezas/sticker.html` |

```bash
# el paquete completo (cada uno saca .webp para WhatsApp y .gif para las apps de stickers del teléfono)
for s in hola gracias pago revisar direccion reparacion; do node herramientas/sticker.mjs "piezas/sticker.html?s=$s" salida/stickers/$s.webp; done
# ícono de bandeja del paquete: 96 x 96, Chispa sin globo
node herramientas/captura.mjs "piezas/sticker.html?s=hola&globo=0" salida/stickers/bandeja.png 512 512 0.1875 t
```

| Sticker | Texto | Escena | Qué se mueve |
|---|---|---|---|
| `hola` | ¡Hola! | saluda con la mano | la mano |
| `gracias` | ¡Gracias! | pulgar arriba al lado de la cara, guiño | el pulgar |
| `pago` | ¡Pago recibido! | detrás del mostrador, con una miniimpresora que saca el recibo; pulgar arriba | el recibo (sale, le aparece el cheque, lo arranca) y el pulgar |
| `revisar` | Déjame revisar… | lupa frente al ojo, con el ojo agrandado adentro | la mirada, la lupa y los puntos |
| `direccion` | Nuestra dirección es: | señala un pin de ubicación | el índice y el pin |
| `reparacion` | Aún en reparación | detrás del mostrador, aprieta con una llave la tuerca de un control | la llave y unas chispitas |

- Un sticker nuevo es una entrada más en `STICKERS` (dentro de `piezas/sticker.html`): líneas del globo, expresión, brazos y qué se mueve. Con dos líneas, Chispa se achica para dejarle sitio al globo.
- **Manos sin amontonar.** Cada mano hace una sola cosa y no se pegan al pecho. Si una mano no hace nada, se esconde (detrás del mostrador o del aparato). Pedido del 12/10.
- **Gesticular con objetos** cuando el texto lo permite: el aparato va con `e.entre` (entre los dos brazos), lo que agarra la mano con `objeto` y la mano izquierda de frente con `espejo` (ver `02-chispa-el-personaje.md`). El mostrador tapa el cuerpo en las escenas (`corte: 390`).
- "Nuestra dirección es:" va sin la dirección: no se leería a ese tamaño y el cliente no la puede copiar ni abrir en el mapa. Se manda el sticker y después la ubicación.
- La página sigue el mismo contrato que los videos (`DURATION`, `seek`, `ready`), y `DURATION` es **un ciclo**: el último cuadro empalma con el primero.
- **El peso depende de cuánto cambia entre cuadros, no de la calidad.** El WebP guarda en cada cuadro solo el rectángulo que cambió. Con la cabeza, el cuerpo y el globo moviéndose a la vez, ese rectángulo es casi todo el sticker y pesó 1,7 MB. Con solo la mano (y un parpadeo), 245 KB con calidad 80. Lo que se mueve tiene que quedar junto.
- **`sticker.mjs` graba con `--disable-gpu`.** Con la GPU, el borde blanco (desenfoque más umbral) salía un poco distinto en cada cuadro, aunque nada se moviera ahí. El WebP tenía que volver a guardar el cuadro entero: "reparación" pesó 835 KB, y sin GPU 219 KB.
- El primer cuadro tiene que verse bien solo: es el que aparece donde el sticker no se anima.
- Textos cortos y grandes (Poppins 800): en el chat el sticker se ve de unos 170 px.
- Un paquete de WhatsApp lleva de 3 a 30 stickers y un ícono de bandeja de 96 x 96 PNG (menos de 50 KB).

## Ícono de la carpeta (Windows)
`mascota/chispa.ico`: la cara de Chispa saliendo de su círculo, en 7 tamaños (16 a 256 px) para que se vea nítida en cualquier vista del Explorador. Fuente: `piezas/icono.html`.
```bash
for s in 256 128 64 48 32 24 16; do node herramientas/captura.mjs piezas/icono.html salida/icono/$s.png 512 512 $(python -c "print($s/512)") t; done
python -c "from PIL import Image; S=[256,128,64,48,32,24,16]; ims=[Image.open(f'salida/icono/{s}.png') for s in S]; ims[0].save('mascota/chispa.ico', format='ICO', bitmap_format='bmp', sizes=[(s,s) for s in S], append_images=ims[1:])"
```
Para ponerlo en la carpeta: `desktop.ini` en `chispa/` con `IconResource=mascota\chispa.ico,0` (ruta relativa: sigue funcionando si se mueve la carpeta), `attrib +s +h desktop.ini` y `attrib +r` a la carpeta. `desktop.ini` no se sube (está en `.gitignore`).

## Textos para publicar
Cuando Andrés pide la descripción de Instagram:
- un gancho en la primera línea, que es lo que se ve sin abrir;
- 3 o 4 líneas cortas con lo que hace la empresa;
- el llamado (web y WhatsApp);
- de 10 a 15 hashtags, mezclando Venezuela y Guanare con el tema (#tecnologiavenezuela, #guanare, #portuguesa...).

Sin emojis, como en todo lo demás.
