# 2. Chispa, el personaje

Chispa es la mascota de Electro Shop: un muchacho en dibujo 2D de tinta, con colores planos y el pelo negro en puntas. Tiene piel crema, ojos grandes negros con brillo y cachetes rosados. Lleva camisa azul marino con cuello en V azul y una placa blanca con "ES" en letras azules. Va siempre de la cintura para arriba, delante de un círculo azul de marca.

Todo está en `mascota/chispa.js` (versión 2.0, del 10/10): un SVG armado como muñeco articulado. La hoja de poses está en `mascota/hoja.html` (foto: `mascota/chispa-poses.png`).

## Lo que Andrés corrigió (no repetir)
- **Sin franja azul en la muñeca.** "Rompe las manos". Las manos salen directo de la manga.
- **Los puños tienen pulgar.** Un puño sin pulgar se ve como un muñón.
- **"Celebra" son los dos pulgares arriba a la altura del pecho**, no por encima de la cabeza ("no se los hagas tan altos").
- **Sin piernas.** Siempre de la cintura para arriba, o detrás de algo (un monitor, la barra de la web).
- **El círculo azul no gira.** Va en su propia capa fija (`#disc`) y Chispa se dibuja con `fondo: false`. Así un giro o un rebote de Chispa no mueve el círculo.
- **Las manos se agarran del borde** cuando se asoma (no flotan).
- **De espalda, la mano es un puño visto por detrás** (nudillos) o el índice con la uña. Nunca una palma de frente vista de espalda.
- Se mantiene el estilo: tinta gruesa, colores planos, nada de 3D, nada de degradados en el personaje.

## Cómo se usa
```js
// en la página: <script src="../mascota/chispa.js"></script>
el.innerHTML = chispa({ pose: 'saluda', boca: 'sonrisa', ojos: 'feliz', cejas: 'normal', fondo: false });
```
- **Poses (de frente):** `habla`, `señala` (índice arriba a su izquierda), `explica` (dos palmas abiertas), `pulgar`, `brazos` (cruzados), `hombros` ("¿y entonces?"), `saluda`, `celebra` (dos pulgares al pecho) y `piensa` (puño bajo la barbilla).
- **Poses de espalda:** `espalda`, `espalda-señala`, `espalda-señala-alto`, `espalda-dos` y `espalda-libre` (brazos a mano con `window.CHISPA_L` y `window.CHISPA_R`).
- **Ojos:** `abiertos`, `cerrados`, `sorpresa`, `guino`, `feliz`.
- **Cejas:** `normal`, `arriba`, `duda`, `enojo`.
- **Bocas:** `sonrisa`, `seria` y las vocales `a`, `e`, `i`, `o`, `u`.
- Cada pose inclina un poco la cabeza (`INC_POSE`) para que no se vea rígido.

## Animarlo (lo que usan los videos)
Todo es numérico, así que se interpola suave. El patrón de `videos/chispa-entrada.src.html`:
```js
const W = (w, n = 0) => VOZ.palabras.filter(p => norm(p.w) === norm(w))[n].t0;  // cuándo dice la palabra (n: qué aparición)
const linea = chispa.linea([
  { t: 0, pose: 'saluda', ojos: 'feliz', feliz: true },
  { t: W('vendemos') - .1, pose: 'explica', mirar: [.4, -1] },
  { t: W('todo') - .1, pose: 'celebra', ojos: 'feliz', feliz: true },
  { t: W('jefe') - .25, pose: 'pulgar', ojos: 'guino', feliz: true },
]);
const labios = chispa.labios(VOZ);
window.seek = t => {
  const e = linea(t);                                         // pose, ojos, cejas, mirada en el segundo t
  const p = VOZ.palabras.find(q => t >= q.t0 - .03 && t < q.t1 + .05);
  if (p) Object.assign(e.boca, labios(t));                    // boca según la vocal y el volumen
  chispa.vida(e, t, { rms: p ? VOZ.rms[Math.floor(t * 30)] : null });  // parpadeo, respiración, cabeza, pelo
  e.fondo = false;
  $('#chispa').innerHTML = chispa.rig(e);
};
```
- `chispa.linea(claves)`: cada clave cambia solo lo que trae (`pose`, `vista`, `ojos`, `cejas`, `boca`, `mirar: [mx, my]`, `inc`, `feliz`). La transición es suave y con un pequeño rebote. **Las claves se ponen en la palabra** (`W('palabra') - .1`), nunca en segundos a ojo.
- `chispa.labios(voz)`: boca por vocal de la palabra que suena, abierta según el volumen de ese cuadro (`rms`).
- `chispa.vida(e, t, {rms})`: parpadeo, respiración, la cabeza acompaña al habla y el pelo se queda un poco atrás.
- Para saludar con la mano, se mueve `e.R.giro` y `e.R.muñeca` con un seno (ver la entrada).
- **Agarrar cosas** (lo usan los stickers, `piezas/sticker.html`):
  - `e.R.objeto = '<svg...>'`: lo que agarra la mano (una llave, una lupa). Va en coordenadas de la mano (muñeca en 0,0 y dedos hacia -y) y se dibuja debajo de los dedos, así se ve agarrado. `chispa.anguloMano(e.R)` da el ángulo de la mano, para apuntar el objeto a un punto de la cara o de un aparato.
  - `e.L.espejo = true`: la mano al revés, con el pulgar del otro lado. Para la mano izquierda de frente (un pulgar arriba con la izquierda).
  - `e.entre = '<svg...>'`: un aparato entre los dos brazos. Con `e.orden = 'LR'` el brazo izquierdo queda detrás del aparato y el derecho por delante; con `'RL'`, al revés.
- Se puede ver en movimiento con `videos/chispa-demo.src.html` y el giro de frente a espalda con `videos/chispa-giro.html`.

## Chispa en Google Flow
Para los videos reales, Flow necesita ver a Chispa. Las imágenes con fondo transparente están en `mascota/referencias-flow/`: frente, saluda, señala, pulgar, espalda y la hoja de referencia. Se sacan de nuevo con:
```bash
node herramientas/captura.mjs mascota/hoja.html salida/hoja.png 1600 900 2
```
Cómo se escriben los prompts para que no lo redibuje distinto: ver `05-videos-reales-con-flow.md`.

## Chispa en la tienda web
Andrés aprobó (09/10) que Chispa se asome en la esquina de la tienda, salude y ofrezca "Buscar" o "WhatsApp" (tarea C-176), pero pidió dejarlo como plan, sin código. Es trabajo de la web (`components/`, `lib/`), no de esta carpeta, y lo hace Claude con las reglas de `CLAUDE.md`.
