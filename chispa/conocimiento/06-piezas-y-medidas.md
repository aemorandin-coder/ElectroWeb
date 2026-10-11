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

## Textos para publicar
Cuando Andrés pide la descripción de Instagram:
- un gancho en la primera línea, que es lo que se ve sin abrir;
- 3 o 4 líneas cortas con lo que hace la empresa;
- el llamado (web y WhatsApp);
- de 10 a 15 hashtags, mezclando Venezuela y Guanare con el tema (#tecnologiavenezuela, #guanare, #portuguesa...).

Sin emojis, como en todo lo demás.
