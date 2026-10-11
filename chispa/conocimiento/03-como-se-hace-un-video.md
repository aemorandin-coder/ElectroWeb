# 3. Cómo se hace un video, de principio a fin

Un video es **una página HTML con una línea de tiempo**. `herramientas/render.mjs` la abre en Chromium, la lleva a cada cuadro (30 por segundo), le saca una foto y se la pasa a ffmpeg. No hay servicios de pago ni editores: todo es código, así que se puede repetir y corregir al segundo exacto.

## Lo que hace falta
- Node 18 o más, Python 3, ffmpeg y Chromium. En el entorno de Claude, Chromium ya está en `/opt/pw-browsers/`; en otra máquina se pasa `CHROME=/ruta/al/chrome` (o se instala Chrome y `render.mjs` usa el de playwright).
- `npm install` dentro de `chispa/` (instala `playwright-core`).
- `numpy` solo para `herramientas/quien-habla.py`.
- **Todo se corre desde `chispa/`.** Los scripts de Python se niegan a correr desde otra carpeta.

## El contrato de una página
Cada `videos/*.src.html` expone cuatro cosas:
```js
window.DURATION = 17;               // segundos
window.seek = t => { /* deja la página exactamente como se ve en el segundo t */ };
window.ready = document.fonts.ready.then(() => { window.seek(0); return true; });  // espera fuentes e imágenes
window.settle = async () => {};     // opcional: si seek() cambia imágenes, espera a que carguen
```
- **`seek(t)` tiene que ser determinista**: el mismo `t` da siempre el mismo cuadro, vaya hacia adelante o hacia atrás. No uses `setTimeout`, `tl.call` de GSAP ni nada que dependa del orden en que se vio. Si un texto cambia, se pone dentro de `seek()`.
- Tamaño: 540 x 960 a escala 2 (sale 1080 x 1920). YouTube: 960 x 540 (sale 1920 x 1080).
- Las rutas son relativas a `videos/`: `../assets/...`, `../mascota/chispa.js`, `../clips/...`.
- Se puede animar con GSAP (`../assets/gsap.min.js`, con `tl.seek(t)` en pausa) o a mano con funciones de `t` (como `chispa-entrada.src.html`). Para Chispa, a mano.
- Los ids no se repiten (una vez un `#l2` repetido escondió una tarjeta).

## Los marcadores que llena `armar.py`
`python3 herramientas/armar.py <nombre>` lee `videos/<nombre>.src.html` y escribe `videos/<nombre>.html` reemplazando:
- `/*BASE*/` por `herramientas/base.css` (colores, fuentes, píldora, teléfono, etiquetas, subtítulos).
- `/*ICONS*/` por `herramientas/icons.js` (íconos de línea: `<i data-ic="truck"></i>`).
- `/*VOZ:nombre*/` por `assets/voz/nombre.json` (la voz con sus tiempos). Los viejos `/*VOZ*/`, `/*VOZ_PUENTE*/` y `/*VOZ_MEDIO*/` siguen funcionando.
- `/*COMANDA*/` y `/*RECIBO*/` por los tickets de L2 Control.

**Se edita siempre el `.src.html`** y se vuelve a armar. El `.html` armado se sube también, para que se pueda abrir directo en el navegador.

## Paso a paso de un reel nuevo
1. **Guion.** Frases cortas, con lo que se ve en cada una. Se guarda en `guiones/`. Se le pasa a Andrés el texto para la voz.
2. **Voz.** Andrés genera la voz en ElevenLabs y su transcripción en JSON. Se convierte con `puente-voz.py` (ver `04-voz-con-elevenlabs.md`). Mientras llega, `puente-voz.py` sin argumentos da tiempos de prueba para ir armando.
3. **Página.** Se copia la más parecida (`chispa-entrada.src.html` para Chispa hablando con tarjetas; `sin-miedo.src.html` para teléfono y web) y se cambian textos y claves. **Todo tiempo se ata a una palabra**: `W('vendemos') - .1`.
4. **Armar y revisar cuadros sueltos:**
   ```bash
   python3 herramientas/armar.py mi-video
   PAGE=videos/mi-video.html node herramientas/render.mjs preview salida/cuadros "" "0.5,3,6.2,9,12"
   ```
   Se miran las fotos: lo que dice contra lo que se ve, los subtítulos y que nada se tape.
5. **Grabar** (unos 5 minutos por cada 30 s):
   ```bash
   PAGE=videos/mi-video.html node herramientas/render.mjs video salida/mudo.mp4
   ```
6. **Efectos.** Un `sonido-*.py` sintetiza pops, whooshes y dings atados a las mismas palabras de la voz (sin derechos de autor). Se copia el más parecido.
7. **Unir voz, efectos y cierre:**
   ```bash
   ffmpeg -i salida/mudo.mp4 -i assets/voz/mi-voz.mp3 -i salida/sonido.wav -filter_complex \
     "[1:a][2:a]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[a]" \
     -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart salida/reel.mp4
   ```
   El cierre de la serie se pega con `concat`. Va con `-ss 0.2` sobre `assets/cierre.mp4`, porque sus primeros cuadros traen restos del teléfono. Se normaliza todo a -14 LUFS (`loudnorm=I=-14:TP=-1.5:LRA=11`), que es lo que usa Instagram. Receta completa: `herramientas/montaje-andres-chispa.sh`.
8. **Portada** de una vez (`06-piezas-y-medidas.md`) y, si se pide, la descripción de Instagram.
9. **Revisión final** con una tira de cuadros:
   ```bash
   for t in 1 5 9 13 17; do ffmpeg -y -v error -ss $t -i salida/reel.mp4 -frames:v 1 -vf scale=240:-1 salida/f$t.png; done
   ffmpeg -y -v error -i salida/f1.png -i salida/f5.png -i salida/f9.png -i salida/f13.png -i salida/f17.png -filter_complex hstack=5 salida/tira.png
   ```

## Videos con clips reales (taller, L2 Control)
Los videos `taller` y `l2control` muestran clips grabados. Los clips no se suben (Andrés los tiene). Para volver a grabarlos:
1. Copiar los `.mp4` en `chispa/clips/`.
2. Correr `sh herramientas/cuadros.sh`: saca `clips/<nombre>/0001.jpg ...`.
3. La página cambia el `src` de una `<img>` en `seek()` y espera en `window.settle()`.

## Lo que salió mal antes (y cómo se arregló)
- **Tiempos calculados a ojo**: subtítulos y tarjetas desfasados en los segundos 16 a 22 de "La ficha". Se pasó a la transcripción de ElevenLabs. Nunca más tiempos inventados.
- **El texto de la toma no era el del guion**: la voz dijo "energía UPS e inversores, y los instalamos". Se lee la transcripción y se adapta la línea de tiempo a lo que **realmente** dijo.
- **Un sello encima de los subtítulos**: los subtítulos mandan; el sello se fue a la esquina de la tarjeta.
- **Scroll más allá del final de una captura de la web**: se ve el vacío. Mejor un zoom lento.
- **Pantalla colada en el segundo 50**: primeros cuadros de `cierre.mp4`. Se arregló con `-ss 0.2`.
- **Teléfono mostrando productos mientras Chispa hablaba de cursos**: se armó una maqueta de la sección Cursos. Lo que se dice, se ve.
