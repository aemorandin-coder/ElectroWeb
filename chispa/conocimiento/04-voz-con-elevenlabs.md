# 4. La voz de Chispa con ElevenLabs

La voz de Chispa **siempre es la misma**: la voz **"Diego"** de ElevenLabs, la de "La ficha". Andrés la genera en su cuenta y pasa dos archivos: el audio (mp3) y la transcripción (JSON). **La clave de la API no se pega en el chat ni se guarda en el repositorio**; si un agente tiene que usar la API, la clave va como secreto del entorno (`ELEVENLABS_API_KEY`).

## Los ajustes
El nombre de archivo que da ElevenLabs trae los ajustes: `..._pvc_sp100_s50_sb75_v4.mp3`.
- `pvc`: voz profesional (Diego).
- `sp100`: velocidad 1,0.
- `s50`: estabilidad 50 %.
- `sb75`: similitud 75 %.
- `v4`: la versión del modelo con que se generó.

Se mantienen iguales en todas las tomas para que Chispa suene igual. El ritmo final se ajusta después (la ficha va a 93 % con `atempo=0.93`).

## Cómo escribir el texto para ElevenLabs
- Español venezolano, cercano: "¡Epa!", "ven, que te presento al jefe".
- **Electro Shop separado.** ElevenLabs lo transcribe "Electroshop", y los scripts lo corrigen en pantalla.
- Signos de apertura (¡ ¿) y puntos suspensivos donde se quiera una pausa.
- Frases cortas. Unas 20 palabras caben con calma en 10 s.
- Si una toma sale con un error, **no se recorta el guion: se pide otra toma** de ese trozo (Andrés: "nunca te limites en eso"). Así se hizo el bloque "Vendemos" de la ficha (`chispa-ficha-vendemos.mp3`).

## La transcripción (lo más importante)
Se pasa el mp3 por **Speech to Text** de ElevenLabs y se exporta en **JSON**. Ese archivo da el segundo exacto en que empieza y termina cada palabra:
```json
{ "language_code": "es", "segments": [ { "words": [ { "text": "¡Epa!", "start_time": 0.12, "end_time": 0.48 }, ... ] } ] }
```
Se guarda junto al mp3 como `assets/voz/<nombre>.scribe.json`. **De aquí salen todos los tiempos**: subtítulos, poses de Chispa, tarjetas y efectos. Nunca se calculan.

## De la transcripción al video: `puente-voz.py`
Para una frase nueva:
```bash
NOMBRE=chispa-cursos TEXTO="¡Y prepárate! ..." python3 herramientas/puente-voz.py ~/Descargas/voz.mp3 ~/Descargas/voz.json
```
Esto deja:
- `assets/voz/chispa-cursos.mp3`: la voz con las pausas largas recortadas (más de 0,6 s quedan en 0,45 s, con las palabras corridas).
- `assets/voz/chispa-cursos.json`, con `{ duracion, palabras: [{w, t0, t1, b}], bloques, rms }`:
  - `w`: la palabra como se escribe en pantalla;
  - `t0` y `t1`: cuándo empieza y termina;
  - `b`: el bloque del guion;
  - `rms`: el volumen de cada cuadro (30 fps), que mueve la boca.

En la página va `/*VOZ:chispa-cursos*/` y `armar.py` lo mete. Sin argumentos, `puente-voz.py` da tiempos de prueba repartidos sobre `TEXTO`, para ir armando la animación mientras llega la voz.

Si la frase es para "La ficha" (varias tomas unidas), se usa `voz.py`. Arma la ficha con la toma original más la de "Vendemos": inserta pausas entre ideas, baja la velocidad a 93 % y normaliza a -14 LUFS. Ahí se apuntan las tomas nuevas.

## Lo que la transcripción escribe distinto (y cómo se corrige)
Los dos scripts tienen una tabla (`TEXTO` en `voz.py`, `VER` en `puente-voz.py`) de "lo que escribió" a "cómo va en pantalla":

| Transcribe | En pantalla |
|---|---|
| Electroshop | Electro Shop (dos palabras, el tiempo se reparte) |
| Abbey | Abby (Abby Kingdom) |
| SUM | ZOOM (la empresa de envíos) |
| Morandín, | Morandin: |
| Todo / nosotros. | ¡Todo / nosotros! |
| pago móvil | Pago Móvil |
| [risa], [música] | `puente-voz.py` las descarta (todo lo que empieza con `[`) |

Otros detalles:
- **Palabras cortas demasiado largas:** a veces la transcripción mete la pausa dentro de la palabra ("¿Eres" de casi 1 s). `puente-voz.py` corre el inicio para que el subtítulo no aparezca antes de tiempo.
- **Revisar siempre la lista que imprime el script** (`palabra@segundo`) contra el audio. Si algo no cuadra, se corrige la tabla y se vuelve a correr; no se toca el JSON a mano.
- Si falta un signo en pantalla (por ejemplo "Podrás ... nosotros!" sin "¡"), se agrega en la tabla.

## Las voces que hay
| Archivo | Qué dice | Dónde se usa |
|---|---|---|
| `chispa-ficha.mp3/.json` | La ficha completa (86 s) | `ficha`, `ficha-yt` |
| `chispa-ficha-original` y `chispa-ficha-vendemos` (mp3 + scribe) | Las dos tomas de la ficha | entrada de `voz.py` |
| `chispa-puente.mp3/.json` | "¡Epa! ¿Ya sabes qué hacemos en Electro Shop? ... te presento al jefe." | `chispa-entrada` |
| `chispa-medio.mp3/.json` | "¡Y prepárate! Muy pronto vas a tener cursos ... Postúlate como creador." | `chispa-medio` |
| `chispa-flow.mp3` | Las cuatro frases que reemplazan la voz que Flow le puso a Chispa: "¡Epa, Venezuela!", "¡Soy Chispa!", "¡O escríbenos por WhatsApp!" y "¡Te esperamos!" | `montaje-andres-chispa.sh` |
