# Chispa: el estudio de video de Electro Shop

Aquí vive todo lo que hace falta para crear los videos animados de Electro Shop con **Chispa**, la mascota: el personaje, el motor que graba las animaciones cuadro a cuadro, las voces, los sonidos, las piezas para redes y el manual para cualquier agente (Antigravity, Claude u otro).

> **Si eres un agente y vas a hacer un video, lee primero [`conocimiento/`](./conocimiento/) en orden.** Ahí están las reglas de Andrés (el dueño), cómo se arma un video de principio a fin y los errores que ya se cometieron y no se deben repetir.

No hay videos guardados aquí (Andrés los tiene respaldados). La única excepción es `assets/cierre.mp4`, el cierre aprobado de la serie, que se pega al final de cada reel.

## Qué hay en cada carpeta

| Carpeta | Qué tiene |
|---|---|
| [`conocimiento/`](./conocimiento/) | El manual, en orden: [1. reglas de marca](./conocimiento/01-reglas-de-marca.md), [2. Chispa](./conocimiento/02-chispa-el-personaje.md), [3. cómo se hace un video](./conocimiento/03-como-se-hace-un-video.md), [4. voz con ElevenLabs](./conocimiento/04-voz-con-elevenlabs.md), [5. videos reales con Google Flow](./conocimiento/05-videos-reales-con-flow.md), [6. piezas y medidas](./conocimiento/06-piezas-y-medidas.md) y [7. historial](./conocimiento/07-historial.md). |
| `mascota/` | `chispa.js` (el personaje), `hoja.html` (hoja de poses), `chispa-poses.png` y `referencias-flow/` (Chispa en PNG transparente para Google Flow). |
| `videos/` | Una página por video. `*.src.html` es la fuente que se edita; `*.html` es la versión armada que se graba. |
| `piezas/` | Banner de YouTube, miniatura de YouTube, portada de reel y portadas de historias destacadas. |
| `guiones/` | Los guiones con sus textos (`la-ficha.md`) y los prompts de Google Flow (`guion-andres-chispa.md`). |
| `herramientas/` | `render.mjs` (graba), `armar.py` (arma las páginas), `captura.mjs` (fotos de piezas), `capa.mjs` (textos sobre video real), `voz.py` y `puente-voz.py` (voces), `sonido-*.py` (efectos), `quien-habla.py` (dónde habla Chispa en un clip de Flow), `montaje-andres-chispa.sh` (montaje con clips de Flow) y `cuadros.sh` (cuadros de clips). |
| `assets/` | Fuentes, logos, fotos, voces de Chispa (`voz/`: mp3 + transcripciones) y `cierre.mp4`. |
| `clips/`, `salida/` | No se suben. `clips/`: los videos reales (Flow, taller, L2) que pone Andrés. `salida/`: lo que se graba. |

## Inicio rápido

Todo se corre **desde esta carpeta (`chispa/`)**. Hace falta Node 18 o más, Python 3, ffmpeg y Chromium.

```bash
cd chispa
npm install                                           # playwright-core (usa el Chromium del sistema; CHROME=/ruta si está en otro lugar)
python3 herramientas/armar.py chispa-entrada          # videos/chispa-entrada.src.html -> videos/chispa-entrada.html
PAGE=videos/chispa-entrada.html node herramientas/render.mjs preview salida/cuadros "" "1,5,12"   # cuadros sueltos para revisar
PAGE=videos/chispa-entrada.html node herramientas/render.mjs video salida/mudo.mp4                # el video sin sonido
ffmpeg -i salida/mudo.mp4 -i assets/voz/chispa-puente.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest salida/reel.mp4
```

Para un video horizontal (YouTube): `VIEWPORT=960x540 PAGE=videos/ficha-yt.html node herramientas/render.mjs video salida/yt.mp4`.

Fotos de piezas (portadas, banner, destacadas): `node herramientas/captura.mjs piezas/banner-youtube.html salida/banner.png 2560 1440`.

## Los videos que hay

| Video | Archivo | Formato | Estado |
|---|---|---|---|
| "El pana que sabe de tecnología" (referidos y Puntos ES) | `videos/referidos.html` | Reel | Publicado |
| "¿Y si es estafa?" (confianza) | `videos/sin-miedo.src.html` | Reel | v3 aprobada; su final es el cierre de la serie |
| Taller (14 años, con ingeniero) | `videos/taller.src.html` | Reel | v2 (usa clips reales: ver `herramientas/cuadros.sh`) |
| L2 Control (Abby Kingdom) | `videos/l2control.src.html` | Reel | v1 (usa clips reales) |
| "La ficha de Electro Shop" (Chispa con voz) | `videos/ficha.src.html` | Reel | v2 |
| "La ficha" para YouTube | `videos/ficha-yt.src.html` + `piezas/miniatura-ficha.html` | 16:9 | Entregada |
| "El nuevo del equipo" (Andrés real en Google Flow + Chispa) | `videos/chispa-entrada.src.html`, `videos/chispa-medio.src.html`, `videos/andres-chispa-capa.html`, `herramientas/montaje-andres-chispa.sh`, `piezas/portada-andres-chispa.html` | Reel | v4 publicada |
| Demos de Chispa | `videos/chispa-demo.src.html`, `videos/chispa-giro.html` | Reel | Pruebas de movimiento |

El detalle de cada uno (qué pidió Andrés, qué se corrigió) está en [`conocimiento/07-historial.md`](./conocimiento/07-historial.md).
