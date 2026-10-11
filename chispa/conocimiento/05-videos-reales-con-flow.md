# 5. Videos reales con Google Flow (Andrés + Chispa)

Andrés graba escenas de video con **Google Flow** (modelo Omni Flash): él real, en su escritorio, y Chispa en dibujo 2D asomado detrás del monitor. Flow hace la imagen; aquí se arregla la voz de Chispa, se ponen los textos y se arma el reel. El ejemplo completo es "El nuevo del equipo" (guion: `guiones/guion-andres-chispa.md`; receta: `herramientas/montaje-andres-chispa.sh`).

## Límites de Flow
- **Máximo 10 s por escena.** Un reel de 30 s son 3 escenas, y unas 20 palabras de diálogo caben con calma en cada una.
- **Flow escribe mal las letras.** Nada de texto en el prompt ("no on-screen text, no subtitles, no music"). El logo, la web y el WhatsApp se ponen después, en la capa.
- **Flow le inventa una voz distinta a Chispa en cada escena.** Se reemplaza por la voz Diego (ver abajo).
- Los clips salen a 24 fps y 1080 x 1920. El reel completo se arma a 24 fps.

## Antes de generar
1. **Frame inicial:** la foto de Andrés en su escritorio, derecha y en 9:16. Si hace falta que Chispa ya esté en cuadro, la misma foto con Chispa compuesto detrás del monitor. **Estas fotos de Andrés no se suben al repositorio** (es público); él las tiene.
2. **Ingredientes:** las imágenes de Chispa con fondo transparente de `mascota/referencias-flow/` (frente, saluda, señala, pulgar, espalda y la hoja de referencia). Así Flow no lo redibuja distinto.
3. **El prompt, en inglés** (Flow lo entiende mejor), con los diálogos en español venezolano entre comillas. La plantilla:

> Vertical 9:16 live-action video with a 2D cartoon character composited in, mixed-media style. [Andrés: aspecto, ropa, escritorio, oficina]. He smiles, looks at the camera and says in Venezuelan Spanish, warm and confident: "...". From behind the monitor, a flat 2D cartoon mascot pops up from the waist up: thick black ink outlines, flat colors, spiky black hair, cream skin, big black oval eyes with white highlights, rosy cheeks, navy shirt with a blue V collar and a small white badge with blue letters "ES". The mascot stays 2D, never 3D, and his lower body stays hidden behind the monitor. He [acción] and says in an energetic young cartoon voice, Venezuelan Spanish: "...". Natural office light, handheld camera, no on-screen text, no subtitles, no music.

Los prompts exactos de cada escena están en el guion.

## Consejos que funcionaron
- Si Chispa sale en 3D o cambia de cara: regenerar y repetir "flat 2D cartoon, thick black outlines, stays 2D".
- Si le salen piernas o sale de detrás del monitor: "his lower body stays hidden behind the monitor at all times".
- 2 o 3 versiones por escena y quedarse con la mejor antes de extender a la siguiente.
- **No se pegan dos clips seguidos sin contexto.** Andrés lo notó: "es muy agresivo los dos videos de una". Entre clips va una escena animada que explique (ver la estructura).

## La estructura que aprobó Andrés (v4, 55 s)
1. **Entrada animada (17 s):** Chispa entra solo y se presenta: qué hacemos, con tarjetas y las marcas de software (`videos/chispa-entrada.src.html`, voz `chispa-puente`). Termina con un destello blanco que empata con el corte.
2. **Clip real 1 (10 s):** Andrés presenta "al nuevo del equipo" y Chispa saluda.
3. **Escena del medio animada (13 s):** sirve de puente para que el corte entre los dos clips no se note forzado. Chispa anuncia los Cursos y el teléfono muestra la sección de Cursos de la web (`videos/chispa-medio.src.html`, voz `chispa-medio`). Otra idea que dio Andrés para el medio: "Domingo de web".
4. **Clip real 2 (10 s):** Andrés da la web y Chispa el WhatsApp, chocan los puños.
5. **El cierre de la serie** (`assets/cierre.mp4`, con `-ss 0.2`).

## Reemplazar la voz de Chispa
1. **Encontrar quién habla y cuándo:**
   ```bash
   python3 herramientas/quien-habla.py clips/e1.mp4 clips/e2.mp4
   ```
   Da el tono cada 0,1 s. Andrés va de 120 a 190 Hz y Chispa de 270 a 360 Hz. Se anotan los tramos de Chispa (por ejemplo, 4,35 a 6,40 s y 6,60 a 7,75 s). Para confirmar los silencios: `ffmpeg -i clip.mp4 -af silencedetect=noise=-35dB:d=0.2 -f null -`.
2. **Pedirle a Andrés las frases en ElevenLabs** (voz Diego), una por tramo, con la duración que debe tener cada una.
3. **Montar el audio de cada clip** (primer bloque de `montaje-andres-chispa.sh`):
   - `volume=enable='between(t,A,B)':volume=0` calla la voz de Flow **solo** en los tramos de Chispa. La voz de Andrés, su risa y el choque de puños quedan intactos.
   - Un trozo sin voz del mismo clip (`atrim`, en bucle con `aloop`) rellena esos tramos con el ruido del cuarto, para que no quede un hueco en silencio.
   - Cada frase nueva se recorta (`atrim`), se ajusta hasta un 15 % para que calce con la boca (`atempo=0.88` a `1.0`), se sube (`volume=6dB`) y se pone en su segundo con `adelay=4450|4450` (en milisegundos).
   - Se mezcla todo con `amix=...:normalize=0`.
4. Después se mide con `silencedetect` dónde cayó cada frase: debe quedar a menos de una décima de donde Chispa movía la boca.

## Los textos encima del video real
Una página transparente (`videos/andres-chispa-capa.html`): el logo arriba, "El nuevo del *equipo*", la etiqueta "Chispa · El nuevo de Electro Shop", "electroshopve.com" cuando Andrés lo dice y el WhatsApp cuando Chispa lo nombra. Los textos van sobre el escritorio, **nunca sobre las caras**.
```bash
node herramientas/capa.mjs videos/andres-chispa-capa.html salida/capa 24     # PNG con transparencia, 24 por segundo
```
La capa dura lo mismo que los dos clips juntos (20 s). En el montaje se parte en 9,963 s, el largo del clip 1: la primera mitad va sobre e1 y la segunda sobre e2 (`trim` + `overlay`).

## Armar todo
```bash
python3 herramientas/armar.py chispa-entrada chispa-medio
PAGE=videos/chispa-entrada.html node herramientas/render.mjs video salida/entrada_mudo.mp4
PAGE=videos/chispa-medio.html node herramientas/render.mjs video salida/medio_mudo.mp4
node herramientas/capa.mjs videos/andres-chispa-capa.html salida/capa 24
python3 herramientas/sonido-andres-chispa.py
sh herramientas/montaje-andres-chispa.sh          # -> salida/andres-chispa.mp4 (54,5 s)
```
Probado el 11/10 con los clips originales: sale idéntico al v4 publicado. Los clips van en `clips/e1.mp4` y `clips/e2.mp4`, que no se suben.

## Para un video nuevo con Flow
1. Guion con escenas de 10 s y lo que se ve en cada una (copiar la estructura de `guiones/guion-andres-chispa.md`).
2. Andrés genera las escenas. Se revisan los clips y se buscan los tramos de Chispa.
3. Textos para ElevenLabs: frases de los clips y voces de las escenas animadas.
4. Escenas animadas (copiar `chispa-entrada` o `chispa-medio`), capa de textos (copiar `andres-chispa-capa.html`) y efectos.
5. Copiar `montaje-andres-chispa.sh`, cambiar tramos, tiempos y duraciones y armar.
6. Revisar la tira de cuadros, sobre todo en los cortes. Cuidar lo que se dice contra lo que se ve, y que no se cuelen cuadros raros.
7. Portada (`piezas/portada-andres-chispa.html` como ejemplo).
