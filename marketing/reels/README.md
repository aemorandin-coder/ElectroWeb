# Reels de ElectroShop

Reels verticales (1080×1920, 30 fps) animados con GSAP y grabados cuadro a cuadro con Chromium + ffmpeg.
No dependen de ningún servicio de pago. Cada reel es una página HTML con una línea de tiempo; `render.mjs` la recorre y arma el MP4.

| Reel | Archivo | Duración | Estado |
|---|---|---|---|
| "El pana que sabe de tecnología" (referidos y Puntos ES) | `referidos.html` | 27 s | Subido a Instagram (02/10) |
| "¿Y si es estafa?" (confianza: empresa real, Pago Móvil, pedido, garantía, WhatsApp) | `sin-miedo.src.html` → `sin-miedo.html` | 30,6 s | v3 entregada (02/10) |
| Taller (14 años, con ingeniero) | `taller.src.html` → `taller.html` | — | v2 entregada |
| L2 Control (Abby Kingdom y pantallas reales) | `l2control.src.html` → `l2control.html` | 45 s | v1 entregada |
| "La ficha de Electro Shop" (Chispa con voz: vendemos, reparamos, desarrollamos y Pista Rides) | `ficha.src.html` → `ficha.html` | 89 s | v2 entregada (09/10): Vendemos con Energía y tiempos de la transcripción |

## El cierre de la serie (aprobado por Andrés el 02/10)

`cierre.png` y `cierre.mp4` son el cierre de "¿Y si es estafa?" (desde el segundo 26). Andrés lo eligió como cierre de la serie: los reels nuevos terminan igual.

- Logo en píldora blanca, frase de 2 líneas con la palabra clave en recuadro blanco inclinado ("Compra tecnología **sin miedo**").
- Píldoras: electroshopve.com · WhatsApp +58 257 251 1282 · Guanare, Portuguesa · Envíos a toda Venezuela.
- Tarjeta blanca "Envíos por" con los logos de ZOOM y MRW.
- Letra pequeña: "Electro Shop Morandin C.A. · RIF J-40590333-3" y el aviso de marcas de sus dueños.
- En el código: el bloque `<div id="end">` de `sin-miedo.src.html` y la sección `// ===== 8. Cierre` de su línea de tiempo. Para un reel nuevo se copia y solo cambia la frase.

## Estilo de la serie

Sale del reel de Vale: fondo oscuro con cuadrícula para el problema y paso al azul (`#bgBlue`, franjas diagonales) para la solución,
píldora blanca arriba (`.cap`), iPhone al centro (`#phoneWrap`), etiquetas inclinadas (`.stk`). Fuentes: Poppins en textos grandes, Inter dentro del teléfono.
Las pantallas de la web se reconstruyen con los textos reales del código (`components/checkout/CheckoutPagoMovilForm.tsx`, `lib/order-pasos.ts`, `lib/warranty.ts`, `components/Footer.tsx`).

Reglas: "Puntos ES", nunca "saldo"; montos con el formato de `formatUSD` ("$13,31 Puntos ES"); nada de cuentas reales de terceros (el vendedor estafador es inventado).

## Chispa y la voz ("La ficha")

- Chispa es la mascota (`assets/mascota/chispa.js`, hoja de poses en `assets/mascota/hoja.html`). El círculo azul va en una capa fija (`#disc`) y Chispa se dibuja con `fondo: false` para que el giro no lo mueva.
- La voz la generó Andrés en ElevenLabs: `assets/voz/chispa-ficha-original.mp3` (todo el guion) y `chispa-ficha-vendemos.mp3` (el bloque "Vendemos" con Energía, grabado aparte).
- Los tiempos de cada palabra salen de la transcripción de ElevenLabs (Speech to Text, exportada en JSON): `*.scribe.json`. Nada de cálculos: así cada subtítulo y cada tarjeta caen en su palabra.
- `python3 voz.py` arma `chispa-ficha.mp3` (pausas entre ideas, 93 % de velocidad, -14 LUFS) y `chispa-ficha.json` (palabras, bloques y volumen por cuadro para la boca). Si se regraba un trozo: se transcribe igual en ElevenLabs y se apunta en `voz.py`.
- `armar.py` mete el JSON en la página (`/*VOZ*/`) y `sonido-ficha.py` usa las mismas palabras para los efectos, así que si cambia la voz todo se mueve solo.
- Pista Rides: solo el logo oficial (`assets/simbolo-negro.svg`, `assets/logo-claro.svg`), el amarillo de la marca, "una app para pedir viajes" y pistarides.com. Nada más hasta el lanzamiento.

Armar "La ficha" completa:

```bash
python3 voz.py && python3 armar.py ficha && python3 sonido-ficha.py
PAGE=ficha.html node render.mjs video mudo.mp4
ffmpeg -i mudo.mp4 -i assets/voz/chispa-ficha.mp3 -i sonido-ficha.wav -filter_complex "[1:a][2:a]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart reel.mp4
```

## Fotos y precios

- `assets/p-teclado.png`: foto del producto en `public/uploads/products`.
- `assets/p-tablet.png` y `assets/p-gta.png`: recortes de capturas reales de la web (reel de Vale), con sus precios: W&O X17 Ultra $190,00 / Bs. 163.433,31; GTA V PS5 $40,00 / Bs. 34.407,01 (caja abierta); teclado AOAS M-880 $28,00 / Bs. 24.084,91.
- Este entorno de Claude no tiene acceso a electroshopve.com. Para sacar fotos y precios al día hay que agregar el dominio en la red del entorno, o pasar capturas.

## Cómo generar un reel

```bash
cd marketing/reels
npm install                       # playwright-core (usa el Chromium del sistema)
python3 armar.py                  # sin-miedo.src.html -> sin-miedo.html
PAGE=sin-miedo.html node render.mjs preview cuadros "" "1,5,12,29.6"   # cuadros sueltos para revisar
PAGE=sin-miedo.html node render.mjs video mudo.mp4                      # video sin sonido (~5 min)
python3 sonido-sin-miedo.py                                             # efectos sintetizados (sin derechos)
ffmpeg -i mudo.mp4 -i sonido-sin-miedo.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart reel.mp4
```

El sonido son efectos sintetizados (pops, ding, monedas, golpes); la música se agrega en Instagram.

Licencias: GSAP (`assets/gsap.min.js`, licencia estándar de GSAP), Poppins (SIL OFL), Inter (SIL OFL). ZOOM, MRW, Instagram, WhatsApp, Binance Pay y PayPal son marcas de sus dueños.
