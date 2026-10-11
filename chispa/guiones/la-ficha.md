# Guion: "La ficha de Electro Shop" (v2, 09/10)

Reel de 89 s (y versión de YouTube de 1:38) con Chispa hablando, voz Diego de ElevenLabs. Es el texto que **realmente** dijo la voz (sale de `assets/voz/chispa-ficha.json`); la línea de tiempo de `videos/ficha.src.html` (GSAP, con `W('palabra', bloque)`) está atada a estas palabras.

| Bloque | Lo que dice Chispa | Lo que se ve |
|---|---|---|
| 0. Gancho | ¿Electro Shop? Seguro nos conoces por la tienda web, pero eso es solo una parte. | La tienda web y el sello "solo una parte" |
| 1. La ficha | Te presento la ficha completa. Electro Shop Morandin: una empresa de Guanare con 14 años en tecnología. Lo nuestro: tecnología, desarrollo y soporte. | La ficha que se escribe (Electro Shop Morandin, Guanare, 14 años) y los tres pilares |
| 2. Vendemos | Primero, vendemos tecnología, gaming, gift cards y recargas, energía UPS e inversores, y los instalamos. Pago y envíos: Pagas con Pago Móvil y envíos a toda Venezuela con ZOOM y MRW. | Fondo azul. Cada línea aparece cuando la nombra; Energía con UPS e Inversores y el sello "lo instalamos". Después Pago Móvil y envíos con ZOOM y MRW |
| 3. Reparamos | Segundo, reparamos. Nuestro taller, con ingeniero, le da mantenimiento a consolas, arma PC gamer e instala cámaras, redes y puntos de venta. | El taller, el sello "con ingeniero" y la lista de servicios |
| 4. Desarrollamos | Y tercero, lo que casi nadie sabe: desarrollamos software. Este es L2 Control. Maneja el restaurante, la caja, el inventario y los permisos de todo tu equipo. | Fondo azul, sello de secreto, la tarjeta de L2 Control con sus módulos y una pantalla real |
| 5. Quién lo usa | ¿Y quién lo usa? Abby Kingdom, en Guanare, ya opera todo su negocio con L2 Control. | El logo de Abby Kingdom y el sello "ya opera" |
| 6. Lo que viene | Y esto no se detiene. Muy pronto llega Pista Rides, una app para pedir viajes. ¿Qué más trae? Pronto lo sabrás. | Chispa gira, se agarra del círculo y señala un teléfono con Pista Rides; signos de pregunta |
| 7. Cierre | Así que ya sabes, no somos solo una tienda, somos Electro Shop. ¡Gracias por verlo! Escríbenos y hablamos. | "No solo una tienda", el logo de Electro Shop y el botón Escríbenos, que se vuelve el WhatsApp |

Las dos tomas de voz: `chispa-ficha-original` (todo el guion) y `chispa-ficha-vendemos` (el bloque 2, regrabado con Energía). `herramientas/voz.py` las une.
